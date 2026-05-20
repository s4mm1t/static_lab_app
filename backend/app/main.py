from __future__ import annotations

from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import hmac
import ipaddress
import os
import re
import secrets
import sqlite3
import time
from typing import Annotated, Any, Literal
from uuid import uuid4

import bcrypt
import httpx
import jwt
import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from psycopg import errors
from psycopg.rows import dict_row
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.trustedhost import TrustedHostMiddleware


ActivityLevel = Literal["light", "balanced", "active"]
MealType = Literal["Breakfast", "Lunch", "Dinner"]
MealSlot = Literal["breakfast", "lunch", "dinner", "snack"]
CalendarEventType = Literal["meal", "training", "task", "note"]
CalendarEventStatus = Literal["planned", "done", "skipped"]
UserRole = Literal["user", "admin"]
SecuritySeverity = Literal["info", "warning", "critical"]
AssistantRole = Literal["user", "assistant"]

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://trackfoodai:trackfoodai@localhost:5432/trackfoodai",
)
PLANNER_DATABASE_URL = os.getenv("PLANNER_DATABASE_URL", DATABASE_URL)
ASSISTANT_DATABASE_URL = os.getenv("ASSISTANT_DATABASE_URL", DATABASE_URL)
EXTERNAL_PRODUCTS_SQLITE = os.getenv("EXTERNAL_PRODUCTS_SQLITE", "")
EXTERNAL_PRODUCTS_LIMIT = int(os.getenv("EXTERNAL_PRODUCTS_LIMIT", "30000"))
EXTERNAL_PRODUCTS_REFRESH = os.getenv("EXTERNAL_PRODUCTS_REFRESH", "false").lower() == "true"
APP_ENV = os.getenv("APP_ENV", "local")
USE_MEMORY_STORAGE = DATABASE_URL.startswith("memory://")
USE_MEMORY_PLANNER = USE_MEMORY_STORAGE or PLANNER_DATABASE_URL.startswith("memory://")
USE_MEMORY_ASSISTANT = USE_MEMORY_STORAGE or ASSISTANT_DATABASE_URL.startswith("memory://")
SECRET_KEY = os.getenv("SECRET_KEY", "trackfoodai-local-dev-secret-change-me")
JWT_ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 24 * 14
MAX_BODY_BYTES = 320_000
MAX_REQUESTS_PER_MINUTE = 160
AUTH_REQUESTS_PER_MINUTE = 24
INTRUDER_BLOCK_THRESHOLD = 5
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.getenv("TRACKFOODAI_ADMIN_EMAILS", "").split(",")
    if email.strip()
}
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


def assert_chat_clean(value: str) -> str:
    cleaned = normalize_text(value)
    if any(pattern.search(cleaned) for pattern in DANGEROUS_PATTERNS[:4]):
        raise ValueError("Message contains unsafe patterns")
    return cleaned


def role_for_email(email: str) -> UserRole:
    return "admin" if email.lower() in ADMIN_EMAILS else "user"


def hash_password_legacy(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        240_000,
    )
    return salt, digest.hex()


def hash_password(password: str) -> tuple[str, str]:
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    return "bcrypt", password_hash


def verify_password(
    password: str,
    salt: str,
    stored_hash: str,
    password_scheme: str | None = None,
) -> bool:
    if password_scheme == "bcrypt" or stored_hash.startswith("$2"):
        return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))

    _, candidate_hash = hash_password_legacy(password, salt)
    return hmac.compare_digest(candidate_hash, stored_hash)


def first_image(value: str | None) -> str:
    if not value:
        return ""
    return value.split(",")[0].strip()


def clean_store(value: str | None) -> str:
    return normalize_text(value or "").replace("_", " ").title()


def resolve_external_products_sqlite() -> str:
    if not EXTERNAL_PRODUCTS_SQLITE:
        return ""
    if os.path.exists(EXTERNAL_PRODUCTS_SQLITE):
        return EXTERNAL_PRODUCTS_SQLITE

    folder = os.path.dirname(EXTERNAL_PRODUCTS_SQLITE)
    for candidate in ("Combined.sqlite", "Combine.sqlite"):
        path = os.path.join(folder, candidate)
        if os.path.exists(path):
            return path
    return EXTERNAL_PRODUCTS_SQLITE


def query_terms(value: str) -> list[str]:
    return [
        term
        for term in re.findall(r"[0-9a-záéíóúüñç]+", value.lower())
        if len(term) > 1
    ]


def display_food_name(value: str, brand: str | None = None, store: str | None = None) -> str:
    original = normalize_text(value)
    name = re.split(r"\s+-\s+", original, maxsplit=1)[0]

    for prefix in (brand, store):
        cleaned_prefix = normalize_text(prefix or "")
        if cleaned_prefix and name.lower().startswith(cleaned_prefix.lower()):
            name = name[len(cleaned_prefix) :].strip(" -:·")

    noise_patterns = [
        r"^(?:alcampo\s+)?cultivamos\s+lo\s+bueno\s+",
        r"^(?:hacendado|mercadona|eroski|dia|carrefour|masymas|alteza|el corte ingles)\s+",
        r"\s+¡?haz\s+tu\s+compra\s+online.*$",
        r"\s+\|\s+.*$",
        r"\s+clase\s+[a-z]\b.*$",
        r"\s+cat\.?\s+[a-z]\b.*$",
        r"\s+\d+(?:[,.]\d+)?\s*(?:uds?|unidades|packs?|x|kg|g|gr|ml|cl|l)\b.*$",
    ]
    for pattern in noise_patterns:
        name = re.sub(pattern, "", name, flags=re.I).strip(" -:·")

    name = normalize_text(name)
    if not name:
        name = original
    if name.isupper() and len(name) > 8:
        name = name.capitalize()
    return name[:96].rstrip(" -:·")


def food_item_from_row(row: dict[str, Any]) -> FoodItem:
    data = dict(row)
    data["name"] = display_food_name(
        str(data.get("name") or ""),
        data.get("brand"),
        data.get("store"),
    )
    return FoodItem(**data)


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
    phone_number: str | None = None
    avatar_data_url: str | None = None
    calorie_goal: int
    activity_level: ActivityLevel
    role: UserRole = "user"
    created_at: str


class AuthResponse(BaseModel):
    token: str
    profile: PublicProfile


class ProfileUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=80)
    phone_number: str | None = Field(None, max_length=32)
    avatar_data_url: str | None = Field(None, max_length=260_000)
    calorie_goal: int | None = Field(None, ge=1000, le=6000)
    activity_level: ActivityLevel | None = None

    @field_validator("name", "phone_number")
    @classmethod
    def validate_text(cls, value: str | None) -> str | None:
        return assert_clean(value) if value is not None else None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value in (None, ""):
            return None
        if not re.match(r"^[0-9+()\-\s]{6,32}$", value):
            raise ValueError("Invalid phone number")
        return value

    @field_validator("avatar_data_url")
    @classmethod
    def validate_avatar(cls, value: str | None) -> str | None:
        if value in (None, ""):
            return None
        if not value.startswith("data:image/"):
            raise ValueError("Avatar must be an image data URL")
        if any(pattern.search(value) for pattern in DANGEROUS_PATTERNS[:3]):
            raise ValueError("Avatar contains unsafe patterns")
        return value


