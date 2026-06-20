from __future__ import annotations

import os

os.environ["DATABASE_URL"] = "memory://test"
os.environ["SECRET_KEY"] = "trackfoodai-test-secret-with-enough-length"
os.environ["STATIC_LAB_ADMIN_EMAILS"] = "admin@example.com"
os.environ["GEMINI_API_KEY"] = ""

from fastapi.testclient import TestClient

import app.main as main
from app.main import (
    MEMORY_FOODS,
    MEMORY_USERS_BY_EMAIL,
    MEMORY_USERS_BY_ID,
    AssistantMessageResponse,
    assistant_add_previous_suggestion_action,
    assistant_calendar_intent,
    assistant_food_log_action,
    assistant_relevant_products_context,
    assistant_system_parts,
    app,
    build_assistant_app_context,
    extract_assistant_lesson,
    hash_password_legacy,
    list_ai_lessons_for_user,
    localize_assistant_reply,
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

        status = client.get("/api/v1/status")
        assert status.status_code == 200
        assert status.json()["ai_provider_configured"] is False
        assert status.json()["ai_model"]
        assert status.json()["environment"] == "local"
        assert status.json()["deployment_platform"] == "local"
        assert status.json()["deployment_commit"] is None
        assert status.json()["deployment_ready"] is False
        assert any("GEMINI_API_KEY" in warning for warning in status.json()["warnings"])

        foods = client.get("/api/v1/foods")
        assert foods.status_code == 200
        assert len(foods.json()) >= 5

        search = client.get("/api/v1/foods?q=yogurt&limit=3")
        assert search.status_code == 200
        assert search.json()[0]["id"] == "yogurt-berries"

        page = client.get("/api/v1/foods?limit=2&offset=2")
        assert page.status_code == 200
        assert len(page.json()) == 2

        MEMORY_FOODS["yogurt-berries"].barcode = "1234567890123"
        barcode = client.get("/api/v1/foods/barcode/1234567890123")
        assert barcode.status_code == 200
        assert barcode.json()["id"] == "yogurt-berries"

        missing_barcode = client.get("/api/v1/foods/barcode/000")
        assert missing_barcode.status_code == 404


def test_turso_product_source_mapping(monkeypatch) -> None:
    turso_row = {
        "id": "alcampo:3544057918",
        "store": "alcampo",
        "external_id": "3544057918",
        "name": "DANONE Yogur con sabor a limón 4 x 120 g",
        "brand": "DANONE",
        "image_url": "https://example.com/yogur.jpg",
        "price": 0.94,
        "currency": "EUR",
        "package_subtitle": "4 x 120 g",
        "calories": 300,
        "protein": 3,
        "fat": 2.2,
        "carbs": 10,
        "fiber": None,
        "nutrition_basis": "per 100 g",
        "nutrition_basis_unit": "g",
        "breadcrumb_path": "Yogures",
        "barcode": "8410000000000",
    }

    def fake_turso_execute(sql: str) -> list[dict[str, object]]:
        if "COUNT(*)" in sql:
            return [{"count": 28364}]
        return [turso_row]

    monkeypatch.setattr(main, "USE_TURSO_PRODUCTS", True)
    monkeypatch.setattr(main, "turso_execute", fake_turso_execute)

    assert main.count_foods() == 28364
    foods = main.list_foods_from_storage(q="danone limon", limit=1)
    assert foods[0].id == "alcampo:3544057918"
    assert foods[0].source == "turso"
    assert foods[0].price == 0.94
    assert main.get_food_by_barcode("8410000000000").name.startswith("Yogur")


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
                "weight_kg": 74,
                "height_cm": 181,
                "diet_type": "muscle",
            },
        )
        assert register.status_code == 201
        assert register.json()["profile"]["role"] == "user"
        assert register.json()["profile"]["weight_kg"] == 74
        assert register.json()["profile"]["height_cm"] == 181
        assert register.json()["profile"]["diet_type"] == "muscle"
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
        context = build_assistant_app_context(MEMORY_USERS_BY_ID[register.json()["profile"]["id"]])
        assert "Weight: 74" in context
        assert "Height: 181" in context
        assert "Diet type: muscle" in context

        deleted = client.delete(f"/api/v1/meals/{meal_id}", headers=headers)
        assert deleted.status_code == 200
        assert deleted.json()["status"] == "deleted"


def test_image_analysis_contract_requires_auth_and_returns_structured_fallback() -> None:
    with TestClient(app) as client:
        unauth = client.post(
            "/api/v1/nutrition/analyze-image",
            json={"image_data_url": "data:image/png;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "notes": "yogurt"},
        )
        assert unauth.status_code == 401

        register = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Vision User",
                "email": "vision@example.com",
                "password": "LocalPass123",
                "calorie_goal": 1900,
                "activity_level": "balanced",
            },
        )
        headers = {"Authorization": f"Bearer {register.json()['token']}"}
        response = client.post(
            "/api/v1/nutrition/analyze-image",
            json={
                "image_data_url": "data:image/png;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                "notes": "yogurt with berries",
                "locale": "ru",
            },
            headers=headers,
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["needs_confirmation"] is True
        assert payload["provider"] == "static_lab_fallback"
        assert payload["items"]
        assert payload["total"]["calories"] >= 0


def test_auth_validation_errors_are_strings() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Nika Stone",
                "email": "nika@example.com",
                "password": "short",
                "calorie_goal": 1900,
                "activity_level": "balanced",
            },
        )
        assert response.status_code == 422
        assert response.json()["detail"] == "Password must be at least 8 characters."


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


