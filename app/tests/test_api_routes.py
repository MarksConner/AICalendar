import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import get_db
from app.db import SessionLocal
from app.api.users import get_current_user

@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def authenticated_user():
    class FakeUser:
        user_id = "test-user-id"
        email = "test@example.com"
    return FakeUser()

@pytest.fixture
def client(db_session, authenticated_user):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: authenticated_user
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

import pytest
from unittest.mock import patch

from unittest.mock import patch

def test_get_day_hints_route(client):
    fake_result = [
        "Available from 10:00 to 12:00.",
        "Avoid conflicts with existing meetings.",
        "Best time to schedule is late morning."
    ]

    with patch("app.api.calendar.day_scheduling_hints", return_value=fake_result):
        response = client.get("/calendar/day-hints", params={
            "date": "2026-04-08",
            "calendar_id": "11111111-1111-1111-1111-111111111111",
            "startTime": "09:00",
            "endTime": "17:00",
            "durationMinutes": 60
        })

    assert response.status_code == 200
    data = response.json()
    assert "hints" in data
    assert isinstance(data["hints"], list)
    assert len(data["hints"]) > 0