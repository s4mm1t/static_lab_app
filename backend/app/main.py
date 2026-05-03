from __future__ import annotations

from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from typing import Annotated, Any, Literal
from uuid import uuid4

import jwt
import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg import errors
from psycopg.rows import dict_row
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.trustedhost import TrustedHostMiddleware


ActivityLevel = Literal["light", "balanced", "active"]
MealType = Literal["Breakfast", "Lunch", "Dinner"]
MealSlot = Literal["breakfast", "lunch", "dinner", "snack"]
CalendarEventType = Literal["meal", "training", "task", "note"]
CalendarEventStatus = Literal["planned", "done", "skipped"]

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://trackfoodai:trackfoodai@localhost:5432/trackfoodai",
)
PLANNER_DATABASE_URL = os.getenv("PLANNER_DATABASE_URL", DATABASE_URL)
EXTERNAL_PRODUCTS_SQLITE = os.getenv("EXTERNAL_PRODUCTS_SQLITE", "")
EXTERNAL_PRODUCTS_LIMIT = int(os.getenv("EXTERNAL_PRODUCTS_LIMIT", "30000"))
EXTERNAL_PRODUCTS_REFRESH = os.getenv("EXTERNAL_PRODUCTS_REFRESH", "false").lower() == "true"
USE_MEMORY_STORAGE = DATABASE_URL.startswith("memory://")
USE_MEMORY_PLANNER = USE_MEMORY_STORAGE or PLANNER_DATABASE_URL.startswith("memory://")
SECRET_KEY = os.getenv("SECRET_KEY", "trackfoodai-local-dev-secret-change-me")
JWT_ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 24 * 14
MAX_BODY_BYTES = 48_000
MAX_REQUESTS_PER_MINUTE = 160
RATE_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
EMAIL_PATTERN = re.compile(r"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", re.I)
DANGEROUS_PATTERNS = [
    re.compile(r"<\s*script", re.I),
    re.compile(r"javascript\s*:", re.I),
    re.compile(r"on[a-z]+\s*=", re.I),
    re.compile(r"(\.\./|%2e%2e%2f)", re.I),
    re.compile(
        r"(--|/\*|\*/|;)\s*(drop|delete|insert|union|select|update|alter|truncate|exec)\b",
        re.I,
    ),
    re.compile(
        r"\b(drop|delete|insert|union|select|update|alter|truncate|exec)\b.+\b(from|where|table|users|into)\b",
        re.I,
    ),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def isoformat(value: Any) -> str:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    return str(value)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\x00", "")).strip()


def assert_clean(value: str) -> str:
    cleaned = normalize_text(value)
    if any(pattern.search(cleaned) for pattern in DANGEROUS_PATTERNS):
        raise ValueError("Input contains unsafe patterns")
    return cleaned


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        240_000,
    )
    return salt, digest.hex()


def verify_password(password: str, salt: str, stored_hash: str) -> bool:
    _, candidate_hash = hash_password(password, salt)
    return hmac.compare_digest(candidate_hash, stored_hash)


def first_image(value: str | None) -> str:
    if not value:
        return ""
    return value.split(",")[0].strip()


def clean_store(value: str | None) -> str:
    return normalize_text(value or "").replace("_", " ").title()


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    timestamp: str
    database: str
    products: int


class AppStatusResponse(BaseModel):
    name: str
    version: str
    environment: str
    docs_url: str
    storage: str
    products: int
    security: list[str]


class FoodItem(BaseModel):
    id: str
    name: str
    detail: str
    meal: MealType
    image: str
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    fiber_g: int
    color: str
    brand: str | None = None
    store: str | None = None
    barcode: str | None = None
    serving_label: str | None = None
    price: float | None = None
    currency: str | None = None
    source: str = "seed"


class NutritionEstimateRequest(BaseModel):
    description: str = Field(
        ...,
        min_length=2,
        max_length=240,
        examples=["Greek yogurt with berries"],
    )

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        return assert_clean(value)


class NutritionEstimateResponse(BaseModel):
    food_id: str
    label: str
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    fiber_g: int
    confidence: float
    note: str


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=8, max_length=72)
    calorie_goal: int = Field(1850, ge=1000, le=6000)
    activity_level: ActivityLevel = "balanced"

    @field_validator("name", "email")
    @classmethod
    def validate_text(cls, value: str) -> str:
        return assert_clean(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        email = value.lower()
        if not EMAIL_PATTERN.match(email):
            raise ValueError("Invalid email address")
        return email

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if any(pattern.search(value) for pattern in DANGEROUS_PATTERNS[:3]):
            raise ValueError("Password contains unsafe patterns")
        return value


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=8, max_length=72)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        email = assert_clean(value).lower()
        if not EMAIL_PATTERN.match(email):
            raise ValueError("Invalid email address")
        return email


class PublicProfile(BaseModel):
    id: str
    name: str
    email: str
    calorie_goal: int
    activity_level: ActivityLevel
    created_at: str


class AuthResponse(BaseModel):
    token: str
    profile: PublicProfile


