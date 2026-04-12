import json
from datetime import datetime

import backend.chat as chat_module
from backend.schedule import Schedule
from backend.event import Event


def test_chat_add_event_with_fixed_datetime(client, monkeypatch):
    # reset global schedule for isolation
    chat_module.schedule = Schedule()

    def fake_ask_llm(message, calendar_context):
        # return JSON string like your LLM does
        return json.dumps({
            "intent": "add_event",
            "title": "Gym",
            "datetime": "2026-03-04T10:00:00",
            "duration_minutes": 60,
            "location": "1,1",
            "flexible": False
        })

    def fake_get_directions(origin, destination):
        return {"routes": [{"duration": 900.0}]}  # 15 min

    monkeypatch.setattr(chat_module, "ask_llm", fake_ask_llm)
    monkeypatch.setattr(chat_module, "get_directions", fake_get_directions)

    resp = client.post("/chat", json={"message": "schedule gym", "location": "0,0"})
    assert resp.status_code == 200
    data = resp.json()
    assert "Event 'Gym' scheduled!" in data["response"]
    assert data["event"]["name"] == "Gym"
    assert data["event"]["travel_time_min"] == 15
    assert len(data["all_events"]) == 1


def test_chat_add_event_with_window_find_slot(client, monkeypatch):
    chat_module.schedule = Schedule()

    def fake_ask_llm(message, calendar_context):
        return json.dumps({
            "intent": "add_event",
            "title": "Study",
            "datetime": None,
            "earliest_start": "2026-03-04T09:00:00",
            "latest_end": "2026-03-04T12:00:00",
            "duration_minutes": 60,
            "location": None,
            "flexible": True
        })

    monkeypatch.setattr(chat_module, "ask_llm", fake_ask_llm)

    resp = client.post("/chat", json={"message": "schedule study"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["event"]["name"] == "Study"
    assert data["event"]["start"].startswith("2026-03-04T09:00:00")


def test_chat_traffic_info_requires_locations(client, monkeypatch):
    def fake_ask_llm(message, calendar_context):
        return json.dumps({"intent": "traffic_info", "location": "1,1"})

    monkeypatch.setattr(chat_module, "ask_llm", fake_ask_llm)

    # missing starting location
    resp = client.post("/chat", json={"message": "how is traffic"})
    assert resp.status_code == 200
    assert "Missing starting location" in resp.json()["error"]


def test_chat_traffic_info_success(client, monkeypatch):
    def fake_ask_llm(message, calendar_context):
        return json.dumps({"intent": "traffic_info", "location": "1,1"})

    def fake_get_directions(origin, destination):
        return {"routes": [{"duration": 600.0}]}  # 10 min

    monkeypatch.setattr(chat_module, "ask_llm", fake_ask_llm)
    monkeypatch.setattr(chat_module, "get_directions", fake_get_directions)

    resp = client.post("/chat", json={"message": "traffic?", "location": "0,0"})
    assert resp.status_code == 200
    assert "10.0 minutes" in resp.json()["response"]


def test_chat_invalid_llm_json(client, monkeypatch):
    def fake_ask_llm(message, calendar_context):
        return "{not valid json"

    monkeypatch.setattr(chat_module, "ask_llm", fake_ask_llm)

    resp = client.post("/chat", json={"message": "hi"})
    assert resp.status_code == 200
    body = resp.json()
    assert "Invalid JSON" in body["error"]
    assert "raw" in body

