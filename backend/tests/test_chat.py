import json
from types import SimpleNamespace
from uuid import uuid4

import backend.chat as chat_module
from backend.schedule import Schedule


class FakeSession:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def patch_chat_storage(monkeypatch, create_event_func=None):
    monkeypatch.setattr(chat_module, "SessionLocal", lambda: FakeSession())
    monkeypatch.setattr(chat_module, "get_calendar_context", lambda session, calendar_id: None)
    monkeypatch.setattr(chat_module, "get_chat_context", lambda session, chat_id: None)
    monkeypatch.setattr(chat_module, "more_than_8_messages", lambda session, chat_id: False)
    if create_event_func:
        monkeypatch.setattr(chat_module, "create_event", create_event_func)


def make_fake_event(**kwargs):
    return SimpleNamespace(
        event_id=uuid4(),
        event_name=kwargs["event_name"],
        start_time=kwargs["start_time"],
        end_time=kwargs["end_time"],
    )


def test_chat_add_event_with_fixed_datetime(client, monkeypatch):
    chat_module.schedule = Schedule()
    calendar_id = str(uuid4())
    created = {}

    def fake_ask_llm(message, **kwargs):
        return json.dumps({
            "actions": [{
                "intent": "add_event",
                "title": "Gym",
                "start_time": "2026-03-04T10:00:00",
                "end_time": "2026-03-04T11:00:00",
                "duration_minutes": 60,
                "location": "1,1",
                "recurring": False,
            }]
        })

    def fake_create_event(**kwargs):
        created.update(kwargs)
        return make_fake_event(**kwargs)

    patch_chat_storage(monkeypatch, fake_create_event)
    monkeypatch.setattr(chat_module, "ask_llm", fake_ask_llm)

    resp = client.post("/chat", json={"message": "schedule gym", "calendar_id": calendar_id})
    assert resp.status_code == 200
    data = resp.json()
    assert "Event 'Gym' scheduled!" in data["response"]
    assert data["event"]["event_name"] == "Gym"
    assert created["start_time"].isoformat() == "2026-03-04T10:00:00"
    assert created["end_time"].isoformat() == "2026-03-04T11:00:00"


def test_chat_add_event_with_window_find_slot(client, monkeypatch):
    chat_module.schedule = Schedule()
    calendar_id = str(uuid4())
    created = {}

    def fake_ask_llm(message, **kwargs):
        return json.dumps({
            "actions": [{
                "intent": "add_event",
                "title": "Study",
                "start_time": None,
                "end_time": None,
                "earliest_start": "2026-03-04T09:00:00",
                "latest_end": "2026-03-04T12:00:00",
                "duration_minutes": 60,
                "location": None,
                "recurring": False,
            }]
        })

    def fake_create_event(**kwargs):
        created.update(kwargs)
        return make_fake_event(**kwargs)

    patch_chat_storage(monkeypatch, fake_create_event)
    monkeypatch.setattr(chat_module, "ask_llm", fake_ask_llm)

    resp = client.post("/chat", json={"message": "schedule study", "calendar_id": calendar_id})
    assert resp.status_code == 200
    data = resp.json()

    assert data["event"]["event_name"] == "Study"
    assert created["start_time"].isoformat() == "2026-03-04T09:00:00"
    assert created["end_time"].isoformat() == "2026-03-04T10:00:00"


def test_chat_add_event_with_start_time_uses_default_duration(client, monkeypatch):
    calendar_id = str(uuid4())
    created = {}

    def fake_ask_llm(message, **kwargs):
        return json.dumps({
            "actions": [{
                "intent": "add_event",
                "title": "Class",
                "start_time": "2026-05-02T16:00:00",
                "end_time": None,
                "duration_minutes": None,
                "location": None,
                "recurring": False,
            }]
        })

    def fake_create_event(**kwargs):
        created.update(kwargs)
        return SimpleNamespace(
            event_id=uuid4(),
            event_name=kwargs["event_name"],
            start_time=kwargs["start_time"],
            end_time=kwargs["end_time"],
        )

    patch_chat_storage(monkeypatch, fake_create_event)
    monkeypatch.setattr(chat_module, "ask_llm", fake_ask_llm)

    resp = client.post("/chat", json={
        "message": "create the event from this parsed action",
        "calendar_id": calendar_id,
    })

    assert resp.status_code == 200
    data = resp.json()
    assert data["action"] == "add_event"
    assert data["event"]["event_name"] == "Class"
    assert created["start_time"].isoformat() == "2026-05-02T16:00:00"
    assert created["end_time"].isoformat() == "2026-05-02T17:00:00"


