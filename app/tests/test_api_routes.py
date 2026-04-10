import pytest
from unittest.mock import patch
from datetime import datetime
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.db import SessionLocal
from app.models.users import Users
from app.api.base_model_classes import CalendarCreate, EventCreate
from app.config import get_current_user


# Tests all api functions (integration test)


# Creates database session for inserting test user
@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# Creates authenticated user in database so foreign keys are valid
@pytest.fixture
def authenticated_user(db_session):
    user = Users(
        user_id=uuid4(),
        email=f"test_{uuid4().hex[:8]}@example.com",
        username=f"user_{uuid4().hex[:8]}",
        first_name="Test",
        last_name="User",
        password_hash="fake_hash",
        email_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# Creates fake event data
@pytest.fixture
def fake_event():
    class FakeEvent:
        event_id = uuid4()
        event_name = "Test Event"
        event_description = "This is a event description test"
        full_address = "North Test Park"
        priority_rank = 1
        start_time = datetime(2026, 4, 9, 10, 0, 0)
        end_time = datetime(2026, 4, 9, 11, 0, 0)
        calendar_id = uuid4()
        created_at = datetime(2026, 4, 9, 9, 30, 0)

    return FakeEvent()


# Creates test calendar data
@pytest.fixture
def test_calendar():
    class FakeCalendar:
        calendar_id = uuid4()
        calendar_name = "Test Calendar"
        events = []
    return FakeCalendar()


# Creates client and overrides authenticated user dependency only
# We do not override get_db here because your routers define their own local get_db functions
@pytest.fixture
def client(authenticated_user):
    app.dependency_overrides[get_current_user] = lambda: authenticated_user
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


# Helper function to create calendar through api and return id
def create_test_calendar(client, calendar_name, user_id):
    payload = CalendarCreate(
        user_id=user_id,
        calendar_name=calendar_name,
        date_start=None,
        date_end=None,
    )

    response = client.post("/calendar/create", json=payload.model_dump(mode="json"))
    assert response.status_code == 200, response.json()
    return response.json()["calendar_id"]


# Helper function to create event through api and return full response json
def create_test_event(client, fake_event, calendar_id):
    payload = EventCreate(
        calendar_id=calendar_id,
        event_name=fake_event.event_name,
        event_description=fake_event.event_description,
        full_address=fake_event.full_address,
        priority_rank=fake_event.priority_rank,
        start_time=fake_event.start_time,
        end_time=fake_event.end_time,
    )

    response = client.post("/events/create", json=payload.model_dump(mode="json"))
    assert response.status_code == 200, response.json()
    return response.json()


# Tests day hints route. Checks route returns patched day scheduling hints response shape
def test_get_day_hints_route(client):
    fake_result = {
        "hasConflict": False,
        "inWorkingHours": True,
        "workingHours": {
            "startTime": "09:00",
            "endTime": "17:00",
        },
        "conflicts": [],
        "suggestions": [
            {
                "startTime": "10:00",
                "endTime": "12:00",
                "label": "120 min free",
                "inWorkingHours": True,
            }
        ],
    }

    with patch("app.api.calendar.day_scheduling_hints", return_value=fake_result):
        response = client.get(
            "/calendar/day-hints",
            params={
                "date": "2026-04-08",
                "calendar_id": "11111111-1111-1111-1111-111111111111",
                "startTime": "09:00",
                "endTime": "17:00",
                "durationMinutes": 60,
            },
        )

    assert response.status_code == 200, response.json()
    data = response.json()
    assert "suggestions" in data
    assert isinstance(data["suggestions"], list)
    assert len(data["suggestions"]) > 0


# Tests calendar creation. Checks route returns created calendar data
def test_create_calendar(client, test_calendar, authenticated_user):
    payload = CalendarCreate(
        user_id=authenticated_user.user_id,
        calendar_name=test_calendar.calendar_name,
        date_start=None,
        date_end=None,
    )

    response = client.post("/calendar/create", json=payload.model_dump(mode="json"))
    assert response.status_code == 200, response.json()
    data = response.json()

    assert data["calendar_name"] == test_calendar.calendar_name
    assert data["calendar_id"] is not None
    assert str(data["user_id"]) == str(authenticated_user.user_id)


# Tests event creation. Checks route returns created event data
def test_create_event(client, fake_event, test_calendar, authenticated_user):
    calendar_id = create_test_calendar(
        client,
        test_calendar.calendar_name,
        authenticated_user.user_id,
    )

    event_data = create_test_event(client, fake_event, calendar_id)

    assert event_data["event_name"] == fake_event.event_name
    assert str(event_data["calendar_id"]) == str(calendar_id)


# Tests getting events for a calendar day. Checks created event is returned for that day
def test_get_events(client, fake_event, test_calendar, authenticated_user):
    calendar_id = create_test_calendar(
        client,
        test_calendar.calendar_name,
        authenticated_user.user_id,
    )

    create_test_event(client, fake_event, calendar_id)

    response = client.get(f"/events/calendar/{calendar_id}/day/2026-04-09")
    assert response.status_code == 200, response.json()
    data = response.json()

    assert len(data) > 0
    assert data[0]["event_name"] == fake_event.event_name


# Tests deleting an event. Checks deleted event can no longer be retrieved
def test_delete_event(client, fake_event, test_calendar, authenticated_user):
    calendar_id = create_test_calendar(
        client,
        test_calendar.calendar_name,
        authenticated_user.user_id,
    )

    event_data = create_test_event(client, fake_event, calendar_id)
    event_id = event_data["event_id"]

    delete_response = client.delete(f"/events/delete/{event_id}")
    assert delete_response.status_code == 200, delete_response.json()

    get_response = client.get(f"/events/event_id/{event_id}")
    assert get_response.status_code == 404


# Tests updating an event. Checks route returns updated event data
def test_update_event(client, fake_event, test_calendar, authenticated_user):
    calendar_id = create_test_calendar(client, test_calendar.calendar_name, authenticated_user.user_id, )
    event_data = create_test_event(client, fake_event, calendar_id)
    event_id = event_data["event_id"]
    update_payload = EventCreate(
        calendar_id=calendar_id,
        event_name="Updated Event Name",
        event_description="Updated description for the event",
        full_address="Updated Address",
        priority_rank=1,
        start_time=fake_event.start_time,
        end_time=fake_event.end_time,
    )

    update_response = client.put(f"/events/update/{event_id}",json=update_payload.model_dump(mode="json"),)
    assert update_response.status_code == 200, update_response.json()
    updated_event_data = update_response.json()

    assert updated_event_data["event_name"] == "Updated Event Name"
    assert updated_event_data["event_description"] == "Updated description for the event"
    assert updated_event_data["full_address"] == "Updated Address"
    assert updated_event_data["priority_rank"] == 1
    assert updated_event_data["start_time"] == fake_event.start_time.isoformat()
    assert updated_event_data["end_time"] == fake_event.end_time.isoformat()
    assert str(updated_event_data["calendar_id"]) == str(calendar_id)