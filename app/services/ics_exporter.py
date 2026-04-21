from icalendar import Calendar, Event
from datetime import datetime
from uuid import uuid4

from app.services.calendar_service import get_calendar_context
from app.db import SessionLocal


def export_calendar_to_ics(calendar_id: str) -> str:
    session = SessionLocal()
    try:
        calendar_context = get_calendar_context(session, calendar_id)

        ical = Calendar()
        ical.add("prodid", "-//Your App//Calendar Export//EN")
        ical.add("version", "2.0")

        for event_data in calendar_context["events"]:
            if not event_data["start"]:
                continue

            event = Event()
            event.add("uid", str(uuid4()))
            event.add("summary", event_data["name"])
            event.add("dtstart", datetime.fromisoformat(event_data["start"]))

            if event_data["end"]:
                event.add("dtend", datetime.fromisoformat(event_data["end"]))

            if event_data.get("location"):
                event.add("location", event_data["location"])

            if event_data.get("description"):
                event.add("description", event_data["description"])

            ical.add_component(event)

        return ical.to_ical().decode("utf-8")
    finally:
        session.close()