class MealCreateRequest(BaseModel):
    food_id: str = Field(..., min_length=2, max_length=120)
    meal_slot: MealSlot = "breakfast"
    serving_multiplier: float = Field(1.0, ge=0.05, le=20.0)
    note: str = Field("", max_length=160)

    @field_validator("food_id", "note")
    @classmethod
    def validate_text(cls, value: str) -> str:
        return assert_clean(value)


class MealUpdateRequest(BaseModel):
    food_id: str | None = Field(None, min_length=2, max_length=120)
    meal_slot: MealSlot | None = None
    serving_multiplier: float | None = Field(None, ge=0.05, le=20.0)
    note: str | None = Field(None, max_length=160)
    logged_at: datetime | None = None

    @field_validator("food_id", "note")
    @classmethod
    def validate_text(cls, value: str | None) -> str | None:
        return assert_clean(value) if value is not None else None


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


class SecurityEventResponse(BaseModel):
    id: str
    action: str
    severity: SecuritySeverity
    user_id: str | None
    ip: str
    path: str
    user_agent: str
    fingerprint: str
    details: str
    created_at: str


class IntruderFlagResponse(BaseModel):
    id: str
    ip: str
    fingerprint: str
    attempts: int
    is_blocked: bool
    last_seen_at: str
    blocked_at: str | None


class SecuritySummaryResponse(BaseModel):
    events: int
    warnings: int
    critical: int
    blocked_intruders: int
    recent_events: list[SecurityEventResponse]


class AssistantContextCreateRequest(BaseModel):
    title: str = Field("New context", min_length=1, max_length=80)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        return assert_clean(value)


class AssistantContextUpdateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=80)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        return assert_clean(value)


class AssistantContextResponse(BaseModel):
    id: str
    title: str
    summary: str
    created_at: str
    updated_at: str


class AssistantMessageCreateRequest(BaseModel):
    message: str = Field(..., min_length=2, max_length=1200)
    context_id: str | None = None

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        return assert_chat_clean(value)


class AssistantMessageResponse(BaseModel):
    id: str
    context_id: str
    role: AssistantRole
    content: str
    provider: str
    model: str
    created_at: str


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
MEMORY_SECURITY_EVENTS: list[dict[str, Any]] = []
MEMORY_INTRUDERS: dict[str, dict[str, Any]] = {}
MEMORY_AI_CONTEXTS_BY_USER: dict[str, list[dict[str, Any]]] = defaultdict(list)
MEMORY_AI_CONTEXTS_BY_ID: dict[str, dict[str, Any]] = {}
MEMORY_AI_MESSAGES_BY_CONTEXT: dict[str, list[dict[str, Any]]] = defaultdict(list)
MEMORY_AI_LESSONS_BY_USER: dict[str, list[dict[str, Any]]] = defaultdict(list)


def connect() -> psycopg.Connection[Any]:
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def connect_planner() -> psycopg.Connection[Any]:
    return psycopg.connect(PLANNER_DATABASE_URL, row_factory=dict_row)


