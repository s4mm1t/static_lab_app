from __future__ import annotations

import os

os.environ["DATABASE_URL"] = "memory://test"
os.environ["SECRET_KEY"] = "trackfoodai-test-secret-with-enough-length"

from fastapi.testclient import TestClient

from app.main import app


def test_health_and_foods() -> None:
    with TestClient(app) as client:
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

        deleted = client.delete(f"/api/v1/meals/{meal_id}", headers=headers)
        assert deleted.status_code == 200
        assert deleted.json()["status"] == "deleted"


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