class MealCreateRequest(BaseModel):
    food_id: str = Field(..., min_length=2, max_length=120)
    meal_slot: MealSlot = "breakfast"
    serving_multiplier: float = Field(1.0, ge=0.1, le=8.0)
    note: str = Field("", max_length=160)

    @field_validator("food_id", "note")
    @classmethod
    def validate_text(cls, value: str) -> str:
        return assert_clean(value)


class MealLogResponse(BaseModel):
    id: str
    food: FoodItem
    meal_slot: MealSlot
    serving_multiplier: float
    logged_at: str
    note: str
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    fiber_g: int


class CalendarEventCreateRequest(BaseModel):
    event_type: CalendarEventType = "task"
    title: str = Field(..., min_length=2, max_length=120)
    scheduled_date: date
    scheduled_time: str | None = Field(None, max_length=5)
    status: CalendarEventStatus = "planned"
    accent: str = Field("#4f86f7", max_length=20)
    linked_meal_id: str | None = Field(None, max_length=80)

    @field_validator("title", "accent", "linked_meal_id")
    @classmethod
    def validate_text(cls, value: str | None) -> str | None:
        return assert_clean(value) if value is not None else None

    @field_validator("scheduled_time")
    @classmethod
    def validate_time(cls, value: str | None) -> str | None:
        if value in (None, ""):
            return None
        if not re.match(r"^\d{2}:\d{2}$", value):
            raise ValueError("Use HH:MM time")
        return value


class CalendarEventUpdateRequest(BaseModel):
    event_type: CalendarEventType | None = None
    title: str | None = Field(None, min_length=2, max_length=120)
    scheduled_date: date | None = None
    scheduled_time: str | None = Field(None, max_length=5)
    status: CalendarEventStatus | None = None
    accent: str | None = Field(None, max_length=20)
    linked_meal_id: str | None = Field(None, max_length=80)

    @field_validator("title", "accent", "linked_meal_id")
    @classmethod
    def validate_text(cls, value: str | None) -> str | None:
        return assert_clean(value) if value is not None else None

    @field_validator("scheduled_time")
    @classmethod
    def validate_time(cls, value: str | None) -> str | None:
        if value in (None, ""):
            return None
        if not re.match(r"^\d{2}:\d{2}$", value):
            raise ValueError("Use HH:MM time")
        return value


class CalendarEventResponse(BaseModel):
    id: str
    user_id: str
    event_type: CalendarEventType
    title: str
    scheduled_date: str
    scheduled_time: str | None
    status: CalendarEventStatus
    accent: str
    linked_meal_id: str | None
    created_at: str
    updated_at: str


class ProfileStatsResponse(BaseModel):
    profile: PublicProfile
    calories_logged: int
    remaining_kcal: int
    protein_g: int
    carbs_g: int
    fat_g: int
    fiber_g: int
    meals: list[MealLogResponse]


SEED_FOODS = [
    FoodItem(
        id="chicken-bowl",
        name="Chicken rice bowl",
        detail="grilled chicken, jasmine rice, avocado, salsa",
        meal="Lunch",
        image="/meal-chicken-rice-bowl.jpg",
        calories=612,
        protein_g=48,
        carbs_g=68,
        fat_g=19,
        fiber_g=8,
        color="#2bb673",
        serving_label="1 bowl",
    ),
    FoodItem(
        id="yogurt-berries",
        name="Greek yogurt berries",
        detail="plain Greek yogurt, blueberries, raspberries, honey",
        meal="Breakfast",
        image="/meal-yogurt-berries.jpg",
        calories=238,
        protein_g=20,
        carbs_g=28,
        fat_g=4,
        fiber_g=5,
        color="#4f86f7",
        serving_label="1 bowl",
    ),
    FoodItem(
        id="salmon-avocado",
        name="Salmon avocado plate",
        detail="baked salmon, avocado, potatoes, cucumber",
        meal="Dinner",
        image="/meal-salmon-avocado.jpg",
        calories=540,
        protein_g=39,
        carbs_g=22,
        fat_g=31,
        fiber_g=9,
        color="#ff795e",
        serving_label="1 plate",
    ),
    FoodItem(
        id="oats-banana",
        name="Oatmeal banana almonds",
        detail="rolled oats, banana, almonds, milk",
        meal="Breakfast",
        image="/meal-oats-banana.jpg",
        calories=410,
        protein_g=13,
        carbs_g=62,
        fat_g=13,
        fiber_g=9,
        color="#d59b2d",
        serving_label="1 bowl",
    ),
    FoodItem(
        id="tofu-quinoa",
        name="Tofu quinoa greens",
        detail="firm tofu, quinoa, spinach, sesame dressing",
        meal="Dinner",
        image="/meal-tofu-quinoa.jpg",
        calories=476,
        protein_g=26,
        carbs_g=54,
        fat_g=18,
        fiber_g=11,
        color="#17a6a1",
        serving_label="1 plate",
    ),
]