def test_assistant_falls_back_to_local_context_without_provider_key() -> None:
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
            json={
                "message": "Что мне съесть после тренировки?",
                "client_context": (
                    "Today totals in mobile UI: 185 kcal, protein 14g, carbs 22g, fat 5g\n"
                    "Today remaining in mobile UI: 1915 kcal\n"
                    "goal 2100 kcal"
                ),
            },
            headers=headers,
        )
        assert chat.status_code == 200
        payload = chat.json()
        assert payload["role"] == "assistant"
        assert "ключ" not in payload["content"].lower()
        assert "дневник" in payload["content"].lower()
        assert "185 kcal" in payload["content"]
        assert "1915 kcal" in payload["content"]


def test_assistant_fallback_answers_workout_request_in_user_language() -> None:
    with TestClient(app) as client:
        register = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Workout User",
                "email": "workout@example.com",
                "password": "LocalPass123",
                "calorie_goal": 2100,
                "activity_level": "active",
                "diet_type": "muscle",
            },
        )
        headers = {"Authorization": f"Bearer {register.json()['token']}"}
        chat = client.post(
            "/api/v1/assistant/messages",
            json={
                "message": "что съесть после тренировки?",
                "client_context": (
                    "Today totals in mobile UI: 185 kcal, protein 14g, carbs 22g, fat 5g\n"
                    "Today remaining in mobile UI: 1915 kcal\n"
                    "goal 2100 kcal"
                ),
            },
            headers=headers,
        )

        assert chat.status_code == 200
        content = chat.json()["content"].lower()
        assert "после тренировки" in content
        assert "белок" in content
        assert "1915 kcal" in content
        assert "what to do now" not in content


def test_assistant_system_parts_include_agents_md(monkeypatch, tmp_path) -> None:
    agent_file = tmp_path / "AGENTS.md"
    agent_file.write_text("SPECIAL AGENT RULE", encoding="utf-8")
    monkeypatch.setattr("app.main.AGENT_INSTRUCTIONS_PATH", agent_file)

    parts = assistant_system_parts("private context", "action completed")
    text = "\n".join(part["text"] for part in parts)

    assert "SPECIAL AGENT RULE" in text
    assert "private context" in text
    assert "action completed" in text


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
        assert chat.status_code == 200
        lessons = list_ai_lessons_for_user(payload["profile"]["id"])
        assert lessons == ["отвечай короче и без лишней вежливости"]
        app_context = build_assistant_app_context(MEMORY_USERS_BY_ID[payload["profile"]["id"]])
        assert "Assistant lessons learned from this user" in app_context
        assert "отвечай короче" in app_context


def test_assistant_cleans_calendar_title_to_core_action() -> None:
    payload = assistant_calendar_intent("можешь пометить в календаре что в 18 мне нужно уйти в зал")
    assert payload is not None
    assert payload.title == "уйти в зал"
    assert payload.scheduled_time == "18:00"

    english_payload = assistant_calendar_intent("add to calendar at 18:30 gym")
    assert english_payload is not None
    assert english_payload.title == "gym"
    assert english_payload.scheduled_time == "18:30"


def test_assistant_can_log_food_without_provider_key() -> None:
    with TestClient(app) as client:
        register = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Action User",
                "email": "action-user@example.com",
                "password": "LocalPass123",
                "calorie_goal": 1900,
                "activity_level": "balanced",
            },
        )
        user_id = register.json()["profile"]["id"]
        reply = assistant_food_log_action(user_id, "add 100g chicken rice bowl to lunch")

        assert reply is not None
        assert "Added to your diary" in reply

        headers = {"Authorization": f"Bearer {register.json()['token']}"}
        meals = client.get("/api/v1/meals", headers=headers)
        assert meals.status_code == 200
        assert len(meals.json()) == 1
        assert meals.json()[0]["meal_slot"] == "lunch"

        no_action = assistant_food_log_action(user_id, "дай совет для завтрака без добавления в дневник")
        assert no_action is None


def test_assistant_product_context_and_language_cleanup() -> None:
    context = assistant_relevant_products_context("йоу что вкусного поесть на 20 евро")
    assert "Relevant product database matches" in context
    assert "kcal" in context
    assert "price:" in context

    reply = localize_assistant_reply("Вот идея.\n\nWhat to do now:\nPick one.", "ru")
    assert "Что дальше:" in reply
    assert "What to do now" not in reply


def test_assistant_adds_previous_suggestion_to_diary() -> None:
    with TestClient(app) as client:
        register = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Followup User",
                "email": "followup@example.com",
                "password": "LocalPass123",
                "calorie_goal": 1900,
                "activity_level": "balanced",
            },
        )
        user_id = register.json()["profile"]["id"]
        previous = AssistantMessageResponse(
            id="assistant-suggestion",
            context_id="ctx",
            role="assistant",
            content=(
                "Возьми Chicken rice bowl из static_lab (612 kcal).\n"
                "К ним добавь Greek yogurt berries (238 kcal).\n"
                "Итого: 850 kcal."
            ),
            provider="test",
            model="test",
            created_at=now_iso(),
        )

        reply = assistant_add_previous_suggestion_action(
            user_id,
            "сам посчитай сколько нужно и впихни то что ты написал до этого",
            [previous],
        )

        assert reply is not None
        assert "Добавил в дневник" in reply

        headers = {"Authorization": f"Bearer {register.json()['token']}"}
        meals = client.get("/api/v1/meals", headers=headers)
        assert meals.status_code == 200
        assert len(meals.json()) == 2


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
