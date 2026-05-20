from __future__ import annotations

import os

os.environ["DATABASE_URL"] = "memory://test"
os.environ["SECRET_KEY"] = "trackfoodai-test-secret-with-enough-length"
os.environ["TRACKFOODAI_ADMIN_EMAILS"] = "admin@example.com"
os.environ["GEMINI_API_KEY"] = ""

from fastapi.testclient import TestClient

from app.main import (
    MEMORY_USERS_BY_EMAIL,
    MEMORY_USERS_BY_ID,
    app,
    build_assistant_app_context,
    extract_assistant_lesson,
    hash_password_legacy,
    list_ai_lessons_for_user,
    now_iso,
)


def test_health_and_foods() -> None:
    with TestClient(app) as client:
        root = client.get("/", follow_redirects=False)
        assert root.status_code == 307
        assert root.headers["location"] == "/docs"

        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["status"] == "ok"
        assert health.json()["products"] >= 5

        foods = client.get("/api/v1/foods")
        assert foods.status_code == 200
        assert len(foods.json()) >= 5

        search = client.get("/api/v1/foods?q=yogurt&limit=3")
        assert search.status_code == 200
        assert search.json()[0]["id"] == "yogurt-berries"

        page = client.get("/api/v1/foods?limit=2&offset=2")
        assert page.status_code == 200
        assert len(page.json()) == 2


def test_auth_meal_log_and_delete() -> None:
    with TestClient(app) as client:
        register = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Nika Stone",
                "email": "nika@example.com",
                "password": "LocalPass123",
                "calorie_goal": 1900,
                "activity_level": "balanced",
            },
        )
        assert register.status_code == 201
        assert register.json()["profile"]["role"] == "user"
        token = register.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        meal = client.post(
            "/api/v1/meals",
            json={
                "food_id": "chicken-bowl",
                "meal_slot": "lunch",
                "serving_multiplier": 1,
            },
            headers=headers,
        )
        assert meal.status_code == 201
        assert meal.json()["meal_slot"] == "lunch"
        meal_id = meal.json()["id"]

        meals = client.get("/api/v1/meals", headers=headers)
        assert meals.status_code == 200
        assert len(meals.json()) == 1

        profile = client.patch(
            "/api/v1/profile",
            json={
                "phone_number": "+34 600 100 200",
                "avatar_data_url": "data:image/png;base64,abc123",
                "calorie_goal": 2100,
            },
            headers=headers,
        )
        assert profile.status_code == 200
        assert profile.json()["phone_number"] == "+34 600 100 200"
        assert profile.json()["calorie_goal"] == 2100

        deleted = client.delete(f"/api/v1/meals/{meal_id}", headers=headers)
        assert deleted.status_code == 200
        assert deleted.json()["status"] == "deleted"


def test_admin_security_and_legacy_password_migration() -> None:
    with TestClient(app) as client:
        admin = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Admin User",
                "email": "admin@example.com",
                "password": "LocalPass123",
                "calorie_goal": 1900,
                "activity_level": "balanced",
            },
        )
        assert admin.status_code == 201
        assert admin.json()["profile"]["role"] == "admin"
        admin_headers = {"Authorization": f"Bearer {admin.json()['token']}"}

        normal = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Regular User",
                "email": "regular@example.com",
                "password": "LocalPass123",
                "calorie_goal": 1900,
                "activity_level": "balanced",
            },
        )
        normal_headers = {"Authorization": f"Bearer {normal.json()['token']}"}
        forbidden = client.get("/api/v1/security/summary", headers=normal_headers)
        assert forbidden.status_code == 403

        failed = client.post(
            "/api/v1/auth/login",
            json={"email": "regular@example.com", "password": "WrongPass123"},
        )
        assert failed.status_code == 401

        summary = client.get("/api/v1/security/summary", headers=admin_headers)
        assert summary.status_code == 200
        assert summary.json()["warnings"] >= 1

        salt, legacy_hash = hash_password_legacy("LegacyPass123")
        legacy_user = {
            "id": "legacy-user-id",
            "name": "Legacy User",
            "email": "legacy@example.com",
            "phone_number": None,
            "avatar_data_url": None,
            "password_hash": legacy_hash,
            "salt": salt,
            "password_scheme": "pbkdf2",
            "calorie_goal": 1800,
            "activity_level": "balanced",
            "role": "user",
            "created_at": now_iso(),
        }
        MEMORY_USERS_BY_EMAIL[legacy_user["email"]] = legacy_user
        MEMORY_USERS_BY_ID[legacy_user["id"]] = legacy_user
        migrated = client.post(
            "/api/v1/auth/login",
            json={"email": "legacy@example.com", "password": "LegacyPass123"},
        )
        assert migrated.status_code == 200
        assert MEMORY_USERS_BY_ID["legacy-user-id"]["password_scheme"] == "bcrypt"