MEMORY_FOODS: dict[str, FoodItem] = {}
MEMORY_USERS_BY_EMAIL: dict[str, dict[str, Any]] = {}
MEMORY_USERS_BY_ID: dict[str, dict[str, Any]] = {}
MEMORY_MEALS_BY_USER: dict[str, list[dict[str, Any]]] = defaultdict(list)
MEMORY_CALENDAR_BY_USER: dict[str, list[dict[str, Any]]] = defaultdict(list)


def connect() -> psycopg.Connection[Any]:
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def connect_planner() -> psycopg.Connection[Any]:
    return psycopg.connect(PLANNER_DATABASE_URL, row_factory=dict_row)


def food_columns_sql() -> str:
    return """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        detail TEXT NOT NULL,
        meal TEXT NOT NULL CHECK (meal IN ('Breakfast', 'Lunch', 'Dinner')),
        image TEXT NOT NULL,
        calories INTEGER NOT NULL CHECK (calories > 0),
        protein_g INTEGER NOT NULL CHECK (protein_g >= 0),
        carbs_g INTEGER NOT NULL CHECK (carbs_g >= 0),
        fat_g INTEGER NOT NULL CHECK (fat_g >= 0),
        fiber_g INTEGER NOT NULL CHECK (fiber_g >= 0),
        color TEXT NOT NULL,
        brand TEXT,
        store TEXT,
        barcode TEXT,
        serving_label TEXT,
        price NUMERIC(10, 2),
        currency TEXT,
        source TEXT NOT NULL DEFAULT 'seed',
        external_id TEXT,
        category_path TEXT,
        imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    """


def init_storage() -> None:
    if USE_MEMORY_STORAGE:
        MEMORY_FOODS.clear()
        MEMORY_FOODS.update({food.id: food for food in SEED_FOODS})
        MEMORY_USERS_BY_EMAIL.clear()
        MEMORY_USERS_BY_ID.clear()
        MEMORY_MEALS_BY_USER.clear()
        MEMORY_CALENDAR_BY_USER.clear()
        return

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    calorie_goal INTEGER NOT NULL CHECK (calorie_goal BETWEEN 1000 AND 6000),
                    activity_level TEXT NOT NULL CHECK (activity_level IN ('light', 'balanced', 'active')),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(f"CREATE TABLE IF NOT EXISTS foods ({food_columns_sql()})")
            for column in [
                "brand TEXT",
                "store TEXT",
                "barcode TEXT",
                "serving_label TEXT",
                "price NUMERIC(10, 2)",
                "currency TEXT",
                "source TEXT NOT NULL DEFAULT 'seed'",
                "external_id TEXT",
                "category_path TEXT",
                "imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
            ]:
                cur.execute(f"ALTER TABLE foods ADD COLUMN IF NOT EXISTS {column}")

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS meal_logs (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    food_id TEXT NOT NULL REFERENCES foods(id),
                    meal_slot TEXT NOT NULL DEFAULT 'breakfast'
                        CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
                    serving_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
                    note TEXT NOT NULL DEFAULT '',
                    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                ALTER TABLE meal_logs
                ADD COLUMN IF NOT EXISTS meal_slot TEXT NOT NULL DEFAULT 'breakfast'
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_foods_search ON foods USING gin (to_tsvector('simple', name || ' ' || COALESCE(brand, '') || ' ' || COALESCE(barcode, '')))"
            )
            cur.execute("CREATE INDEX IF NOT EXISTS idx_foods_source ON foods (source, store)")
            cur.execute(
                "CREATE INDEX IF NOT EXISTS meal_logs_user_logged_idx ON meal_logs (user_id, logged_at DESC)"
            )

            for food in SEED_FOODS:
                upsert_food(cur, food.model_dump() | {"external_id": food.id})

    import_external_products()