def connect_assistant() -> psycopg.Connection[Any]:
    return psycopg.connect(ASSISTANT_DATABASE_URL, row_factory=dict_row)


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
        MEMORY_SECURITY_EVENTS.clear()
        MEMORY_INTRUDERS.clear()
        MEMORY_AI_CONTEXTS_BY_USER.clear()
        MEMORY_AI_CONTEXTS_BY_ID.clear()
        MEMORY_AI_MESSAGES_BY_CONTEXT.clear()
        MEMORY_AI_LESSONS_BY_USER.clear()
        return

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    phone_number TEXT,
                    avatar_data_url TEXT,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    password_scheme TEXT NOT NULL DEFAULT 'pbkdf2',
                    calorie_goal INTEGER NOT NULL CHECK (calorie_goal BETWEEN 1000 AND 6000),
                    activity_level TEXT NOT NULL CHECK (activity_level IN ('light', 'balanced', 'active')),
                    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            for column in [
                "phone_number TEXT",
                "avatar_data_url TEXT",
                "password_scheme TEXT NOT NULL DEFAULT 'pbkdf2'",
                "role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'))",
            ]:
                cur.execute(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {column}")
            for admin_email in ADMIN_EMAILS:
                cur.execute("UPDATE users SET role = 'admin' WHERE email = %s", (admin_email,))
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
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS security_events (
                    id UUID PRIMARY KEY,
                    action TEXT NOT NULL,
                    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
                    user_id UUID,
                    ip TEXT NOT NULL,
                    path TEXT NOT NULL,
                    user_agent TEXT NOT NULL,
                    fingerprint TEXT NOT NULL,
                    details TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS security_events_created_idx
                ON security_events (created_at DESC)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS intruder_flags (
                    id UUID PRIMARY KEY,
                    ip TEXT NOT NULL,
                    fingerprint TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 1,
                    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
                    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    blocked_at TIMESTAMPTZ,
                    UNIQUE (ip, fingerprint)
                )
                """
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


def init_assistant_storage() -> None:
    if USE_MEMORY_ASSISTANT:
        MEMORY_AI_CONTEXTS_BY_USER.clear()
        MEMORY_AI_CONTEXTS_BY_ID.clear()
        MEMORY_AI_MESSAGES_BY_CONTEXT.clear()
        MEMORY_AI_LESSONS_BY_USER.clear()
        return

    with connect_assistant() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS ai_contexts (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL,
                    title TEXT NOT NULL,
                    summary TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS ai_contexts_user_updated_idx
                ON ai_contexts (user_id, updated_at DESC)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS ai_messages (
                    id UUID PRIMARY KEY,
                    context_id UUID NOT NULL REFERENCES ai_contexts(id) ON DELETE CASCADE,
                    user_id UUID NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    provider TEXT NOT NULL DEFAULT 'gemini',
                    model TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS ai_messages_context_created_idx
                ON ai_messages (context_id, created_at)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS ai_lessons (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL,
                    lesson TEXT NOT NULL,
                    source_message_id UUID,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS ai_lessons_user_created_idx
                ON ai_lessons (user_id, created_at DESC)
                """
            )


def init_storage_with_retries() -> None:
    if USE_MEMORY_STORAGE:
        init_storage()
        init_planner_storage()
        init_assistant_storage()
        return

    for attempt in range(1, 31):
        try:
            init_storage()
            init_planner_storage()
            init_assistant_storage()
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
    external_sqlite = resolve_external_products_sqlite()
    if USE_MEMORY_STORAGE or not external_sqlite:
        return
    if not os.path.exists(external_sqlite):
        return

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS count FROM foods WHERE source = 'external'")
            existing = int(cur.fetchone()["count"])
            if existing > 100 and not EXTERNAL_PRODUCTS_REFRESH:
                return

    sqlite_conn = sqlite3.connect(external_sqlite)
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
                raw_name = normalize_text(row["name"])
                data = {
                    "id": f"{store_key}:{external_id}",
                    "name": display_food_name(raw_name, brand, store),
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
    limit: int = 1000,
    offset: int = 0,
) -> list[FoodItem]:
    cleaned_query = assert_clean(q or "")
    cleaned_store = assert_clean(store or "")
    terms = query_terms(cleaned_query)
    limit = min(max(limit, 1), 1000)
    offset = max(offset, 0)

    if USE_MEMORY_STORAGE:
        foods = list(MEMORY_FOODS.values())
        if cleaned_query:
            needle = cleaned_query.lower()
            foods = [
                food
                for food in foods
                if all(
                    term
                    in f"{food.name} {food.detail} {food.brand or ''} {food.store or ''} {food.barcode or ''}".lower()
                    for term in (terms or [needle])
                )
            ]
        return [FoodItem(**(food.model_dump() | {"name": display_food_name(food.name, food.brand, food.store)})) for food in foods[offset : offset + limit]]

    filters: list[str] = []
    params: list[Any] = []
    if cleaned_query:
        if terms:
            term_filters = []
            for term in terms:
                term_filters.append(
                    """
                    (
                        name ILIKE %s
                        OR detail ILIKE %s
                        OR COALESCE(brand, '') ILIKE %s
                        OR COALESCE(store, '') ILIKE %s
                        OR COALESCE(barcode, '') ILIKE %s
                        OR COALESCE(category_path, '') ILIKE %s
                    )
                    """
                )
                like = f"%{term}%"
                params.extend([like, like, like, like, like, like])
            filters.append(f"({' AND '.join(term_filters)})")
        else:
            filters.append("(name ILIKE %s OR COALESCE(brand, '') ILIKE %s OR COALESCE(barcode, '') ILIKE %s)")
            like = f"%{cleaned_query}%"
            params.extend([like, like, like])
    if cleaned_store:
        filters.append("store ILIKE %s")
        params.append(f"%{cleaned_store}%")

    where_sql = f"WHERE {' AND '.join(filters)}" if filters else ""
    order_sql = """
                    CASE source WHEN 'seed' THEN 0 ELSE 1 END,
                    CASE WHEN image <> '' THEN 0 ELSE 1 END,
                    name
    """
    order_params: list[Any] = []
    if cleaned_query:
        exact = cleaned_query.lower()
        phrase = f"%{cleaned_query}%"
        score_bits = [
            "CASE WHEN lower(COALESCE(barcode, '')) = %s THEN 80 ELSE 0 END",
            "CASE WHEN lower(name) = %s THEN 60 ELSE 0 END",
            "CASE WHEN name ILIKE %s THEN 30 ELSE 0 END",
        ]
        order_params.extend([exact, exact, phrase])
        for term in terms or [cleaned_query]:
            like = f"%{term}%"
            prefix = f"{term}%"
            score_bits.extend(
                [
                    "CASE WHEN name ILIKE %s THEN 20 ELSE 0 END",
                    "CASE WHEN name ILIKE %s THEN 10 ELSE 0 END",
                    "CASE WHEN COALESCE(brand, '') ILIKE %s THEN 5 ELSE 0 END",
                    "CASE WHEN COALESCE(store, '') ILIKE %s THEN 4 ELSE 0 END",
                    "CASE WHEN COALESCE(category_path, '') ILIKE %s THEN 2 ELSE 0 END",
                ]
            )
            order_params.extend([prefix, like, like, like, like])
        order_sql = f"""
                    ({' + '.join(score_bits)}) DESC,
                    CASE WHEN image <> '' THEN 0 ELSE 1 END,
                    LENGTH(name),
                    name
        """

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT *
                FROM foods
                {where_sql}
                ORDER BY
                    {order_sql}
                LIMIT %s
                OFFSET %s
                """,
                (*params, *order_params, limit, offset),
            )
            return [food_item_from_row(row) for row in cur.fetchall()]


def get_food(food_id: str) -> FoodItem | None:
    if USE_MEMORY_STORAGE:
        return MEMORY_FOODS.get(food_id)

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM foods WHERE id = %s", (food_id,))
            row = cur.fetchone()
            return food_item_from_row(row) if row else None


def to_public_profile(user: dict[str, Any]) -> PublicProfile:
    return PublicProfile(
        id=str(user["id"]),
        name=user["name"],
        email=user["email"],
        phone_number=user.get("phone_number"),
        avatar_data_url=user.get("avatar_data_url"),
        calorie_goal=int(user["calorie_goal"]),
        activity_level=user["activity_level"],
        role=user.get("role") or role_for_email(user["email"]),
        created_at=isoformat(user["created_at"]),
    )


def create_user(payload: RegisterRequest) -> dict[str, Any]:
    if payload.email in MEMORY_USERS_BY_EMAIL and USE_MEMORY_STORAGE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    salt, password_hash = hash_password(payload.password)
    role = role_for_email(payload.email)
    user_id = str(uuid4())

    if USE_MEMORY_STORAGE:
        user = {
            "id": user_id,
            "name": payload.name,
            "email": payload.email,
            "phone_number": None,
            "avatar_data_url": None,
            "password_hash": password_hash,
            "salt": salt,
            "password_scheme": "bcrypt",
            "calorie_goal": payload.calorie_goal,
            "activity_level": payload.activity_level,
            "role": role,
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
                        id, name, email, phone_number, avatar_data_url, password_hash, salt,
                        password_scheme, calorie_goal, activity_level, role
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        user_id,
                        payload.name,
                        payload.email,
                        None,
                        None,
                        password_hash,
                        salt,
                        "bcrypt",
                        payload.calorie_goal,
                        payload.activity_level,
                        role,
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


def update_user_profile(user_id: str, payload: ProfileUpdateRequest) -> dict[str, Any]:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        user = get_user_by_id(user_id)
        if user is None:
            raise unauthorized()
        return user

    if USE_MEMORY_STORAGE:
        user = MEMORY_USERS_BY_ID.get(user_id)
        if user is None:
            raise unauthorized()
        user.update(updates)
        MEMORY_USERS_BY_EMAIL[user["email"]] = user
        return user

    allowed = {
        "name",
        "phone_number",
        "avatar_data_url",
        "calorie_goal",
        "activity_level",
    }
    assignments = [f"{key} = %s" for key in updates if key in allowed]
    values = [updates[key] for key in updates if key in allowed]
    values.append(user_id)

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE users
                SET {", ".join(assignments)}
                WHERE id = %s
                RETURNING *
                """,
                values,
            )
            row = cur.fetchone()
            if row is None:
                raise unauthorized()
            return row


def update_user_password_hash(user_id: str, password: str) -> None:
    salt, password_hash = hash_password(password)

    if USE_MEMORY_STORAGE:
        user = MEMORY_USERS_BY_ID.get(user_id)
        if user:
            user["salt"] = salt
            user["password_hash"] = password_hash
            user["password_scheme"] = "bcrypt"
        return

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET salt = %s, password_hash = %s, password_scheme = 'bcrypt'
                WHERE id = %s
                """,
                (salt, password_hash, user_id),
            )


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


def get_meal_for_user(user_id: str, meal_id: str) -> MealLogResponse | None:
    if USE_MEMORY_STORAGE:
        for meal in MEMORY_MEALS_BY_USER[user_id]:
            if meal["id"] == meal_id:
                food = get_food(meal["food_id"])
                if food is None:
                    return None
                return meal_response(
                    meal["id"],
                    food,
                    meal["meal_slot"],
                    meal["serving_multiplier"],
                    meal["logged_at"],
                    meal["note"],
                )
        return None

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
                WHERE ml.user_id = %s AND ml.id = %s
                LIMIT 1
                """,
                (user_id, meal_id),
            )
            row = cur.fetchone()
            return row_to_meal(row) if row else None


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