def test_simple_explicit_add_event_skips_llm(client, monkeypatch):
    calendar_id = str(uuid4())
    created = {}

    def fail_ask_llm(*args, **kwargs):
        raise AssertionError("ask_llm should not be called for simple explicit scheduling")

    def fake_create_event(**kwargs):
        created.update(kwargs)
        return make_fake_event(**kwargs)

    patch_chat_storage(monkeypatch, fake_create_event)
    monkeypatch.setattr(chat_module, "ask_llm", fail_ask_llm)

    resp = client.post("/chat", json={
        "message": "can you schedule class for tomorrow at 4pm?",
        "calendar_id": calendar_id,
        "current_time": {"user_current_datetime": "2026-05-01T19:34:00"},
    })

    assert resp.status_code == 200
    data = resp.json()
    assert data["action"] == "add_event"
    assert data["event"]["event_name"] == "class"
    assert created["start_time"].isoformat() == "2026-05-02T16:00:00"
    assert created["end_time"].isoformat() == "2026-05-02T17:00:00"


def test_numeric_suggestion_followup_schedules_selected_suggestion(client, monkeypatch):
    chat_id = str(uuid4())
    calendar_id = str(uuid4())
    created = {}
    chat_module.RECENT_SUGGESTIONS_BY_CHAT.clear()
    chat_module.RECENT_SUGGESTIONS_BY_CHAT[chat_id] = [
        {"title": "Hunter Creek Trailhead", "address": "Reno, NV 89519, USA"},
        {"title": "Hunter Creek Falls", "address": "Hunter Creek Trail, Reno, NV 89511, USA"},
        {"title": "Mt Rose Trailhead", "address": "24705 Mt Rose Hwy, Reno, NV 89511, USA"},
    ]

    def fail_ask_llm(*args, **kwargs):
        raise AssertionError("ask_llm should not be called for numeric suggestion follow-up")

    def fake_create_event(**kwargs):
        created.update(kwargs)
        return make_fake_event(**kwargs)

    patch_chat_storage(monkeypatch, fake_create_event)
    monkeypatch.setattr(chat_module, "ask_llm", fail_ask_llm)

    resp = client.post("/chat", json={
        "message": "can you schedule 3 on the 2nd of may from 3pm to 5pm?",
        "calendar_id": calendar_id,
        "chat_id": chat_id,
        "current_time": {"user_current_datetime": "2026-04-30T19:34:00"},
    })

    assert resp.status_code == 200
    data = resp.json()
    assert data["action"] == "add_suggested_event"
    assert data["event"]["event_name"] == "Mt Rose Trailhead"
    assert created["event_name"] == "Mt Rose Trailhead"
    assert created["full_address"] == "24705 Mt Rose Hwy, Reno, NV 89511, USA"
    assert created["start_time"].isoformat() == "2026-05-02T15:00:00"
    assert created["end_time"].isoformat() == "2026-05-02T17:00:00"


def test_chat_traffic_info_requires_locations(client, monkeypatch):
    def fake_ask_llm(message, **kwargs):
        return json.dumps({"intent": "traffic_info", "location": "1,1"})

    patch_chat_storage(monkeypatch)
    monkeypatch.setattr(chat_module, "ask_llm", fake_ask_llm)

    # missing starting location
    resp = client.post("/chat", json={"message": "how is traffic"})
    assert resp.status_code == 200
    assert "Missing user latitude or longitude" in resp.json()["error"]


def test_chat_traffic_info_success(client, monkeypatch):
    def fake_ask_llm(message, **kwargs):
        return json.dumps({"intent": "traffic_info", "location": "1,1"})

    def fake_get_route(**kwargs):
        return {
            "destination_name": "1,1",
            "duration_seconds": 600,
            "distance_meters": 1000,
            "geometry": {},
        }

    patch_chat_storage(monkeypatch)
    monkeypatch.setattr(chat_module, "ask_llm", fake_ask_llm)
    monkeypatch.setattr(chat_module, "get_route", fake_get_route)

    resp = client.post("/chat", json={
        "message": "traffic?",
        "user_latitude": 1,
        "user_longitude": 2,
    })
    assert resp.status_code == 200
    assert "10.0 minutes" in resp.json()["response"]


def test_chat_invalid_llm_json(client, monkeypatch):
    def fake_ask_llm(message, **kwargs):
        return "{not valid json"

    patch_chat_storage(monkeypatch)
    monkeypatch.setattr(chat_module, "ask_llm", fake_ask_llm)

    resp = client.post("/chat", json={"message": "hi"})
    assert resp.status_code == 200
    body = resp.json()
    assert "Invalid JSON" in body["error"]
    assert "raw" in body