def init_planner_storage() -> None:
    if USE_MEMORY_PLANNER:
        MEMORY_CALENDAR_BY_USER.clear()
        return

    with connect_planner() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS calendar_events (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL,
                    event_type TEXT NOT NULL
                        CHECK (event_type IN ('meal', 'training', 'task', 'note')),
                    title TEXT NOT NULL,
                    scheduled_date DATE NOT NULL,
                    scheduled_time TEXT,
                    status TEXT NOT NULL DEFAULT 'planned'
                        CHECK (status IN ('planned', 'done', 'skipped')),
                    accent TEXT NOT NULL DEFAULT '#4f86f7',
                    linked_meal_id TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS calendar_events_user_date_idx
                ON calendar_events (user_id, scheduled_date, scheduled_time)
                """
            )


def init_storage_with_retries() -> None:
    if USE_MEMORY_STORAGE:
        init_storage()
        init_planner_storage()
        return

    for attempt in range(1, 31):
        try:
            init_storage()
            init_planner_storage()
            return
        except psycopg.OperationalError:
            if attempt == 30:
                raise
            time.sleep(1)


def upsert_food(cur: psycopg.Cursor[Any], data: dict[str, Any]) -> None:
    cur.execute(
        """
        INSERT INTO foods (
            id, name, detail, meal, image, calories, protein_g, carbs_g, fat_g,
            fiber_g, color, brand, store, barcode, serving_label, price,
            currency, source, external_id, category_path
        )
        VALUES (
            %(id)s, %(name)s, %(detail)s, %(meal)s, %(image)s, %(calories)s,
            %(protein_g)s, %(carbs_g)s, %(fat_g)s, %(fiber_g)s, %(color)s,
            %(brand)s, %(store)s, %(barcode)s, %(serving_label)s, %(price)s,
            %(currency)s, %(source)s, %(external_id)s, %(category_path)s
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            detail = EXCLUDED.detail,
            meal = EXCLUDED.meal,
            image = EXCLUDED.image,
            calories = EXCLUDED.calories,
            protein_g = EXCLUDED.protein_g,
            carbs_g = EXCLUDED.carbs_g,
            fat_g = EXCLUDED.fat_g,
            fiber_g = EXCLUDED.fiber_g,
            color = EXCLUDED.color,
            brand = EXCLUDED.brand,
            store = EXCLUDED.store,
            barcode = EXCLUDED.barcode,
            serving_label = EXCLUDED.serving_label,
            price = EXCLUDED.price,
            currency = EXCLUDED.currency,
            source = EXCLUDED.source,
            external_id = EXCLUDED.external_id,
            category_path = EXCLUDED.category_path,
            imported_at = NOW()
        """,
        {
            "brand": None,
            "store": None,
            "barcode": None,
            "serving_label": None,
            "price": None,
            "currency": None,
            "source": "seed",
            "external_id": data["id"],
            "category_path": None,
            **data,
        },
    )


def import_external_products() -> None:
    if USE_MEMORY_STORAGE or not EXTERNAL_PRODUCTS_SQLITE:
        return
    if not os.path.exists(EXTERNAL_PRODUCTS_SQLITE):
        return

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS count FROM foods WHERE source = 'external'")
            existing = int(cur.fetchone()["count"])
            if existing > 100 and not EXTERNAL_PRODUCTS_REFRESH:
                return

    sqlite_conn = sqlite3.connect(EXTERNAL_PRODUCTS_SQLITE)
    sqlite_conn.row_factory = sqlite3.Row
    rows = sqlite_conn.execute(
        """
        SELECT
            p.store,
            p.external_id,
            p.name,
            p.brand,
            p.image_url,
            p.price,
            p.currency,
            p.package_subtitle,
            p.calories,
            p.protein,
            p.fat,
            p.carbs,
            p.fiber,
            p.nutrition_basis,
            p.nutrition_basis_unit,
            p.breadcrumb_path,
            (
              SELECT pb.barcode
              FROM product_barcodes pb
              WHERE pb.store = p.store AND pb.product_external_id = p.external_id
              ORDER BY pb.is_primary DESC
              LIMIT 1
            ) AS barcode
        FROM products p
        WHERE p.name IS NOT NULL
          AND p.calories IS NOT NULL
          AND p.calories > 0
          AND p.is_food = 1
        ORDER BY p.store, p.name
        LIMIT ?
        """,
        (EXTERNAL_PRODUCTS_LIMIT,),
    ).fetchall()

    with connect() as conn:
        with conn.cursor() as cur:
            if EXTERNAL_PRODUCTS_REFRESH:
                cur.execute("DELETE FROM foods WHERE source = 'external'")

            for row in rows:
                store_key = normalize_text(row["store"] or "store").lower()
                external_id = normalize_text(row["external_id"] or row["name"])
                brand = normalize_text(row["brand"] or "") or None
                store = clean_store(row["store"])
                serving_label = normalize_text(
                    row["nutrition_basis"]
                    or row["package_subtitle"]
                    or row["nutrition_basis_unit"]
                    or "per 100 g"
                )
                detail_bits = [bit for bit in [brand, store, serving_label] if bit]
                data = {
                    "id": f"{store_key}:{external_id}",
                    "name": normalize_text(row["name"]),
                    "detail": " · ".join(detail_bits) or "Product database item",
                    "meal": "Lunch",
                    "image": first_image(row["image_url"]),
                    "calories": max(int(round(row["calories"] or 1)), 1),
                    "protein_g": max(int(round(row["protein"] or 0)), 0),
                    "carbs_g": max(int(round(row["carbs"] or 0)), 0),
                    "fat_g": max(int(round(row["fat"] or 0)), 0),
                    "fiber_g": max(int(round(row["fiber"] or 0)), 0),
                    "color": "#2bb673",
                    "brand": brand,
                    "store": store,
                    "barcode": normalize_text(row["barcode"] or "") or None,
                    "serving_label": serving_label,
                    "price": row["price"],
                    "currency": row["currency"],
                    "source": "external",
                    "external_id": external_id,
                    "category_path": row["breadcrumb_path"],
                }
                upsert_food(cur, data)
    sqlite_conn.close()


def count_foods() -> int:
    if USE_MEMORY_STORAGE:
        return len(MEMORY_FOODS)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS count FROM foods")
            return int(cur.fetchone()["count"])


def list_foods_from_storage(
    q: str | None = None,
    store: str | None = None,
    limit: int = 160,
    offset: int = 0,
) -> list[FoodItem]:
    cleaned_query = assert_clean(q or "")
    cleaned_store = assert_clean(store or "")
    limit = min(max(limit, 1), 500)
    offset = max(offset, 0)

    if USE_MEMORY_STORAGE:
        foods = list(MEMORY_FOODS.values())
        if cleaned_query:
            needle = cleaned_query.lower()
            foods = [
                food
                for food in foods
                if needle
                in f"{food.name} {food.detail} {food.brand or ''} {food.barcode or ''}".lower()
            ]
        return foods[offset : offset + limit]

    filters: list[str] = []
    params: list[Any] = []
    if cleaned_query:
        filters.append("(name ILIKE %s OR COALESCE(brand, '') ILIKE %s OR COALESCE(barcode, '') ILIKE %s)")
        like = f"%{cleaned_query}%"
        params.extend([like, like, like])
    if cleaned_store:
        filters.append("store ILIKE %s")
        params.append(f"%{cleaned_store}%")

    where_sql = f"WHERE {' AND '.join(filters)}" if filters else ""

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT *
                FROM foods
                {where_sql}
                ORDER BY
                    CASE source WHEN 'seed' THEN 0 ELSE 1 END,
                    CASE WHEN image <> '' THEN 0 ELSE 1 END,
                    name
                LIMIT %s
                OFFSET %s
                """,
                (*params, limit, offset),
            )
            return [FoodItem(**row) for row in cur.fetchall()]


def get_food(food_id: str) -> FoodItem | None:
    if USE_MEMORY_STORAGE:
        return MEMORY_FOODS.get(food_id)

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM foods WHERE id = %s", (food_id,))
            row = cur.fetchone()
            return FoodItem(**row) if row else None


def to_public_profile(user: dict[str, Any]) -> PublicProfile:
    return PublicProfile(
        id=str(user["id"]),
        name=user["name"],
        email=user["email"],
        calorie_goal=int(user["calorie_goal"]),
        activity_level=user["activity_level"],
        created_at=isoformat(user["created_at"]),
    )


def create_user(payload: RegisterRequest) -> dict[str, Any]:
    if payload.email in MEMORY_USERS_BY_EMAIL and USE_MEMORY_STORAGE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    salt, password_hash = hash_password(payload.password)
    user_id = str(uuid4())

    if USE_MEMORY_STORAGE:
        user = {
            "id": user_id,
            "name": payload.name,
            "email": payload.email,
            "password_hash": password_hash,
            "salt": salt,
            "calorie_goal": payload.calorie_goal,
            "activity_level": payload.activity_level,
            "created_at": now_iso(),
        }
        MEMORY_USERS_BY_EMAIL[user["email"]] = user
        MEMORY_USERS_BY_ID[user["id"]] = user
        return user

    try:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (
                        id, name, email, password_hash, salt,
                        calorie_goal, activity_level
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        user_id,
                        payload.name,
                        payload.email,
                        password_hash,
                        salt,
                        payload.calorie_goal,
                        payload.activity_level,
                    ),
                )
                return cur.fetchone()
    except errors.UniqueViolation as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        ) from exc