def update_meal_for_user(
    user_id: str,
    meal_id: str,
    payload: MealUpdateRequest,
) -> MealLogResponse | None:
    existing = get_meal_for_user(user_id, meal_id)
    if existing is None:
        return None

    updates = payload.model_dump(exclude_unset=True)
    if "food_id" in updates and updates["food_id"] is not None and get_food(updates["food_id"]) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food item not found",
        )

    if USE_MEMORY_STORAGE:
        for meal in MEMORY_MEALS_BY_USER[user_id]:
            if meal["id"] == meal_id:
                if payload.food_id is not None:
                    meal["food_id"] = payload.food_id
                if payload.meal_slot is not None:
                    meal["meal_slot"] = payload.meal_slot
                if payload.serving_multiplier is not None:
                    meal["serving_multiplier"] = payload.serving_multiplier
                if payload.note is not None:
                    meal["note"] = payload.note
                if payload.logged_at is not None:
                    meal["logged_at"] = payload.logged_at
                break
        return get_meal_for_user(user_id, meal_id)

    columns: list[str] = []
    values: list[Any] = []
    field_map = {
        "food_id": "food_id",
        "meal_slot": "meal_slot",
        "serving_multiplier": "serving_multiplier",
        "note": "note",
        "logged_at": "logged_at",
    }
    for field, column in field_map.items():
        if field in updates:
            columns.append(f"{column} = %s")
            values.append(updates[field])

    if columns:
        values.extend([meal_id, user_id])
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE meal_logs SET {', '.join(columns)} WHERE id = %s AND user_id = %s",
                    values,
                )

    return get_meal_for_user(user_id, meal_id)


def duplicate_meal_for_user(user_id: str, meal_id: str) -> MealLogResponse | None:
    source = get_meal_for_user(user_id, meal_id)
    if source is None:
        return None
    return create_meal_for_user(
        user_id,
        MealCreateRequest(
            food_id=source.food.id,
            meal_slot=source.meal_slot,
            serving_multiplier=source.serving_multiplier,
            note=source.note,
        ),
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


def request_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if forwarded:
        return forwarded[:80]
    return (request.client.host if request.client else "unknown")[:80]


def is_local_dev_ip(ip: str) -> bool:
    try:
        parsed = ipaddress.ip_address(ip)
    except ValueError:
        return ip in {"localhost", "testserver", "backend", "frontend"}
    return parsed.is_loopback or parsed.is_private or parsed.is_link_local


def is_local_dev_request(request: Request) -> bool:
    return APP_ENV in {"local", "dev", "development", "test"} and is_local_dev_ip(request_ip(request))


def request_fingerprint(request: Request) -> str:
    explicit = request.headers.get("x-trackfood-fingerprint") or request.headers.get("x-station-id")
    if explicit:
        return normalize_text(explicit)[:160]
    user_agent = request.headers.get("user-agent", "unknown")
    return hashlib.sha256(user_agent.encode("utf-8")).hexdigest()[:32]


def event_response_from_row(row: dict[str, Any]) -> SecurityEventResponse:
    return SecurityEventResponse(
        id=str(row["id"]),
        action=row["action"],
        severity=row["severity"],
        user_id=str(row["user_id"]) if row.get("user_id") else None,
        ip=row["ip"],
        path=row["path"],
        user_agent=row["user_agent"],
        fingerprint=row["fingerprint"],
        details=row["details"],
        created_at=isoformat(row["created_at"]),
    )


def intruder_response_from_row(row: dict[str, Any]) -> IntruderFlagResponse:
    return IntruderFlagResponse(
        id=str(row["id"]),
        ip=row["ip"],
        fingerprint=row["fingerprint"],
        attempts=int(row["attempts"]),
        is_blocked=bool(row["is_blocked"]),
        last_seen_at=isoformat(row["last_seen_at"]),
        blocked_at=isoformat(row["blocked_at"]) if row.get("blocked_at") else None,
    )


def log_security_event(
    action: str,
    severity: SecuritySeverity,
    request: Request,
    user_id: str | None = None,
    details: str = "",
) -> SecurityEventResponse:
    event = {
        "id": str(uuid4()),
        "action": action,
        "severity": severity,
        "user_id": user_id,
        "ip": request_ip(request),
        "path": str(request.url.path)[:240],
        "user_agent": request.headers.get("user-agent", "unknown")[:240],
        "fingerprint": request_fingerprint(request),
        "details": normalize_text(details)[:500],
        "created_at": datetime.now(timezone.utc),
    }

    if USE_MEMORY_STORAGE:
        MEMORY_SECURITY_EVENTS.append(event)
        return event_response_from_row(event)

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO security_events (
                    id, action, severity, user_id, ip, path,
                    user_agent, fingerprint, details, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    event["id"],
                    action,
                    severity,
                    user_id,
                    event["ip"],
                    event["path"],
                    event["user_agent"],
                    event["fingerprint"],
                    event["details"],
                    event["created_at"],
                ),
            )
            return event_response_from_row(cur.fetchone())