def test_assistant_requires_configured_key() -> None:
    with TestClient(app) as client:
        register = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Assistant User",
                "email": "assistant@example.com",
                "password": "LocalPass123",
                "calorie_goal": 1900,
                "activity_level": "balanced",
            },
        )
        headers = {"Authorization": f"Bearer {register.json()['token']}"}
        empty = client.get("/api/v1/assistant/messages", headers=headers)
        assert empty.status_code == 200
        assert empty.json() == []

        chat = client.post(
            "/api/v1/assistant/messages",
            json={"message": "What should I eat after training?"},
            headers=headers,
        )
        assert chat.status_code == 503
        assert chat.json()["detail"] == "AI key is not configured"


def test_assistant_learns_user_corrections_without_provider_key() -> None:
    assert extract_assistant_lesson("запомни: отвечай короче и без лишней вежливости") == (
        "отвечай короче и без лишней вежливости"
    )

    with TestClient(app) as client:
        register = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Coach User",
                "email": "coach@example.com",
                "password": "LocalPass123",
                "calorie_goal": 1900,
                "activity_level": "balanced",
            },
        )
        payload = register.json()
        headers = {"Authorization": f"Bearer {payload['token']}"}
        chat = client.post(
            "/api/v1/assistant/messages",
            json={"message": "запомни: отвечай короче и без лишней вежливости"},
            headers=headers,
        )
        assert chat.status_code == 503
        lessons = list_ai_lessons_for_user(payload["profile"]["id"])
        assert lessons == ["отвечай короче и без лишней вежливости"]
        app_context = build_assistant_app_context(MEMORY_USERS_BY_ID[payload["profile"]["id"]])
        assert "Assistant lessons learned from this user" in app_context
        assert "отвечай короче" in app_context


def test_nutrition_estimate() -> None:
    with TestClient(app) as client:
        estimate = client.post(
            "/api/v1/nutrition/estimate",
            json={"description": "Greek yogurt with berries and honey"},
        )
        assert estimate.status_code == 200
        payload = estimate.json()
        assert payload["food_id"] == "yogurt-berries"
        assert payload["calories"] > 0


def test_calendar_events_are_private_to_account() -> None:
    with TestClient(app) as client:
        first = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Calendar One",
                "email": "calendar-one@example.com",
                "password": "LocalPass123",
                "calorie_goal": 1900,
                "activity_level": "balanced",
            },
        )
        second = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Calendar Two",
                "email": "calendar-two@example.com",
                "password": "LocalPass123",
                "calorie_goal": 1900,
                "activity_level": "balanced",
            },
        )
        first_headers = {"Authorization": f"Bearer {first.json()['token']}"}
        second_headers = {"Authorization": f"Bearer {second.json()['token']}"}

        created = client.post(
            "/api/v1/calendar/events",
            json={
                "event_type": "training",
                "title": "Push day",
                "scheduled_date": "2026-05-02",
                "scheduled_time": "18:30",
                "accent": "#4f86f7",
            },
            headers=first_headers,
        )
        assert created.status_code == 201
        event_id = created.json()["id"]

        updated = client.patch(
            f"/api/v1/calendar/events/{event_id}",
            json={"status": "done"},
            headers=first_headers,
        )
        assert updated.status_code == 200
        assert updated.json()["status"] == "done"

        first_events = client.get(
            "/api/v1/calendar/events?date_from=2026-05-01&date_to=2026-05-31",
            headers=first_headers,
        )
        second_events = client.get(
            "/api/v1/calendar/events?date_from=2026-05-01&date_to=2026-05-31",
            headers=second_headers,
        )
        assert len(first_events.json()) == 1
        assert second_events.json() == []

        deleted = client.delete(
            f"/api/v1/calendar/events/{event_id}",
            headers=first_headers,
        )
        assert deleted.status_code == 200