def get_user_by_email(email: str) -> dict[str, Any] | None:
    if USE_MEMORY_STORAGE:
        return MEMORY_USERS_BY_EMAIL.get(email)

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE email = %s", (email,))
            return cur.fetchone()


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    if USE_MEMORY_STORAGE:
        return MEMORY_USERS_BY_ID.get(user_id)

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cur.fetchone()


def issue_token(user: dict[str, Any]) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS)
    return jwt.encode(
        {
            "sub": str(user["id"]),
            "email": user["email"],
            "exp": expires_at,
        },
        SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def unauthorized(detail: str = "Invalid bearer token") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise unauthorized("Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise unauthorized() from exc

    user_id = payload.get("sub")
    if not isinstance(user_id, str):
        raise unauthorized()

    user = get_user_by_id(user_id)
    if user is None:
        raise unauthorized()
    return user


def scaled(value: int, multiplier: float) -> int:
    return int(round(value * multiplier))


def meal_response(
    meal_id: str,
    food: FoodItem,
    meal_slot: MealSlot,
    serving_multiplier: float | Decimal,
    logged_at: Any,
    note: str,
) -> MealLogResponse:
    multiplier = float(serving_multiplier)
    return MealLogResponse(
        id=str(meal_id),
        food=food,
        meal_slot=meal_slot,
        serving_multiplier=multiplier,
        logged_at=isoformat(logged_at),
        note=note,
        calories=scaled(food.calories, multiplier),
        protein_g=scaled(food.protein_g, multiplier),
        carbs_g=scaled(food.carbs_g, multiplier),
        fat_g=scaled(food.fat_g, multiplier),
        fiber_g=scaled(food.fiber_g, multiplier),
    )


def row_to_meal(row: dict[str, Any]) -> MealLogResponse:
    food = FoodItem(
        id=row["food_id"],
        name=row["name"],
        detail=row["detail"],
        meal=row["meal"],
        image=row["image"],
        calories=row["calories"],
        protein_g=row["protein_g"],
        carbs_g=row["carbs_g"],
        fat_g=row["fat_g"],
        fiber_g=row["fiber_g"],
        color=row["color"],
        brand=row["brand"],
        store=row["store"],
        barcode=row["barcode"],
        serving_label=row["serving_label"],
        price=float(row["price"]) if row["price"] is not None else None,
        currency=row["currency"],
        source=row["source"],
    )
    return meal_response(
        row["meal_id"],
        food,
        row["meal_slot"],
        row["serving_multiplier"],
        row["logged_at"],
        row["note"],
    )


def list_meals_for_user(user_id: str) -> list[MealLogResponse]:
    if USE_MEMORY_STORAGE:
        meals = sorted(
            MEMORY_MEALS_BY_USER[user_id],
            key=lambda item: item["logged_at"],
            reverse=True,
        )
        return [
            meal_response(
                meal["id"],
                MEMORY_FOODS[meal["food_id"]],
                meal["meal_slot"],
                meal["serving_multiplier"],
                meal["logged_at"],
                meal["note"],
            )
            for meal in meals
        ]

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    ml.id AS meal_id,
                    ml.meal_slot,
                    ml.serving_multiplier,
                    ml.logged_at,
                    ml.note,
                    f.id AS food_id,
                    f.name,
                    f.detail,
                    f.meal,
                    f.image,
                    f.calories,
                    f.protein_g,
                    f.carbs_g,
                    f.fat_g,
                    f.fiber_g,
                    f.color,
                    f.brand,
                    f.store,
                    f.barcode,
                    f.serving_label,
                    f.price,
                    f.currency,
                    f.source
                FROM meal_logs ml
                JOIN foods f ON f.id = ml.food_id
                WHERE ml.user_id = %s
                ORDER BY ml.logged_at DESC
                """,
                (user_id,),
            )
            return [row_to_meal(row) for row in cur.fetchall()]


def create_meal_for_user(user_id: str, payload: MealCreateRequest) -> MealLogResponse:
    food = get_food(payload.food_id)
    if food is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food item not found",
        )

    meal_id = str(uuid4())
    logged_at = datetime.now(timezone.utc)

    if USE_MEMORY_STORAGE:
        MEMORY_MEALS_BY_USER[user_id].append(
            {
                "id": meal_id,
                "food_id": payload.food_id,
                "meal_slot": payload.meal_slot,
                "serving_multiplier": payload.serving_multiplier,
                "note": payload.note,
                "logged_at": logged_at,
            }
        )
        return meal_response(
            meal_id,
            food,
            payload.meal_slot,
            payload.serving_multiplier,
            logged_at,
            payload.note,
        )

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO meal_logs (
                    id, user_id, food_id, meal_slot, serving_multiplier, note, logged_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    meal_id,
                    user_id,
                    payload.food_id,
                    payload.meal_slot,
                    payload.serving_multiplier,
                    payload.note,
                    logged_at,
                ),
            )
    return meal_response(
        meal_id,
        food,
        payload.meal_slot,
        payload.serving_multiplier,
        logged_at,
        payload.note,
    )


def delete_meal_for_user(user_id: str, meal_id: str) -> bool:
    if USE_MEMORY_STORAGE:
        existing = MEMORY_MEALS_BY_USER[user_id]
        next_meals = [meal for meal in existing if meal["id"] != meal_id]
        MEMORY_MEALS_BY_USER[user_id] = next_meals
        return len(next_meals) != len(existing)

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM meal_logs WHERE id = %s AND user_id = %s",
                (meal_id, user_id),
            )
            return cur.rowcount > 0


def event_response(row: dict[str, Any]) -> CalendarEventResponse:
    return CalendarEventResponse(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        event_type=row["event_type"],
        title=row["title"],
        scheduled_date=isoformat(row["scheduled_date"])[:10],
        scheduled_time=row["scheduled_time"],
        status=row["status"],
        accent=row["accent"],
        linked_meal_id=str(row["linked_meal_id"]) if row["linked_meal_id"] else None,
        created_at=isoformat(row["created_at"]),
        updated_at=isoformat(row["updated_at"]),
    )


def list_calendar_events_for_user(
    user_id: str,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[CalendarEventResponse]:
    start = date_from or (datetime.now(timezone.utc).date() - timedelta(days=14))
    end = date_to or (datetime.now(timezone.utc).date() + timedelta(days=45))

    if USE_MEMORY_PLANNER:
        rows = [
            event
            for event in MEMORY_CALENDAR_BY_USER[user_id]
            if start <= event["scheduled_date"] <= end
        ]
        rows.sort(key=lambda item: (item["scheduled_date"], item["scheduled_time"] or "99:99"))
        return [event_response(row) for row in rows]

    with connect_planner() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM calendar_events
                WHERE user_id = %s
                  AND scheduled_date BETWEEN %s AND %s
                ORDER BY scheduled_date, scheduled_time NULLS LAST, created_at
                """,
                (user_id, start, end),
            )
            return [event_response(row) for row in cur.fetchall()]


def create_calendar_event_for_user(
    user_id: str,
    payload: CalendarEventCreateRequest,
) -> CalendarEventResponse:
    event_id = str(uuid4())
    created_at = datetime.now(timezone.utc)
    row = {
        "id": event_id,
        "user_id": user_id,
        "event_type": payload.event_type,
        "title": payload.title,
        "scheduled_date": payload.scheduled_date,
        "scheduled_time": payload.scheduled_time,
        "status": payload.status,
        "accent": payload.accent,
        "linked_meal_id": payload.linked_meal_id,
        "created_at": created_at,
        "updated_at": created_at,
    }

    if USE_MEMORY_PLANNER:
        MEMORY_CALENDAR_BY_USER[user_id].append(row)
        return event_response(row)

    with connect_planner() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO calendar_events (
                    id, user_id, event_type, title, scheduled_date,
                    scheduled_time, status, accent, linked_meal_id,
                    created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    event_id,
                    user_id,
                    payload.event_type,
                    payload.title,
                    payload.scheduled_date,
                    payload.scheduled_time,
                    payload.status,
                    payload.accent,
                    payload.linked_meal_id,
                    created_at,
                    created_at,
                ),
            )
            return event_response(cur.fetchone())