def flag_intruder(request: Request) -> IntruderFlagResponse:
    ip = request_ip(request)
    fingerprint = request_fingerprint(request)
    now = datetime.now(timezone.utc)
    key = f"{ip}:{fingerprint}"

    if USE_MEMORY_STORAGE:
        row = MEMORY_INTRUDERS.get(key)
        if row:
            row["attempts"] += 1
            row["last_seen_at"] = now
        else:
            row = {
                "id": str(uuid4()),
                "ip": ip,
                "fingerprint": fingerprint,
                "attempts": 1,
                "is_blocked": False,
                "last_seen_at": now,
                "blocked_at": None,
            }
            MEMORY_INTRUDERS[key] = row
        if row["attempts"] >= INTRUDER_BLOCK_THRESHOLD:
            row["is_blocked"] = True
            row["blocked_at"] = row["blocked_at"] or now
        return intruder_response_from_row(row)

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO intruder_flags (
                    id, ip, fingerprint, attempts, is_blocked, last_seen_at, blocked_at
                )
                VALUES (%s, %s, %s, 1, FALSE, %s, NULL)
                ON CONFLICT (ip, fingerprint) DO UPDATE SET
                    attempts = intruder_flags.attempts + 1,
                    last_seen_at = EXCLUDED.last_seen_at,
                    is_blocked = (intruder_flags.attempts + 1) >= %s,
                    blocked_at = CASE
                        WHEN (intruder_flags.attempts + 1) >= %s
                        THEN COALESCE(intruder_flags.blocked_at, EXCLUDED.last_seen_at)
                        ELSE intruder_flags.blocked_at
                    END
                RETURNING *
                """,
                (str(uuid4()), ip, fingerprint, now, INTRUDER_BLOCK_THRESHOLD, INTRUDER_BLOCK_THRESHOLD),
            )
            return intruder_response_from_row(cur.fetchone())


def get_intruder_for_request(request: Request) -> IntruderFlagResponse | None:
    ip = request_ip(request)
    fingerprint = request_fingerprint(request)

    if USE_MEMORY_STORAGE:
        row = MEMORY_INTRUDERS.get(f"{ip}:{fingerprint}")
        return intruder_response_from_row(row) if row else None

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM intruder_flags WHERE ip = %s AND fingerprint = %s",
                (ip, fingerprint),
            )
            row = cur.fetchone()
            return intruder_response_from_row(row) if row else None


def unblock_intruder(intruder_id: str) -> IntruderFlagResponse | None:
    if USE_MEMORY_STORAGE:
        for row in MEMORY_INTRUDERS.values():
            if row["id"] == intruder_id:
                row["is_blocked"] = False
                row["attempts"] = 0
                row["blocked_at"] = None
                row["last_seen_at"] = datetime.now(timezone.utc)
                return intruder_response_from_row(row)
        return None

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE intruder_flags
                SET is_blocked = FALSE, attempts = 0, blocked_at = NULL, last_seen_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (intruder_id,),
            )
            row = cur.fetchone()
            return intruder_response_from_row(row) if row else None


def list_security_events(limit: int = 40, offset: int = 0) -> list[SecurityEventResponse]:
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    if USE_MEMORY_STORAGE:
        rows = sorted(MEMORY_SECURITY_EVENTS, key=lambda item: item["created_at"], reverse=True)
        return [event_response_from_row(row) for row in rows[offset : offset + limit]]

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM security_events
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                (limit, offset),
            )
            return [event_response_from_row(row) for row in cur.fetchall()]


def list_intruders() -> list[IntruderFlagResponse]:
    if USE_MEMORY_STORAGE:
        rows = sorted(MEMORY_INTRUDERS.values(), key=lambda item: item["last_seen_at"], reverse=True)
        return [intruder_response_from_row(row) for row in rows]

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM intruder_flags ORDER BY last_seen_at DESC")
            return [intruder_response_from_row(row) for row in cur.fetchall()]


def security_summary() -> SecuritySummaryResponse:
    events = list_security_events(limit=500)
    intruders = list_intruders()
    return SecuritySummaryResponse(
        events=len(events),
        warnings=sum(1 for event in events if event.severity == "warning"),
        critical=sum(1 for event in events if event.severity == "critical"),
        blocked_intruders=sum(1 for intruder in intruders if intruder.is_blocked),
        recent_events=events[:8],
    )


def require_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user.get("role") == "admin" or role_for_email(user["email"]) == "admin":
        return user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def assistant_context_response(row: dict[str, Any]) -> AssistantContextResponse:
    return AssistantContextResponse(
        id=str(row["id"]),
        title=row["title"],
        summary=row.get("summary") or "",
        created_at=isoformat(row["created_at"]),
        updated_at=isoformat(row["updated_at"]),
    )


def assistant_message_response(row: dict[str, Any]) -> AssistantMessageResponse:
    return AssistantMessageResponse(
        id=str(row["id"]),
        context_id=str(row["context_id"]),
        role=row["role"],
        content=sanitize_assistant_reply(row["content"]),
        provider=row["provider"],
        model=row["model"],
        created_at=isoformat(row["created_at"]),
    )


def auto_context_title(message: str) -> str:
    cleaned = normalize_text(message)
    if len(cleaned) <= 46:
        return cleaned or "New context"
    return cleaned[:43].rstrip() + "..."


def list_assistant_contexts_for_user(user_id: str) -> list[AssistantContextResponse]:
    if USE_MEMORY_ASSISTANT:
        rows = sorted(
            MEMORY_AI_CONTEXTS_BY_USER[user_id],
            key=lambda item: item["updated_at"],
            reverse=True,
        )
        return [assistant_context_response(row) for row in rows]

    with connect_assistant() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM ai_contexts
                WHERE user_id = %s
                ORDER BY updated_at DESC
                """,
                (user_id,),
            )
            return [assistant_context_response(row) for row in cur.fetchall()]


def create_assistant_context_for_user(user_id: str, title: str = "New context") -> AssistantContextResponse:
    now = datetime.now(timezone.utc)
    row = {
        "id": str(uuid4()),
        "user_id": user_id,
        "title": title,
        "summary": "",
        "created_at": now,
        "updated_at": now,
    }
    if USE_MEMORY_ASSISTANT:
        MEMORY_AI_CONTEXTS_BY_USER[user_id].append(row)
        MEMORY_AI_CONTEXTS_BY_ID[row["id"]] = row
        return assistant_context_response(row)

    with connect_assistant() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_contexts (id, user_id, title, summary, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (row["id"], user_id, title, "", now, now),
            )
            return assistant_context_response(cur.fetchone())


def get_assistant_context_for_user(user_id: str, context_id: str | None) -> AssistantContextResponse:
    contexts = list_assistant_contexts_for_user(user_id)
    if context_id is None:
        if contexts:
            return contexts[0]
        return create_assistant_context_for_user(user_id, "Main context")

    if USE_MEMORY_ASSISTANT:
        row = MEMORY_AI_CONTEXTS_BY_ID.get(context_id)
        if row and row["user_id"] == user_id:
            return assistant_context_response(row)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant context not found")

    with connect_assistant() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM ai_contexts WHERE id = %s AND user_id = %s",
                (context_id, user_id),
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant context not found")
            return assistant_context_response(row)


def update_assistant_context_for_user(user_id: str, context_id: str, title: str) -> AssistantContextResponse:
    now = datetime.now(timezone.utc)
    if USE_MEMORY_ASSISTANT:
        row = MEMORY_AI_CONTEXTS_BY_ID.get(context_id)
        if not row or row["user_id"] != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant context not found")
        row["title"] = title
        row["updated_at"] = now
        return assistant_context_response(row)

    with connect_assistant() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE ai_contexts
                SET title = %s, updated_at = %s
                WHERE id = %s AND user_id = %s
                RETURNING *
                """,
                (title, now, context_id, user_id),
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant context not found")
            return assistant_context_response(row)


def delete_assistant_context_for_user(user_id: str, context_id: str) -> None:
    if USE_MEMORY_ASSISTANT:
        row = MEMORY_AI_CONTEXTS_BY_ID.get(context_id)
        if not row or row["user_id"] != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant context not found")
        MEMORY_AI_CONTEXTS_BY_USER[user_id] = [item for item in MEMORY_AI_CONTEXTS_BY_USER[user_id] if item["id"] != context_id]
        MEMORY_AI_CONTEXTS_BY_ID.pop(context_id, None)
        MEMORY_AI_MESSAGES_BY_CONTEXT.pop(context_id, None)
        return

    with connect_assistant() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM ai_contexts WHERE id = %s AND user_id = %s RETURNING id",
                (context_id, user_id),
            )
            if cur.fetchone() is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant context not found")


def touch_assistant_context(user_id: str, context_id: str, title_from_message: str | None = None) -> None:
    now = datetime.now(timezone.utc)
    if USE_MEMORY_ASSISTANT:
        row = MEMORY_AI_CONTEXTS_BY_ID.get(context_id)
        if row and row["user_id"] == user_id:
            if title_from_message and row["title"] in {"Main context", "New context"}:
                row["title"] = auto_context_title(title_from_message)
            row["updated_at"] = now
        return

    with connect_assistant() as conn:
        with conn.cursor() as cur:
            if title_from_message:
                cur.execute(
                    """
                    UPDATE ai_contexts
                    SET title = CASE WHEN title IN ('Main context', 'New context') THEN %s ELSE title END,
                        updated_at = %s
                    WHERE id = %s AND user_id = %s
                    """,
                    (auto_context_title(title_from_message), now, context_id, user_id),
                )
            else:
                cur.execute(
                    "UPDATE ai_contexts SET updated_at = %s WHERE id = %s AND user_id = %s",
                    (now, context_id, user_id),
                )


def list_assistant_messages_for_user(
    user_id: str,
    context_id: str | None = None,
    limit: int = 80,
) -> list[AssistantMessageResponse]:
    limit = min(max(limit, 1), 120)
    context = get_assistant_context_for_user(user_id, context_id)
    if USE_MEMORY_ASSISTANT:
        rows = MEMORY_AI_MESSAGES_BY_CONTEXT[context.id][-limit:]
        return [assistant_message_response(row) for row in rows]

    with connect_assistant() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM ai_messages
                WHERE user_id = %s AND context_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, context.id, limit),
            )
            rows = list(reversed(cur.fetchall()))
            return [assistant_message_response(row) for row in rows]


def create_assistant_message_for_user(
    user_id: str,
    context_id: str,
    role: AssistantRole,
    content: str,
    provider: str = "gemini",
    model: str = GEMINI_MODEL,
) -> AssistantMessageResponse:
    row = {
        "id": str(uuid4()),
        "context_id": context_id,
        "user_id": user_id,
        "role": role,
        "content": sanitize_assistant_reply(content) if role == "assistant" else content,
        "provider": provider,
        "model": model,
        "created_at": datetime.now(timezone.utc),
    }

    if USE_MEMORY_ASSISTANT:
        MEMORY_AI_MESSAGES_BY_CONTEXT[context_id].append(row)
        touch_assistant_context(user_id, context_id, content if role == "user" else None)
        return assistant_message_response(row)

    with connect_assistant() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_messages (id, context_id, user_id, role, content, provider, model, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    row["id"],
                    context_id,
                    user_id,
                    role,
                    row["content"],
                    provider,
                    model,
                    row["created_at"],
                ),
            )
            saved = assistant_message_response(cur.fetchone())
    touch_assistant_context(user_id, context_id, content if role == "user" else None)
    return saved


def extract_assistant_lesson(message: str) -> str | None:
    cleaned = assert_chat_clean(message).strip()
    lowered = cleaned.lower()
    explicit_patterns = (
        r"^(?:запомни|запомнить|учти|сохрани|remember|save this|note this|recuerda|guarda)\s*[:,-]?\s*(.+)$",
        r"^(?:неправильно|нет|wrong|no|incorrecto|mal)\s*[:,-]?\s*(.+)$",
        r"^(?:лучше отвечай|отвечай|answer|responde)\s*[:,-]?\s*(.+)$",
    )
    for pattern in explicit_patterns:
        match = re.match(pattern, cleaned, flags=re.I)
        if match:
            lesson = normalize_text(match.group(1)).strip(" .,-:;")
            return lesson[:280] if len(lesson) >= 4 else None

    correction_markers = (
        "это неправильно",
        "ты ошибся",
        "в следующий раз",
        "не говори",
        "говори",
        "wrong",
        "you are wrong",
        "next time",
        "don't say",
        "do not say",
        "incorrecto",
        "te equivocas",
        "la próxima vez",
    )
    if any(marker in lowered for marker in correction_markers):
        return cleaned[:280]
    return None


def list_ai_lessons_for_user(user_id: str, limit: int = 10) -> list[str]:
    if USE_MEMORY_ASSISTANT:
        lessons = sorted(
            MEMORY_AI_LESSONS_BY_USER[user_id],
            key=lambda item: item["created_at"],
            reverse=True,
        )
        return [lesson["lesson"] for lesson in lessons[:limit]]

    with connect_assistant() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT lesson
                FROM ai_lessons
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            return [row["lesson"] for row in cur.fetchall()]


def save_ai_lesson_for_user(user_id: str, lesson: str, source_message_id: str | None = None) -> None:
    normalized = normalize_text(lesson)
    if len(normalized) < 4:
        return

    existing = {item.lower() for item in list_ai_lessons_for_user(user_id, 24)}
    if normalized.lower() in existing:
        return

    row = {
        "id": str(uuid4()),
        "user_id": user_id,
        "lesson": normalized[:280],
        "source_message_id": source_message_id,
        "created_at": datetime.now(timezone.utc),
    }
    if USE_MEMORY_ASSISTANT:
        MEMORY_AI_LESSONS_BY_USER[user_id].append(row)
        return

    with connect_assistant() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_lessons (id, user_id, lesson, source_message_id, created_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    row["id"],
                    user_id,
                    row["lesson"],
                    row["source_message_id"],
                    row["created_at"],
                ),
            )


def sanitize_assistant_reply(text: str) -> str:
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"__(.*?)__", r"\1", cleaned)
    cleaned = re.sub(r"^\s*[-*•]\s+", "", cleaned, flags=re.M)
    cleaned = re.sub(r"`{1,3}([^`]+)`{1,3}", r"\1", cleaned)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def local_day_key(value: str) -> str:
    return value[:10]


def build_assistant_app_context(user: dict[str, Any]) -> str:
    user_id = str(user["id"])
    today = datetime.now(timezone.utc).date()
    tomorrow = today + timedelta(days=1)
    meals = list_meals_for_user(user_id)
    today_meals = [meal for meal in meals if local_day_key(meal.logged_at) == today.isoformat()]
    upcoming_events = list_calendar_events_for_user(user_id, today, today + timedelta(days=14))
    lessons = list_ai_lessons_for_user(user_id)

    calories_logged = sum(meal.calories for meal in today_meals)
    lines = [
        "Private app context for this account. Use it to answer personally. Do not claim you cannot see the diary/profile/calendar when the data is listed here.",
        f"Today date: {today.isoformat()}",
        f"Tomorrow date: {tomorrow.isoformat()}",
        f"User: {user['name']}",
        f"Email: {user['email']}",
        f"Daily calorie goal: {user['calorie_goal']} kcal",
        f"Activity level: {user['activity_level']}",
        f"Today calories logged: {calories_logged} kcal",
        f"Today remaining calories: {max(int(user['calorie_goal']) - calories_logged, 0)} kcal",
    ]
    if today_meals:
        lines.append("Meals logged today:")
        for meal in today_meals[:12]:
            lines.append(
                f"- {meal.meal_slot}: {meal.food.name}, {meal.calories} kcal, "
                f"P {meal.protein_g}g, C {meal.carbs_g}g, F {meal.fat_g}g"
            )
    else:
        lines.append("Meals logged today: none")

    if upcoming_events:
        lines.append("Calendar plans for today and next 14 days:")
        for event in upcoming_events[:16]:
            time_label = event.scheduled_time or "all day"
            lines.append(
                f"- {event.scheduled_date} {time_label}: {event.title} "
                f"({event.event_type}, {event.status})"
            )
    else:
        lines.append("Calendar plans: none for the next 14 days")

    if lessons:
        lines.append("Assistant lessons learned from this user. Follow these before generic style:")
        for lesson in lessons:
            lines.append(f"- {lesson}")
    else:
        lines.append("Assistant lessons learned from this user: none yet")
    return "\n".join(lines)


def assistant_calendar_intent(message: str) -> CalendarEventCreateRequest | None:
    text = normalize_text(message)
    lowered = text.lower()
    action_words = (
        "add",
        "create",
        "remind",
        "calendar",
        "plan",
        "добав",
        "календар",
        "напом",
        "замет",
        "заплан",
        "añade",
        "agrega",
        "calendario",
        "record",
        "planifica",
    )
    if not any(word in lowered for word in action_words):
        return None

    scheduled_date = datetime.now(timezone.utc).date()
    if re.search(r"\b(tomorrow|mañana|завтра)\b", lowered):
        scheduled_date += timedelta(days=1)

    time_match = re.search(
        r"(?:\b(?:at|в|a las)\s*)?([01]?\d|2[0-3])(?:[:.](\d{2}))?\b",
        lowered,
    )
    scheduled_time = None
    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2) or "00")
        if 0 <= minute <= 59:
            scheduled_time = f"{hour:02d}:{minute:02d}"

    title = text
    cleanup_patterns = [
        r"^(?:add|create|remind me to|put|plan|calendar)\s+",
        r"^(?:добавь|добавить|создай|запланируй|напомни|поставь)\s+",
        r"^(?:añade|agrega|crea|recuérdame|planifica)\s+",
        r"\b(?:note|заметку|заметка|nota)\b",
        r"\b(?:to|в|на|in|into|al)\s+(?:my\s+)?(?:calendar|календарь|calendario)\b",
        r"\b(?:today|сегодня|hoy|tomorrow|завтра|mañana)\b",
        r"\b(?:at|в|a las)\s*(?:[01]?\d|2[0-3])(?::\d{2})?\b",
    ]
    for pattern in cleanup_patterns:
        title = re.sub(pattern, " ", title, flags=re.I)
    title = normalize_text(title).strip(" .,-:;")
    if not title:
        title = "Plan from Assistant"
    title = title[:120]

    if scheduled_time is None and not any(word in lowered for word in ("note", "замет", "nota")):
        return None

    return CalendarEventCreateRequest(
        event_type="note",
        title=title,
        scheduled_date=scheduled_date,
        scheduled_time=scheduled_time,
        status="planned",
        accent="#2bb673",
    )


ASSISTANT_SYSTEM_PROMPT = (
    "You are TrackFood AI, a sharp nutrition and planning assistant inside a food tracker. "
    "You are multilingual: answer in the same language the user uses, especially English, Russian, or Spanish. "
    "If the user mixes languages, follow the dominant language or the language they explicitly request. "
    "Your voice is direct, simple, human, and a little distinctive. Do not sound like a generic polite chatbot. "
    "No long apologies, no corporate filler, no 'as an AI language model', no motivational fluff. "
    "Help with meal ideas, product choices, diary reflection, calendar planning, and habit building. "
    "You can use the private app context supplied by the backend: profile, calorie goal, meals, and calendar plans. "
    "When the user asks what they ate, how much is left, or what to eat next, use the listed diary totals and meal names directly. "
    "For nutrition estimates, always name the assumption: grams, serving, or package. If grams are missing, ask one short clarification or propose a realistic default and say it should be confirmed in the app. "
    "When useful, suggest concrete app actions like add to diary, edit grams, create a reminder, or duplicate a recent meal. "
    "If a calendar action was completed by the backend, clearly say it was added and mention the date/time. "
    "If the user corrects you or says remember/запомни/recuerda, treat that as a lesson for future replies. "
    "Preferred structure: answer first, then 'What to do now:' with one or two concrete actions when useful. "
    "Do not diagnose, treat, or replace medical advice. Keep answers practical and safe. "
    "Write clean plain text only: no Markdown, no asterisks, no bold markers, no bullet glyphs. "
    "Use short paragraphs, clear labels, and numbered steps only when they make the answer easier to scan. "
    "Keep most answers under 130 words unless the user asks for a detailed plan."
)


def generate_assistant_reply(
    messages: list[AssistantMessageResponse],
    app_context: str,
    action_note: str = "",
) -> str:
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI key is not configured",
        )

    contents = [
        {
            "role": "model" if message.role == "assistant" else "user",
            "parts": [{"text": message.content}],
        }
        for message in messages[-12:]
    ]
    system_parts = [{"text": ASSISTANT_SYSTEM_PROMPT}, {"text": app_context}]
    if action_note:
        system_parts.append({"text": action_note})

    payload = {
        "systemInstruction": {"parts": system_parts},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.45,
            "topP": 0.86,
            "maxOutputTokens": 520,
        },
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

    try:
        with httpx.Client(timeout=22.0, trust_env=False) as client:
            response = client.post(
                url,
                headers={
                    "x-goog-api-key": GEMINI_API_KEY,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider request failed",
        ) from exc

    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "\n".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned an empty reply",
        )
    return sanitize_assistant_reply(text)


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
    allow_origin_regex=os.getenv(
        "CORS_ORIGIN_REGEX",
        r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}):3000",
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def harden_requests(request: Request, call_next):
    intruder = get_intruder_for_request(request)
    if intruder and intruder.is_blocked:
        if is_local_dev_request(request):
            unblock_intruder(intruder.id)
        else:
            log_security_event(
                "blocked_request",
                "critical",
                request,
                details="Blocked request from flagged fingerprint",
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Request blocked"},
            )

    intruder = None
    if not is_local_dev_request(request):
        intruder = get_intruder_for_request(request)
    if intruder and intruder.is_blocked:
        log_security_event(
            "blocked_request",
            "critical",
            request,
            details="Blocked request from flagged fingerprint",
        )
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Request blocked"},
        )

    suspicious_surface = " ".join(
        [
            request.url.path,
            request.url.query,
            request.headers.get("user-agent", ""),
            request.headers.get("referer", ""),
        ]
    )
    if any(pattern.search(suspicious_surface) for pattern in DANGEROUS_PATTERNS):
        flag_intruder(request)
        log_security_event(
            "suspicious_request",
            "warning",
            request,
            details="Suspicious request signature detected",
        )

    client = request_ip(request)
    key = f"{client}:{request.url.path}"
    current_time = time.monotonic()
    bucket = RATE_BUCKETS[key]

    while bucket and current_time - bucket[0] > 60:
        bucket.popleft()

    limit = AUTH_REQUESTS_PER_MINUTE if request.url.path.startswith("/api/v1/auth/") else MAX_REQUESTS_PER_MINUTE
    if len(bucket) >= limit:
        flag_intruder(request)
        log_security_event("rate_limited", "warning", request, details=f"Limit {limit}/minute exceeded")
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
    if response.status_code in {401, 403} and request.url.path.startswith("/api/v1/auth/"):
        flag_intruder(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "img-src 'self' data: https://fastapi.tiangolo.com; "
        "frame-ancestors 'none'"
    )
    return response


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs", status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@app.get("/api/v1/root", tags=["App"])
def root_payload() -> dict[str, str]:
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
            "bcrypt password hashing",
            "rate limiting",
            "body size limit",
            "security headers",
            "input validation",
            "intruder tracking",
            "security audit logs",
        ],
    )


@app.get("/api/v1/foods", response_model=list[FoodItem], tags=["Nutrition"])
def list_foods(
    q: Annotated[str, Query(max_length=120)] = "",
    store: Annotated[str, Query(max_length=80)] = "",
    limit: Annotated[int, Query(ge=1, le=1000)] = 1000,
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
def login(payload: LoginRequest, request: Request) -> AuthResponse:
    user = get_user_by_email(payload.email)
    if user is None or not verify_password(
        payload.password,
        user["salt"],
        user["password_hash"],
        user.get("password_scheme"),
    ):
        log_security_event(
            "auth_login_failed",
            "warning",
            request,
            details=f"Failed login for {payload.email}",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.get("password_scheme") != "bcrypt":
        update_user_password_hash(str(user["id"]), payload.password)
        user = get_user_by_email(payload.email) or user

    log_security_event("auth_login_success", "info", request, str(user["id"]))
    return AuthResponse(token=issue_token(user), profile=to_public_profile(user))


@app.get("/api/v1/profile", response_model=PublicProfile, tags=["Profile"])
def get_profile(user: dict[str, Any] = Depends(get_current_user)) -> PublicProfile:
    return to_public_profile(user)


@app.patch("/api/v1/profile", response_model=PublicProfile, tags=["Profile"])
def update_profile(
    payload: ProfileUpdateRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> PublicProfile:
    return to_public_profile(update_user_profile(str(user["id"]), payload))


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


@app.get(
    "/api/v1/assistant/contexts",
    response_model=list[AssistantContextResponse],
    tags=["Assistant"],
)
def list_assistant_contexts(
    user: dict[str, Any] = Depends(get_current_user),
) -> list[AssistantContextResponse]:
    contexts = list_assistant_contexts_for_user(str(user["id"]))
    if not contexts:
        return [create_assistant_context_for_user(str(user["id"]), "Main context")]
    return contexts


@app.post(
    "/api/v1/assistant/contexts",
    response_model=AssistantContextResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Assistant"],
)
def create_assistant_context(
    payload: AssistantContextCreateRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> AssistantContextResponse:
    return create_assistant_context_for_user(str(user["id"]), payload.title)


@app.patch(
    "/api/v1/assistant/contexts/{context_id}",
    response_model=AssistantContextResponse,
    tags=["Assistant"],
)
def update_assistant_context(
    context_id: str,
    payload: AssistantContextUpdateRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> AssistantContextResponse:
    return update_assistant_context_for_user(str(user["id"]), context_id, payload.title)


@app.delete(
    "/api/v1/assistant/contexts/{context_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Assistant"],
)
def delete_assistant_context(
    context_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> None:
    delete_assistant_context_for_user(str(user["id"]), context_id)


@app.get(
    "/api/v1/assistant/messages",
    response_model=list[AssistantMessageResponse],
    tags=["Assistant"],
)
def list_assistant_messages(
    context_id: str | None = None,
    user: dict[str, Any] = Depends(get_current_user),
) -> list[AssistantMessageResponse]:
    return list_assistant_messages_for_user(str(user["id"]), context_id=context_id)


@app.post(
    "/api/v1/assistant/messages",
    response_model=AssistantMessageResponse,
    tags=["Assistant"],
)
def create_assistant_message(
    payload: AssistantMessageCreateRequest,
    request: Request,
    user: dict[str, Any] = Depends(get_current_user),
) -> AssistantMessageResponse:
    user_id = str(user["id"])
    context = get_assistant_context_for_user(user_id, payload.context_id)
    existing = list_assistant_messages_for_user(user_id, context_id=context.id)
    user_message = create_assistant_message_for_user(user_id, context.id, "user", payload.message)
    learned_lesson = extract_assistant_lesson(payload.message)
    if learned_lesson:
        save_ai_lesson_for_user(user_id, learned_lesson, user_message.id)
        log_security_event("assistant_lesson_saved", "info", request, user_id, "Assistant lesson saved")
    action_note = ""
    calendar_payload = assistant_calendar_intent(payload.message)
    if calendar_payload is not None:
        created_event = create_calendar_event_for_user(user_id, calendar_payload)
        action_note = (
            "Backend action completed: a calendar note was added. "
            f"Title: {created_event.title}. Date: {created_event.scheduled_date}. "
            f"Time: {created_event.scheduled_time or 'all day'}."
        )

    reply = generate_assistant_reply(
        [*existing, user_message],
        build_assistant_app_context(user),
        action_note,
    )
    assistant_message = create_assistant_message_for_user(user_id, context.id, "assistant", reply)
    log_security_event("assistant_message", "info", request, user_id, "Assistant reply generated")
    return assistant_message


@app.get("/api/v1/security/summary", response_model=SecuritySummaryResponse, tags=["Security"])
def get_security_summary(_: dict[str, Any] = Depends(require_admin)) -> SecuritySummaryResponse:
    return security_summary()


@app.get(
    "/api/v1/security/events",
    response_model=list[SecurityEventResponse],
    tags=["Security"],
)
def get_security_events(
    limit: Annotated[int, Query(ge=1, le=100)] = 40,
    offset: Annotated[int, Query(ge=0)] = 0,
    _: dict[str, Any] = Depends(require_admin),
) -> list[SecurityEventResponse]:
    return list_security_events(limit, offset)


@app.get(
    "/api/v1/security/intruders",
    response_model=list[IntruderFlagResponse],
    tags=["Security"],
)
def get_security_intruders(
    _: dict[str, Any] = Depends(require_admin),
) -> list[IntruderFlagResponse]:
    return list_intruders()


@app.post(
    "/api/v1/security/intruders/{intruder_id}/unblock",
    response_model=IntruderFlagResponse,
    tags=["Security"],
)
def unblock_security_intruder(
    intruder_id: str,
    _: dict[str, Any] = Depends(require_admin),
) -> IntruderFlagResponse:
    intruder = unblock_intruder(intruder_id)
    if intruder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intruder not found")
    return intruder


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


@app.patch("/api/v1/meals/{meal_id}", response_model=MealLogResponse, tags=["Meals"])
def update_meal(
    meal_id: str,
    payload: MealUpdateRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> MealLogResponse:
    meal = update_meal_for_user(str(user["id"]), meal_id, payload)
    if meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal log not found",
        )
    return meal


@app.post(
    "/api/v1/meals/{meal_id}/duplicate",
    response_model=MealLogResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Meals"],
)
def duplicate_meal(
    meal_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> MealLogResponse:
    meal = duplicate_meal_for_user(str(user["id"]), meal_id)
    if meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal log not found",
        )
    return meal


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