def update_calendar_event_for_user(
    user_id: str,
    event_id: str,
    payload: CalendarEventUpdateRequest,
) -> CalendarEventResponse | None:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        events = list_calendar_events_for_user(user_id, date(1970, 1, 1), date(2999, 12, 31))
        return next((event for event in events if event.id == event_id), None)

    if USE_MEMORY_PLANNER:
        for event in MEMORY_CALENDAR_BY_USER[user_id]:
            if event["id"] == event_id:
                event.update(updates)
                event["updated_at"] = datetime.now(timezone.utc)
                return event_response(event)
        return None

    allowed = {
        "event_type",
        "title",
        "scheduled_date",
        "scheduled_time",
        "status",
        "accent",
        "linked_meal_id",
    }
    assignments = [f"{key} = %s" for key in updates if key in allowed]
    values = [updates[key] for key in updates if key in allowed]
    values.extend([event_id, user_id])

    with connect_planner() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE calendar_events
                SET {", ".join(assignments)}, updated_at = NOW()
                WHERE id = %s AND user_id = %s
                RETURNING *
                """,
                values,
            )
            row = cur.fetchone()
            return event_response(row) if row else None


def delete_calendar_event_for_user(user_id: str, event_id: str) -> bool:
    if USE_MEMORY_PLANNER:
        existing = MEMORY_CALENDAR_BY_USER[user_id]
        next_events = [event for event in existing if event["id"] != event_id]
        MEMORY_CALENDAR_BY_USER[user_id] = next_events
        return len(next_events) != len(existing)

    with connect_planner() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM calendar_events WHERE id = %s AND user_id = %s",
                (event_id, user_id),
            )
            return cur.rowcount > 0


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_storage_with_retries()
    yield


app = FastAPI(
    title="TrackFood AI Backend",
    version="1.1.0",
    description="FastAPI app service for TrackFood AI.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    swagger_ui_parameters={
        "displayRequestDuration": True,
        "docExpansion": "list",
    },
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        host.strip()
        for host in os.getenv(
            "ALLOWED_HOSTS",
            "localhost,127.0.0.1,testserver,backend,frontend,*.orb.local",
        ).split(",")
        if host.strip()
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def harden_requests(request: Request, call_next):
    client = request.client.host if request.client else "unknown"
    key = f"{client}:{request.url.path}"
    current_time = time.monotonic()
    bucket = RATE_BUCKETS[key]

    while bucket and current_time - bucket[0] > 60:
        bucket.popleft()

    if len(bucket) >= MAX_REQUESTS_PER_MINUTE:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Too many requests"},
        )

    bucket.append(current_time)

    try:
        content_length = int(request.headers.get("content-length", "0"))
    except ValueError:
        content_length = 0

    if content_length > MAX_BODY_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"detail": "Request body too large"},
        )

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"
    return response


@app.get("/", tags=["Root"])
def root() -> dict[str, str]:
    return {
        "name": "TrackFood AI Backend",
        "docs": "/docs",
        "health": "/health",
        "foods": "/api/v1/foods",
        "calendar": "/api/v1/calendar/events",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="trackfoodai-backend",
        timestamp=now_iso(),
        database="memory" if USE_MEMORY_STORAGE else "postgres",
        products=count_foods(),
    )


@app.get("/api/v1/status", response_model=AppStatusResponse, tags=["App"])
def app_status() -> AppStatusResponse:
    return AppStatusResponse(
        name="TrackFood AI",
        version="1.1.0",
        environment=os.getenv("APP_ENV", "local"),
        docs_url="/docs",
        storage="memory" if USE_MEMORY_STORAGE else "postgres",
        products=count_foods(),
        security=[
            "strict CORS",
            "trusted hosts",
            "JWT auth",
            "rate limiting",
            "body size limit",
            "security headers",
            "input validation",
        ],
    )


@app.get("/api/v1/foods", response_model=list[FoodItem], tags=["Nutrition"])
def list_foods(
    q: Annotated[str, Query(max_length=120)] = "",
    store: Annotated[str, Query(max_length=80)] = "",
    limit: Annotated[int, Query(ge=1, le=500)] = 160,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[FoodItem]:
    return list_foods_from_storage(q=q, store=store, limit=limit, offset=offset)


@app.post(
    "/api/v1/nutrition/estimate",
    response_model=NutritionEstimateResponse,
    tags=["Nutrition"],
)
def estimate_nutrition(
    payload: NutritionEstimateRequest,
) -> NutritionEstimateResponse:
    foods = list_foods_from_storage(q=payload.description, limit=20)
    if not foods:
        foods = list_foods_from_storage(limit=20)
    words = set(re.findall(r"[a-záéíóúñü]+", payload.description.lower()))
    best_food = max(
        foods,
        key=lambda food: len(
            words
            & set(re.findall(r"[a-záéíóúñü]+", f"{food.name} {food.detail}".lower()))
        ),
    )
    confidence = 0.78 if words else 0.56
    if best_food.name.lower().split()[0] in payload.description.lower():
        confidence = 0.9

    return NutritionEstimateResponse(
        food_id=best_food.id,
        label=best_food.name,
        calories=best_food.calories,
        protein_g=best_food.protein_g,
        carbs_g=best_food.carbs_g,
        fat_g=best_food.fat_g,
        fiber_g=best_food.fiber_g,
        confidence=confidence,
        note="Matched against the TrackFood AI product database.",
    )


@app.post(
    "/api/v1/auth/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Auth"],
)
def register(payload: RegisterRequest) -> AuthResponse:
    user = create_user(payload)
    return AuthResponse(token=issue_token(user), profile=to_public_profile(user))


@app.post("/api/v1/auth/login", response_model=AuthResponse, tags=["Auth"])
def login(payload: LoginRequest) -> AuthResponse:
    user = get_user_by_email(payload.email)
    if user is None or not verify_password(payload.password, user["salt"], user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return AuthResponse(token=issue_token(user), profile=to_public_profile(user))


@app.get("/api/v1/profile", response_model=PublicProfile, tags=["Profile"])
def get_profile(user: dict[str, Any] = Depends(get_current_user)) -> PublicProfile:
    return to_public_profile(user)


@app.get("/api/v1/profile/stats", response_model=ProfileStatsResponse, tags=["Profile"])
def get_profile_stats(
    user: dict[str, Any] = Depends(get_current_user),
) -> ProfileStatsResponse:
    meals = list_meals_for_user(str(user["id"]))
    calories_logged = sum(meal.calories for meal in meals)

    return ProfileStatsResponse(
        profile=to_public_profile(user),
        calories_logged=calories_logged,
        remaining_kcal=max(int(user["calorie_goal"]) - calories_logged, 0),
        protein_g=sum(meal.protein_g for meal in meals),
        carbs_g=sum(meal.carbs_g for meal in meals),
        fat_g=sum(meal.fat_g for meal in meals),
        fiber_g=sum(meal.fiber_g for meal in meals),
        meals=meals,
    )


@app.get("/api/v1/meals", response_model=list[MealLogResponse], tags=["Meals"])
def list_meals(user: dict[str, Any] = Depends(get_current_user)) -> list[MealLogResponse]:
    return list_meals_for_user(str(user["id"]))


@app.get(
    "/api/v1/calendar/events",
    response_model=list[CalendarEventResponse],
    tags=["Calendar"],
)
def list_calendar_events(
    date_from: date | None = None,
    date_to: date | None = None,
    user: dict[str, Any] = Depends(get_current_user),
) -> list[CalendarEventResponse]:
    return list_calendar_events_for_user(str(user["id"]), date_from, date_to)


@app.post(
    "/api/v1/calendar/events",
    response_model=CalendarEventResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Calendar"],
)
def create_calendar_event(
    payload: CalendarEventCreateRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> CalendarEventResponse:
    return create_calendar_event_for_user(str(user["id"]), payload)


@app.patch(
    "/api/v1/calendar/events/{event_id}",
    response_model=CalendarEventResponse,
    tags=["Calendar"],
)
def update_calendar_event(
    event_id: str,
    payload: CalendarEventUpdateRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> CalendarEventResponse:
    event = update_calendar_event_for_user(str(user["id"]), event_id, payload)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar event not found",
        )
    return event


@app.delete("/api/v1/calendar/events/{event_id}", tags=["Calendar"])
def delete_calendar_event(
    event_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    deleted = delete_calendar_event_for_user(str(user["id"]), event_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar event not found",
        )
    return {"status": "deleted"}


@app.post(
    "/api/v1/meals",
    response_model=MealLogResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Meals"],
)
def create_meal(
    payload: MealCreateRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> MealLogResponse:
    return create_meal_for_user(str(user["id"]), payload)


@app.delete("/api/v1/meals/{meal_id}", tags=["Meals"])
def delete_meal(
    meal_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    deleted = delete_meal_for_user(str(user["id"]), meal_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal log not found",
        )
    return {"status": "deleted"}
