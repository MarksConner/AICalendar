# Main chat api route and helpers.
# Used to communicate with the AI agent. This section uses the LLM to parse user's intent and provides the necessary logic to execute the tasks. Makes service to the database directly
# Written by: Conner Marks, Luis Matheus Perdomo

#Functional Requirements
#FR6
#FR 21 Through 26

from datetime import timedelta, date
import json
import uuid
from inspect import signature

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.orm import Session
from typing import Any, Optional, Dict
from backend.llm_agent import ask_llm, llm_summarize_chat_history
from backend.schedule import Schedule
from backend.errors import ConflictError
from app.services.mapbox_service import get_route, geocode_location
from app.services.google_places_service import search_local_events
from app.db import SessionLocal
from app.services.calendar_service import get_calendar_context
from app.services.chat_service import get_chat_context, more_than_8_messages, summarize_chat_history
from app.services.events_service import (
    create_event, update_event, remove_event, add_event_participant,
    get_participants_for_event, remove_event_participant, get_participant_details, 
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter()
schedule = Schedule()
RECENT_SUGGESTIONS_BY_CHAT: dict[str, list[dict]] = {}
PENDING_BULK_REQUESTS_BY_CHAT: dict[str, dict[str, Any]] = {}

def _is_bookable_request(message: str | None, action: dict[str, Any]) -> bool:
    normalized_message = (message or "").lower()

    raw_type = (
        action.get("event_type")
        or action.get("type")
        or action.get("calendar_event_type")
    )

    if isinstance(raw_type, str) and raw_type.lower() in {
        "bookable",
        "booking",
        "availability",
        "bookable_slot",
        "availability_slot",
    }:
        return True

    if action.get("bookable") is True or action.get("is_bookable") is True:
        return True

    return "bookable" in normalized_message or "booking" in normalized_message


def _looks_like_recurring_request(message: str | None) -> bool:
    normalized = (message or "").lower()

    recurring_words = [
        "every",
        "daily",
        "weekly",
        "monthly",
        "recurring",
        "repeat",
        "repeating",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
        "mondays",
        "tuesdays",
        "wednesdays",
        "thursdays",
        "fridays",
        "saturdays",
        "sundays",
        "weekday",
        "weekdays",
        "weekend",
        "weekends",
        "monday-friday",
        "monday through friday",
        "monday to friday",
    ]

    return any(word in normalized for word in recurring_words)


def _create_event_safe(
    db: Session,
    calendar_id: uuid.UUID,
    event_name: str,
    full_address: str,
    start_time: datetime,
    end_time: datetime,
    description: str,
    priority_rank: int,
    event_type: str | None = None,
):
    kwargs = {
        "db": db,
        "calendar_id": calendar_id,
        "event_name": event_name,
        "full_address": full_address,
        "start_time": start_time,
        "end_time": end_time,
        "description": description,
        "priority_rank": priority_rank,
    }

    if event_type and "event_type" in signature(create_event).parameters:
        kwargs["event_type"] = event_type

    created_event = create_event(**kwargs)

    if event_type and hasattr(created_event, "event_type"):
        created_event.event_type = event_type
        db.add(created_event)
        db.commit()
        db.refresh(created_event)

    return created_event

class UserMessage(BaseModel):
    message: str
    calendar_id: str | None = None
    location: str | None = None
    chat_id: str | None = None
    current_time: Optional[Dict[str, Any]] = None
    
    user_latitude: float | None = None
    user_longitude: float | None = None


def _get_reference_date(current_time: dict | None = None) -> date:
    if current_time and isinstance(current_time, dict):
        for key in ("user_current_datetime", "iso", "now", "currentTime", "datetime", "date"):
            parsed = _coerce_datetime(current_time.get(key))
            if parsed:
                return parsed.date()
    return datetime.now().date()


def _parse_target_date(target_date_str: str | None, current_time: dict | None = None) -> date:
    if target_date_str:
        try:
            return datetime.fromisoformat(target_date_str).date()
        except ValueError:
            pass
    return _get_reference_date(current_time)


def _build_participant_listing(calendar_context: dict | None, range_type: str | None, target_date_str: str | None, current_time: dict | None = None):
    events = (calendar_context or {}).get("events", [])
    target_date = _parse_target_date(target_date_str, current_time)
    normalized_range = (range_type or "event").lower()

    def in_scope(event: dict) -> bool:
        start_raw = event.get("start")
        if not start_raw:
            return False
        try:
            event_start = datetime.fromisoformat(start_raw)
        except ValueError:
            return False

        event_day = event_start.date()
        if normalized_range == "day":
            return event_day == target_date
        if normalized_range == "week":
            return event_day.isocalendar()[:2] == target_date.isocalendar()[:2]
        if normalized_range == "month":
            return event_day.year == target_date.year and event_day.month == target_date.month
        return False

    matching_events = [event for event in events if in_scope(event)]
    if not matching_events:
        label = normalized_range if normalized_range in {"day", "week", "month"} else "selected range"
        return {
            "response": f"I couldn't find any events with participants for that {label}.",
            "action": "list_participants",
            "participants": [],
            "events": [],
        }

    lines: list[str] = []
    participant_rows: list[dict[str, str | None]] = []

    for event in matching_events:
        participants = event.get("participants") or []
        if not participants:
            continue
        lines.append(f"{event.get('name', 'Untitled event')}:")
        for participant in participants:
            info = participant.get("info")
            line = f"- {participant.get('name', 'Unknown participant')}"
            if info:
                line += f": {info}"
            lines.append(line)
            participant_rows.append({
                "event_id": event.get("event_id"),
                "event_name": event.get("name"),
                "participant_id": participant.get("participant_id"),
                "name": participant.get("name"),
                "info": participant.get("info"),
                "full_address": participant.get("full_address"),
            })

    if not participant_rows:
        return {
            "response": "I found the events, but none of them currently have participants listed.",
            "action": "list_participants",
            "participants": [],
            "events": matching_events,
        }

    return {
        "response": "Participants in that timeframe:\n" + "\n".join(lines),
        "action": "list_participants",
        "range_type": normalized_range,
        "target_date": target_date.isoformat(),
        "participants": participant_rows,
        "events": [
            {"event_id": event.get("event_id"), "event_name": event.get("name")}
            for event in matching_events
        ],
    }


def _iter_calendar_events(calendar_context: dict | None) -> list[dict]:
    return (calendar_context or {}).get("events", []) or []


def _event_start(event: dict) -> datetime | None:
    start_raw = event.get("start")
    if not start_raw:
        return None
    try:
        return datetime.fromisoformat(start_raw)
    except ValueError:
        return None


def _resolve_suggestion_selection(selection: str | None, chat_context: list[dict] | None, recent_suggestions: list[dict] | None = None):
    normalized = (selection or "").strip().lower()
    ordinal_map = {
        "first": 0,
        "1": 0,
        "one": 0,
        "second": 1,
        "2": 1,
        "two": 1,
        "third": 2,
        "3": 2,
        "three": 2,
        "fourth": 3,
        "4": 3,
        "four": 3,
        "fifth": 4,
        "5": 4,
        "five": 4,
        "last": -1,
    }

    suggestion_sets: list[list[dict]] = []
    if isinstance(recent_suggestions, list) and recent_suggestions:
        suggestion_sets.append(recent_suggestions)

    if chat_context:
        for message in reversed(chat_context):
            content = message.get("content")
            if not content:
                continue
            try:
                payload = json.loads(content)
            except Exception:
                continue

            suggestions = payload.get("suggestions")
            if isinstance(suggestions, list) and suggestions:
                suggestion_sets.append(suggestions)

    for suggestions in suggestion_sets:
        if normalized in ordinal_map:
            index = ordinal_map[normalized]
            if index == -1:
                return suggestions[-1]
            if 0 <= index < len(suggestions):
                return suggestions[index]

        if normalized:
            for suggestion in suggestions:
                title = (suggestion.get("title") or "").strip().lower()
                if title == normalized or normalized in title:
                    return suggestion

    return None


def _selection_from_message(message: str | None) -> str | None:
    normalized = (message or "").lower()
    mapping = {
        "1": "first",
        "one": "first",
        "first": "first",
        "2": "second",
        "two": "second",
        "second": "second",
        "3": "third",
        "three": "third",
        "third": "third",
        "4": "fourth",
        "four": "fourth",
        "fourth": "fourth",
        "5": "fifth",
        "five": "fifth",
        "fifth": "fifth",
        "last": "last",
    }
    for token, selection in mapping.items():
        if f"#{token}" in normalized:
            return selection
        if f"number {token}" in normalized:
            return selection
        if f"option {token}" in normalized:
            return selection
        if f"add {token}" in normalized:
            return selection
        if f"schedule {token}" in normalized:
            return selection
        if f"can you add {token}" in normalized:
            return selection
        if f"the {token} one" in normalized:
            return selection
        if f"that {token} one" in normalized:
            return selection
        if f" {token} " in f" {normalized} ":
            return selection
    return None


def _looks_like_suggestion_add_request(message: str | None) -> bool:
    normalized = (message or "").lower()
    if not normalized:
        return False
    selection = _selection_from_message(normalized)
    if not selection:
        return False
    return any(phrase in normalized for phrase in ["add", "schedule", "calendar", "put"])


def _is_bulk_consecutive_request(message: str | None) -> bool:
    normalized = (message or "").lower()
    if not normalized:
        return False
    bulk_words = [" consecutive", " back to back", " back-to-back", " in a row"]
    digit_match = any(f" {n} " in f" {normalized} " for n in ["2", "3", "4", "5", "6", "7", "8", "9", "10"])
    word_match = any(word in normalized for word in ["two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"])
    plural_event_hint = "events" in normalized
    return (any(word in normalized for word in bulk_words) or plural_event_hint) and (digit_match or word_match)


def _message_has_explicit_clock_time(message: str | None) -> bool:
    normalized = (message or "").lower()
    if not normalized:
        return False
    import re
    return bool(re.search(r"\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm)\b", normalized) or re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", normalized))


def _parse_clock_time(hour_text: str, minute_text: str | None = None, meridiem: str | None = None) -> tuple[int, int]:
    hour = int(hour_text)
    minute = int(minute_text or 0)
    normalized_meridiem = (meridiem or "").lower()
    if normalized_meridiem == "pm" and hour != 12:
        hour += 12
    if normalized_meridiem == "am" and hour == 12:
        hour = 0
    return hour, minute


def _parse_explicit_target_date(normalized: str, reference: datetime) -> date | None:
    import re

    month_map = {
        "jan": 1, "january": 1,
        "feb": 2, "february": 2,
        "mar": 3, "march": 3,
        "apr": 4, "april": 4,
        "may": 5,
        "jun": 6, "june": 6,
        "jul": 7, "july": 7,
        "aug": 8, "august": 8,
        "sep": 9, "sept": 9, "september": 9,
        "oct": 10, "october": 10,
        "nov": 11, "november": 11,
        "dec": 12, "december": 12,
    }

    patterns = [
        r"\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+([a-z]+)\b",
        r"\b([a-z]+)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b",
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, normalized):
            if match.group(1).isdigit():
                day = int(match.group(1))
                month = month_map.get(match.group(2))
            else:
                month = month_map.get(match.group(1))
                day = int(match.group(2))

            if not month:
                continue

            try:
                target = date(reference.year, month, day)
            except ValueError:
                continue

            if target < reference.date():
                try:
                    target = date(reference.year + 1, month, day)
                except ValueError:
                    continue
            return target

    return None


def _parse_inline_time_details(message: str | None, current_time: dict | None = None) -> dict[str, Any]:
    normalized = (message or "").lower()
    reference = _coerce_datetime((current_time or {}).get("user_current_datetime")) or datetime.now()
    reference = reference.replace(tzinfo=None)

    target_date = _parse_explicit_target_date(normalized, reference) or reference.date()
    if "day after tomorrow" in normalized:
        target_date = reference.date() + timedelta(days=2)
    elif "tomorrow" in normalized:
        target_date = reference.date() + timedelta(days=1)
    elif "today" in normalized:
        target_date = reference.date()

    hour = None
    minute = 0

    import re
    range_match = re.search(
        r"\bfrom\s+(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm)\s+to\s+(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm)\b",
        normalized,
    )
    if range_match:
        start_hour, start_minute = _parse_clock_time(range_match.group(1), range_match.group(2), range_match.group(3))
        end_hour, end_minute = _parse_clock_time(range_match.group(4), range_match.group(5), range_match.group(6))
        start_dt = datetime.combine(target_date, datetime.min.time()).replace(hour=start_hour, minute=start_minute)
        end_dt = datetime.combine(target_date, datetime.min.time()).replace(hour=end_hour, minute=end_minute)
        if end_dt <= start_dt:
            end_dt += timedelta(days=1)
        return {
            "start_time": start_dt.isoformat(),
            "end_time": end_dt.isoformat(),
            "duration_minutes": int((end_dt - start_dt).total_seconds() / 60),
        }

    match = re.search(r"\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm)\b", normalized)
    if match:
        hour, minute = _parse_clock_time(match.group(1), match.group(2), match.group(3))
    else:
        match24 = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", normalized)
        if match24:
            hour = int(match24.group(1))
            minute = int(match24.group(2))

    if hour is None:
        if "morning" in normalized:
            hour = 9
        elif "afternoon" in normalized:
            hour = 13
        elif "evening" in normalized or "night" in normalized:
            hour = 18

    if hour is None:
        return {"start_time": None, "end_time": None, "duration_minutes": 60}

    start_dt = datetime.combine(target_date, datetime.min.time()).replace(hour=hour, minute=minute)
    end_dt = start_dt + timedelta(minutes=60)
    return {
        "start_time": start_dt.isoformat(),
        "end_time": end_dt.isoformat(),
        "duration_minutes": 60,
    }


def _try_build_simple_add_event_action(message: str | None, current_time: dict | None = None) -> dict[str, Any] | None:
    normalized = (message or "").strip()
    if not normalized or not _message_has_explicit_clock_time(normalized):
        return None

    lowered = normalized.lower()
    if not any(word in lowered for word in ["schedule", "add", "put"]):
        return None

    if any(word in lowered for word in ["delete", "remove", "update", "change", "move", "traffic", "directions", "suggest"]):
        return None

    parsed_time = _parse_inline_time_details(normalized, current_time)
    if not parsed_time.get("start_time"):
        return None

    import re
    title_match = re.search(r"\b(?:schedule|add|put)\b(?:\s+(?:an?|the))?\s+(.+)", normalized, re.IGNORECASE)
    if not title_match:
        return None

    title = title_match.group(1).strip()
    title = re.split(
        r"\s+(?:for|on|at)\b|\s+\b(?:today|tomorrow|day after tomorrow)\b",
        title,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0].strip(" .?!")

    if title.lower().startswith("it "):
        return None

    title = title or "Untitled Event"
    if title.isdigit():
        return None

    return {
        "intent": "add_event",
        "title": title,
        "start_time": parsed_time.get("start_time"),
        "end_time": parsed_time.get("end_time"),
        "duration_minutes": parsed_time.get("duration_minutes") or 60,
        "location": None,
        "priority_rank": 0,
        "recurring": False,
    }


def _latest_suggestion_from_chat_context(chat_context: list[dict] | None):
    if not chat_context:
        return None

    for message in reversed(chat_context):
        content = message.get("content")
        if not content:
            continue
        try:
            payload = json.loads(content)
        except Exception:
            continue

        suggestion = payload.get("suggestion")
        if isinstance(suggestion, dict) and suggestion.get("title"):
            return suggestion

        suggestions = payload.get("suggestions")
        if isinstance(suggestions, list) and suggestions:
            first = suggestions[0]
            if isinstance(first, dict):
                return first

    return None


def _is_followup_to_local_suggestion(message: str | None, chat_context: list[dict] | None) -> bool:
    normalized = (message or "").lower()
    if any(token in normalized for token in ["first one", "second one", "third one", "fourth one", "fifth one", "last one", "museum", "coffee", "restaurant", "bar", "park"]):
        return True

    if not chat_context:
        return False

    for message_item in reversed(chat_context[-6:]):
        content = message_item.get("content")
        if not content:
            continue
        try:
            payload = json.loads(content)
        except Exception:
            continue
        if payload.get("action") == "suggest_local_event" or payload.get("suggestion") or payload.get("suggestions"):
            return True

    return False


def _format_event_line(event: dict) -> str:
    start_dt = _event_start(event)
    if not start_dt:
        return f"• {event.get('name', 'Untitled event')}"
    end_raw = event.get("end")
    end_dt = None
    if end_raw:
        try:
            end_dt = datetime.fromisoformat(end_raw)
        except ValueError:
            end_dt = None
    time_part = start_dt.strftime("%a %b %-d, %-I:%M %p")
    if end_dt:
        time_part += f"–{end_dt.strftime('%-I:%M %p')}"
    return f"• {event.get('name', 'Untitled event')} — {time_part}"



def _coerce_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.strip()
    try:
        return datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except ValueError:
        pass

    for fmt in (
        "%a %b %d %Y %H:%M:%S GMT%z (%Z)",
        "%a %b %d %Y %H:%M:%S GMT%z",
        "%a %b %d %Y %H:%M:%S",
    ):
        try:
            return datetime.strptime(normalized, fmt)
        except ValueError:
            continue

    return None


def _range_bounds(range_type: str, target_date: date) -> tuple[datetime, datetime]:
    normalized_range = (range_type or "day").lower()
    if normalized_range == "week":
        start_day = target_date - timedelta(days=target_date.weekday())
        end_day = start_day + timedelta(days=7)
    elif normalized_range == "month":
        start_day = target_date.replace(day=1)
        if start_day.month == 12:
            end_day = start_day.replace(year=start_day.year + 1, month=1)
        else:
            end_day = start_day.replace(month=start_day.month + 1)
    else:
        start_day = target_date
        end_day = target_date + timedelta(days=1)
    return datetime.combine(start_day, datetime.min.time()), datetime.combine(end_day, datetime.min.time())


def _infer_time_hint(title: str | None, time_hint: str | None) -> str | None:
    if time_hint:
        return time_hint
    normalized_title = (title or "").lower()
    if "coffee" in normalized_title or "breakfast" in normalized_title or "brunch" in normalized_title:
        return "morning"
    if "lunch" in normalized_title:
        return "afternoon"
    if "dinner" in normalized_title or "drinks" in normalized_title:
        return "evening"
    if "workout" in normalized_title or "run" in normalized_title or "gym" in normalized_title:
        return "evening"
    return "daytime"


def _time_hint_windows(time_hint: str | None, range_start: datetime, range_end: datetime) -> list[tuple[datetime, datetime]]:
    normalized = (time_hint or "daytime").lower()

    windows: list[tuple[datetime, datetime]] = []
    current = range_start
    while current < range_end:
        day_start = datetime.combine(current.date(), datetime.min.time())
        next_day = day_start + timedelta(days=1)

        if normalized == "morning":
            start = day_start.replace(hour=8)
            end = day_start.replace(hour=12)
        elif normalized == "afternoon":
            start = day_start.replace(hour=12)
            end = day_start.replace(hour=17)
        elif normalized == "evening":
            start = day_start.replace(hour=17)
            end = day_start.replace(hour=21)
        elif normalized == "night":
            start = day_start.replace(hour=18)
            end = day_start.replace(hour=23)
        elif normalized == "weekend":
            if current.weekday() not in {5, 6}:
                current = next_day
                continue
            start = day_start.replace(hour=9)
            end = day_start.replace(hour=20)
        else:
            start = day_start.replace(hour=8)
            end = day_start.replace(hour=20)

        clipped_start = max(start, range_start)
        clipped_end = min(end, range_end)
        if clipped_end > clipped_start:
            windows.append((clipped_start, clipped_end))
        current = next_day

    return windows


def _build_best_time_suggestion(calendar_context: dict | None, title: str | None, range_type: str | None, target_date_str: str | None, duration_minutes: int | None, time_hint: str | None, current_time: dict | None = None):
    target_date = _parse_target_date(target_date_str, current_time)
    normalized_range = (range_type or "week").lower()
    duration = int(duration_minutes or 60)
    effective_time_hint = _infer_time_hint(title, time_hint)
    events = _iter_calendar_events(calendar_context)
    range_start, range_end = _range_bounds(normalized_range, target_date)
    now_dt = None
    if current_time:
        for key in ("user_current_datetime", "iso", "now", "currentTime", "datetime"):
            now_dt = _coerce_datetime(current_time.get(key) if isinstance(current_time, dict) else None)
            if now_dt:
                break
    if now_dt:
        now_dt = now_dt.replace(tzinfo=None)
        range_start = max(range_start, now_dt)
    preferred_windows = _time_hint_windows(effective_time_hint, range_start, range_end)

    busy: list[tuple[datetime, datetime]] = []
    for event in events:
        start_dt = _event_start(event)
        if not start_dt:
            continue
        end_dt = _coerce_datetime(event.get("end")) or (start_dt + timedelta(minutes=60))
        if end_dt <= range_start or start_dt >= range_end:
            continue
        busy.append((max(start_dt, range_start), min(end_dt, range_end)))

    busy.sort(key=lambda item: item[0])
    merged: list[list[datetime]] = []
    for start_dt, end_dt in busy:
        if not merged or start_dt > merged[-1][1]:
            merged.append([start_dt, end_dt])
        else:
            merged[-1][1] = max(merged[-1][1], end_dt)

    candidate_slots: list[tuple[datetime, datetime]] = []
    for window_start, window_end in preferred_windows:
        cursor = window_start
        for busy_start, busy_end in merged:
            if busy_end <= cursor or busy_start >= window_end:
                continue
            if busy_start > cursor and int((busy_start - cursor).total_seconds() / 60) >= duration:
                candidate_slots.append((cursor, cursor + timedelta(minutes=duration)))
            cursor = max(cursor, busy_end)
        if window_end > cursor and int((window_end - cursor).total_seconds() / 60) >= duration:
            candidate_slots.append((cursor, cursor + timedelta(minutes=duration)))

    candidate_slots = [slot for slot in candidate_slots if slot[0] >= range_start]

    if not candidate_slots:
        hint_text = f" during the {effective_time_hint}" if effective_time_hint else ""
        return {
            "response": f"I couldn't find a clear {duration}-minute slot{hint_text} in that {normalized_range}.",
            "action": "suggest_best_time",
            "range_type": normalized_range,
            "target_date": target_date.isoformat(),
            "duration_minutes": duration,
            "time_hint": effective_time_hint,
            "suggestions": [],
        }

    top_slots = candidate_slots[:3]
    lines = [
        f"• {slot_start.strftime('%A %b %-d, %-I:%M %p')} to {slot_end.strftime('%-I:%M %p')}"
        for slot_start, slot_end in top_slots
    ]
    subject = title or "that"
    return {
        "response": f"Best times for {subject}:\n" + "\n".join(lines),
        "action": "suggest_best_time",
        "range_type": normalized_range,
        "target_date": target_date.isoformat(),
        "duration_minutes": duration,
        "time_hint": effective_time_hint,
        "suggestions": [
            {
                "start_time": slot_start.isoformat(),
                "end_time": slot_end.isoformat(),
            }
            for slot_start, slot_end in top_slots
        ],
    }


def _build_schedule_query_response(calendar_context: dict | None, query_type: str | None, range_type: str | None, target_date_str: str | None, current_time: dict | None = None):
    events = _iter_calendar_events(calendar_context)
    normalized_range = (range_type or "day").lower()
    query = (query_type or "events").lower()
    target_date = _parse_target_date(target_date_str, current_time)

    def in_scope(event: dict) -> bool:
        start_dt = _event_start(event)
        if not start_dt:
            return False
        event_day = start_dt.date()
        if normalized_range == "day":
            return event_day == target_date
        if normalized_range == "week":
            return event_day.isocalendar()[:2] == target_date.isocalendar()[:2]
        if normalized_range == "month":
            return event_day.year == target_date.year and event_day.month == target_date.month
        return False

    scoped_events = sorted([event for event in events if in_scope(event)], key=lambda event: _event_start(event) or datetime.max)

    if query == "events":
        if not scoped_events:
            return {
                "response": f"You don't have anything scheduled for that {normalized_range}.",
                "action": "schedule_query",
                "query_type": query,
                "range_type": normalized_range,
                "target_date": target_date.isoformat(),
                "events": [],
            }
        return {
            "response": "Here’s what you have scheduled:\n" + "\n".join(_format_event_line(event) for event in scoped_events),
            "action": "schedule_query",
            "query_type": query,
            "range_type": normalized_range,
            "target_date": target_date.isoformat(),
            "events": scoped_events,
        }

    if query == "busiest_day":
        if not scoped_events:
            return {
                "response": f"I couldn't find any scheduled events in that {normalized_range}.",
                "action": "schedule_query",
                "query_type": query,
                "range_type": normalized_range,
                "target_date": target_date.isoformat(),
                "events": [],
            }
        counts: dict[date, int] = {}
        for event in scoped_events:
            start_dt = _event_start(event)
            if not start_dt:
                continue
            counts[start_dt.date()] = counts.get(start_dt.date(), 0) + 1
        busiest_day, count = max(counts.items(), key=lambda item: item[1])
        return {
            "response": f"Your busiest day looks like {busiest_day.strftime('%A, %B %-d')} with {count} event{'s' if count != 1 else ''}.",
            "action": "schedule_query",
            "query_type": query,
            "range_type": normalized_range,
            "target_date": target_date.isoformat(),
            "events": scoped_events,
            "busiest_day": busiest_day.isoformat(),
            "event_count": count,
        }

    if not scoped_events:
        return {
            "response": f"Your {normalized_range} looks open right now.",
            "action": "schedule_query",
            "query_type": "free_time",
            "range_type": normalized_range,
            "target_date": target_date.isoformat(),
            "events": [],
        }

    lines = []
    previous_end = None
    for event in scoped_events:
        start_dt = _event_start(event)
        if not start_dt:
            continue
        end_dt = None
        end_raw = event.get("end")
        if end_raw:
            try:
                end_dt = datetime.fromisoformat(end_raw)
            except ValueError:
                end_dt = None

        if previous_end and start_dt > previous_end:
            gap_minutes = int((start_dt - previous_end).total_seconds() / 60)
            if gap_minutes >= 30:
                lines.append(
                    f"• {previous_end.strftime('%a %-I:%M %p')} to {start_dt.strftime('%-I:%M %p')} ({gap_minutes} min free)"
                )
        if end_dt and (previous_end is None or end_dt > previous_end):
            previous_end = end_dt

    if not lines:
        response = f"You have events scheduled, but I couldn't find a clear free block of at least 30 minutes in that {normalized_range}."
    else:
        response = "Here are your free windows:\n" + "\n".join(lines[:5])

    return {
        "response": response,
        "action": "schedule_query",
        "query_type": "free_time",
        "range_type": normalized_range,
        "target_date": target_date.isoformat(),
        "events": scoped_events,
    }

#Written by Luis and Conner
@router.post("")
def chat(data: UserMessage):

    # short-lived read session
    with SessionLocal() as read_db:
        calendar_context = get_calendar_context(read_db, data.calendar_id) if data.calendar_id else None
        chat_context = get_chat_context(read_db, data.chat_id) if data.chat_id else None

    forced_actions = None
    if _is_bulk_consecutive_request(data.message) and not _message_has_explicit_clock_time(data.message):
        if data.chat_id:
            PENDING_BULK_REQUESTS_BY_CHAT[str(data.chat_id)] = {
                "message": data.message,
                "current_time": data.current_time,
            }
        forced_actions = [{
            "intent": "clarify",
            "message": "I can create those events, but I need a start time so I don't schedule them overnight. What time should the first one start?",
        }]
    elif data.chat_id and str(data.chat_id) in PENDING_BULK_REQUESTS_BY_CHAT and _message_has_explicit_clock_time(data.message):
        pending = PENDING_BULK_REQUESTS_BY_CHAT.pop(str(data.chat_id))
        original_message = pending.get("message") or ""
        import re
        count_match = re.search(r"\b(\d+)\b", original_message)
        count = int(count_match.group(1)) if count_match else 1
        title_match = re.search(r"called\s+(.+)$", original_message, re.IGNORECASE)
        title = title_match.group(1).strip() if title_match else "Untitled Event"
        parsed = _parse_inline_time_details(data.message, data.current_time or pending.get("current_time"))
        start_time = parsed.get("start_time")
        duration = int(parsed.get("duration_minutes") or 60)
        actions = []
        if start_time:
            base_start = Schedule.parse_datetime(start_time)
            for index in range(count):
                start_dt = base_start + timedelta(minutes=duration * index)
                end_dt = start_dt + timedelta(minutes=duration)
                actions.append({
                    "intent": "add_event",
                    "title": title,
                    "start_time": start_dt.isoformat(),
                    "end_time": end_dt.isoformat(),
                    "duration_minutes": duration,
                    "location": None,
                    "priority_rank": 0,
                    "recurring": False,
                })
            forced_actions = actions
        else:
            forced_actions = [{
                "intent": "clarify",
                "message": "I still need a specific start time like 2am or 10:30am for the first event.",
            }]
    elif (
        (
            _is_followup_to_local_suggestion(data.message, chat_context)
            or (data.chat_id and RECENT_SUGGESTIONS_BY_CHAT.get(str(data.chat_id)))
        )
        and _looks_like_suggestion_add_request(data.message)
    ):
        forced_actions = [{
            "intent": "add_suggested_event",
            "selection": _selection_from_message(data.message),
            **_parse_inline_time_details(data.message, data.current_time),
        }]
        
    elif (
        _is_bookable_request(data.message, {})
        and _message_has_explicit_clock_time(data.message)
        and not _looks_like_recurring_request(data.message)
        and not _is_bulk_consecutive_request(data.message)
    ):
        parsed_bookable_time = _parse_inline_time_details(data.message, data.current_time)
        if parsed_bookable_time.get("start_time"):
            forced_actions = [{
                "intent": "add_event",
                "title": "Bookable Event",
                "start_time": parsed_bookable_time.get("start_time"),
                "end_time": parsed_bookable_time.get("end_time"),
                "duration_minutes": parsed_bookable_time.get("duration_minutes") or 60,
                "location": None,
                "priority_rank": 0,
                "recurring": False,
                "event_type": "bookable",
            }]
    else:
        simple_add_event = _try_build_simple_add_event_action(data.message, data.current_time)
        if simple_add_event:
            forced_actions = [simple_add_event]

    # no DB session held during LLM call
    llm_output = None if forced_actions is not None else ask_llm(data.message,calendar_context=calendar_context,chat_context=chat_context, current_time = data.current_time)
    if forced_actions is not None:
        actions = forced_actions
    else:
        if not llm_output:
            return {"error": "LLM returned an empty response"}

    if forced_actions is None:
        lowered_output = llm_output.lower()
        if any(marker in lowered_output for marker in ["openai_api_key is not set", "insufficient_quota", "quota", "rate limit", "429"]):
            return {
                "response": "AI scheduling is temporarily unavailable right now. Please check the OpenAI key or billing setup and try again.",
                "action": "chat"
            }

        try:
            action = json.loads(llm_output)
        except Exception as e:
            return {"error": f"Invalid JSON from LLM: {e}", "raw": llm_output}

        if action.get("intent") == "multiple":
            raw_results = action.get("results")
            if isinstance(raw_results, list) and raw_results:
                actions = raw_results
            elif _is_followup_to_local_suggestion(data.message, chat_context):
                actions = [{
                    "intent": "add_suggested_event",
                    "selection": _selection_from_message(data.message),
                    "start_time": None,
                    "end_time": None,
                    "duration_minutes": 60,
                    "message": "I need a little clarification before I add that suggestion."
                }]
            else:
                return {"response": "I understood the request, but I couldn't parse the action cleanly. Please try again with something like 'add the second one tomorrow at 8am'.", "action": "clarify"}
        else:
            actions = action.get("actions", [action])

    if not isinstance(actions, list):
        return {"error": "LLM output must contain an actions list."}

    results = []

    # DB session for writes/later reads
    with SessionLocal() as session:
        if data.chat_id and more_than_8_messages(session, chat_id=uuid.UUID(data.chat_id)):
            summary = llm_summarize_chat_history(chat_context)
            summarize_chat_history(session, chat_id=uuid.UUID(data.chat_id))

        total_actions = len(actions)
        processed_actions = 0

        for action in actions:
            intent = action.get("intent", "unknown")
        
            if intent == "chat":
                results.append({
                    "response": action.get("response", "Hello! How can I help you?"),
                    "action": "chat"
                })

            elif intent == "add_event":
                title = action.get("title", "Untitled Event")
                location = action.get("location")
                if not location and _is_followup_to_local_suggestion(data.message, chat_context):
                    latest_suggestion = _latest_suggestion_from_chat_context(chat_context)
                    if latest_suggestion:
                        location = latest_suggestion.get("address") or latest_suggestion.get("venue_name") or location
                        if title == "Untitled Event" or title == action.get("title"):
                            title = latest_suggestion.get("title") or title
                duration = int(action.get("duration_minutes") or 60)
                priority = action.get("priority_rank", 0)
                recurring = bool(action.get("recurring"))
                event_type = "bookable" if _is_bookable_request(data.message, action) else None

                if not data.calendar_id:
                    results.append({"error": "Missing calendar_id for event creation."})
                    continue

                travel_minutes = 0
                if data.location and location:
                    travel = get_directions(data.location, location)
                    travel_minutes = int(travel["routes"][0]["duration"] / 60)

              
                try:
                    # recurring first
                    if recurring:
                        occurrences = handle_recurrence(action)
                        created_events = []

                        for oc_start_time, oc_end_time in occurrences:
                            created_event = _create_event_safe(
                                db=session,
                                calendar_id=uuid.UUID(data.calendar_id),
                                event_name=title,
                                full_address=location or "",
                                start_time=oc_start_time,
                                end_time=oc_end_time,
                                description=action.get("description", ""),
                                priority_rank=priority,
                                event_type=event_type,
                            )

                            created_events.append({
                                "event_id": str(created_event.event_id),
                                "event_name": created_event.event_name,
                                "start_time": created_event.start_time.isoformat() if created_event.start_time else None,
                                "end_time": created_event.end_time.isoformat() if created_event.end_time else None,
                            })

                        results.append({
                            "response": f"Created {len(created_events)} recurring events for '{title}'.",
                            "action": "add_event",
                            "recurring": True,
                            "events": created_events,
                            "travel_minutes": travel_minutes,
                        })
                        continue

                    # non-recurring after that
                    start = action.get("start_time")
                    end = action.get("end_time")
                    if start:
                        start_dt = Schedule.parse_datetime(start)
                        end_dt = Schedule.parse_datetime(end) if end else start_dt + timedelta(minutes=duration)
                    else:
                        earliest = action.get("earliest_start")
                        latest = action.get("latest_end")

                        if earliest and latest:
                            slot = schedule.find_slot(earliest, latest, duration)
                            if slot is None:
                                results.append({"error": "No available time in that window."})
                                continue
                            start_dt = slot
                            end_dt = start_dt + timedelta(minutes=duration)
                        else:
                            results.append({"error": "Event time missing and no time window provided"})
                            continue

                    created_event = _create_event_safe(
                        db=session,
                        calendar_id=uuid.UUID(data.calendar_id),
                        event_name=title,
                        full_address=location or "",
                        start_time=start_dt,
                        end_time=end_dt,
                        description=action.get("description", ""),
                        priority_rank=priority,
                        event_type=event_type,
                    )

                    results.append({
                        "response": f"Event '{title}' scheduled!",
                        "action": "add_event",
                        "event": {
                            "event_id": str(created_event.event_id),
                            "event_name": created_event.event_name,
                        }
                    })

                except ConflictError as e:
                    session.rollback()
                    results.append({"error": str(e)})
                except ValueError as e:
                    session.rollback()
                    results.append({"error": str(e)})

            
            elif intent == "suggest_local_event":
                if data.user_latitude is None or data.user_longitude is None:
                    results.append({
                        "response": "I can suggest something nearby once location access is available.",
                        "action": "suggest_local_event",
                        "suggestions": [],
                    })
                    continue

                keyword = action.get("keyword") or action.get("query") or "events"
                try:
                    suggestions = search_local_events(
                        latitude=data.user_latitude,
                        longitude=data.user_longitude,
                        keyword=keyword,
                        radius_km=25,
                    )
                    top_suggestions = suggestions[:5]
                    if not top_suggestions:
                        results.append({
                            "response": f"I couldn't find nearby suggestions for {keyword} right now.",
                            "action": "suggest_local_event",
                            "suggestions": [],
                        })
                        continue

                    lines = []
                    normalized_suggestions = []
                    for index, suggestion in enumerate(top_suggestions, start=1):
                        suggestion_data = suggestion.model_dump() if hasattr(suggestion, "model_dump") else suggestion
                        address = suggestion_data.get("address") or suggestion_data.get("venue_name") or "Address unavailable"
                        title = suggestion_data.get("title") or "Untitled suggestion"
                        lines.append(f"{index}. {title}\n   {address}")
                        normalized_suggestions.append(suggestion_data)

                    if data.chat_id:
                        RECENT_SUGGESTIONS_BY_CHAT[str(data.chat_id)] = normalized_suggestions

                    results.append({
                        "response": f"Here are some nearby {keyword} suggestions:\n\n" + "\n\n".join(lines),
                        "action": "suggest_local_event",
                        "suggestions": normalized_suggestions,
                        "llm_message": action.get("message"),
                    })
                except Exception as e:
                    results.append({"error": f"Error suggesting local events: {str(e)}"})
                continue

            elif intent == "add_suggested_event":
                if not data.calendar_id:
                    results.append({"error": "Missing calendar_id for event creation."})
                    continue

                selection = action.get("selection") or action.get("title")
                selected_suggestion = _resolve_suggestion_selection(
                    selection,
                    chat_context,
                    RECENT_SUGGESTIONS_BY_CHAT.get(str(data.chat_id)) if data.chat_id else None,
                )
                if not selected_suggestion:
                    results.append({
                        "response": "I couldn't tell which nearby suggestion you wanted. Try saying add the first one or add the second one.",
                        "action": "clarify",
                    })
                    continue

                start = action.get("start_time")
                end = action.get("end_time")
                duration = int(action.get("duration_minutes") or 60)

                normalized_message = (data.message or "").lower()
                if any(phrase in normalized_message for phrase in ["today", "tomorrow", "day after tomorrow", "morning", "afternoon", "evening", "night"]):
                    parsed_time = _parse_inline_time_details(data.message, data.current_time)
                    if parsed_time.get("start_time"):
                        start = parsed_time.get("start_time")
                        end = parsed_time.get("end_time")
                        duration = int(parsed_time.get("duration_minutes") or duration)

                if not start:
                    results.append({
                        "response": "I found the suggestion, but I still need a date and time to add it to your calendar.",
                        "action": "clarify",
                        "suggestion": selected_suggestion,
                    })
                    continue

                try:
                    start_dt = Schedule.parse_datetime(start)
                    end_dt = Schedule.parse_datetime(end) if end else start_dt + timedelta(minutes=duration)
                    title = selected_suggestion.get("title") or action.get("title") or "Suggested event"
                    address = selected_suggestion.get("address") or selected_suggestion.get("venue_name") or ""
                    created_event = create_event(
                        db=session,
                        calendar_id=uuid.UUID(data.calendar_id),
                        event_name=title,
                        full_address=address,
                        start_time=start_dt,
                        end_time=end_dt,
                        description=action.get("message") or f"Added from nearby suggestions.",
                        priority_rank=action.get("priority_rank", 0),
                    )
                    results.append({
                        "response": f"Added '{title}' to your calendar.",
                        "action": "add_suggested_event",
                        "event": {
                            "event_id": str(created_event.event_id),
                            "event_name": created_event.event_name,
                        },
                        "suggestion": selected_suggestion,
                    })
                except ConflictError as e:
                    session.rollback()
                    results.append({"error": str(e)})
                except ValueError as e:
                    session.rollback()
                    results.append({"error": str(e)})
                except Exception as e:
                    results.append({"error": f"Error adding suggested event: {str(e)}"})
                continue

            elif intent == "schedule_query":
                results.append(
                    _build_schedule_query_response(
                        calendar_context,
                        action.get("query_type"),
                        action.get("range_type"),
                        action.get("target_date"),
                        data.current_time,
                    )
                )
                continue

            elif intent == "suggest_best_time":
                results.append(
                    _build_best_time_suggestion(
                        calendar_context,
                        action.get("title"),
                        action.get("range_type"),
                        action.get("target_date"),
                        action.get("duration_minutes"),
                        action.get("time_hint"),
                        data.current_time,
                    )
                )
                continue

            elif intent == "traffic_info":
                event_name = action.get("event_name") or action.get("title") or "your event"
                destination = action.get("location") or action.get("full_address")

                if data.user_latitude is None or data.user_longitude is None:
                    return {"error": "Missing user latitude or longitude."}

                if not destination:
                    return {"error": f"I found '{event_name}', but it does not have a saved location."}

                route = get_route(
                    user_longitude=data.user_longitude,
                    user_latitude=data.user_latitude,
                    destination=destination,
                )

                duration_minutes = route["duration_seconds"] / 60
                return {
                    "response": f"It will take about {duration_minutes:.1f} minutes to drive to '{event_name}'.",
                    "action": "traffic_action",
                    "event_name": event_name,
                    "destination": route["destination_name"],
                    "duration_seconds": route["duration_seconds"],
                    "duration_minutes": duration_minutes,
                    "distance_meters": route["distance_meters"],
                    "geometry": route["geometry"],
                }


            #handle simple chatting
            elif intent == "chat":
                return {
                    "response": action.get("response", "Hello! How can I help you?")
                }

            elif intent == "update_event": # use api call in app folder.
                event_id = action.get("event_id")
                event_name = action.get("event_name")

                if not event_id:
                    return {"error": "Missing event_id for update."}
                    processed_actions += 1
                    continue
                # check if at least one field to update is provided
                updatable_fields = ["event_name", "start_time", "end_time", "priority_rank", "description", "full_address"]
                if not any(field in action for field in updatable_fields):
                    return {"error": "No fields to update provided."}
                    processed_actions += 1 
                    continue
                
                # call the update_event function from events_service with the provided fields
                try:
                    update_result = update_event(
                        db=session,
                        event_id=uuid.UUID(event_id),
                        event_name=action.get("event_name"),
                        start_time=Schedule.parse_datetime(action["start_time"]) if action.get("start_time") else None,
                        end_time=Schedule.parse_datetime(action["end_time"]) if action.get("end_time") else None,
                        priority_rank=action.get("priority_rank"),
                        description=action.get("description"),
                        full_address=action.get("full_address"),
                    )
                    processed_actions += 1

                    if(update_result):
                        display_name = action.get("event_name") or action.get("title") or "selected event"
                        results.append({"response": f"Event '{display_name}' updated successfully!",
                            "action": "update_event",
                            "event_id": event_id,})
        

                    continue
                        
                except Exception as e:
                    return {"error": f"Error updating event: {str(e)}"}
                
            elif intent == "delete_event":
                event_id = action.get("event_id")

                if not event_id:
                    results.append({"error": "Missing event_id for deletion."})
                    processed_actions += 1
                    continue

                try:
                    event_name = action.get("event_name") or action.get("title") or "selected event"
                    delete_result = remove_event(
                        db=session,
                        event_id=uuid.UUID(event_id),
                    )
                    

                    if delete_result:
                        results.append({
                            "response": f"Event '{event_name}' deleted successfully!",
                            "action": "delete_event",
                            "event_id": event_id,
                        })
                    else:
                        results.append({
                            "error": f"Failed to delete event '{event_id}'."
                        })

                except Exception as e:
                    results.append({"error": f"Error deleting event: {str(e)}"})

                processed_actions += 1
                continue
                        
            elif intent == "clarify": #asks user for missing action needed for update or delete
                message = action.get("message", "Can you please clarify your request?")
                return { "response": message}

            elif intent == "add_participant":
                event_id = action.get("event_id")
                participant_name = action.get("participant_name")

                if not event_id or not participant_name:
                    return {"error": "Missing event_id or participant_name."}

                try:
                    participant = add_event_participant(
                        db = session,
                        event_id = uuid.UUID(event_id),
                        name = participant_name,
                        info  = action.get("participant_info"),
                        full_address = action.get("participant_location"),
                    )
                    return {
                        "response": f"Added {participant.name} to the event.",
                        "action": "add_participant",
                        "participant": {
                            "participant_id": str(participant.participant_id),
                            "name": participant.name,
                            "action": participant.info,
                            "full_address": participant.full_address,
                        },
                    }
                except Exception as e:
                    return {"error": f"Error adding participant: {str(e)}"}

            elif intent == "remove_participant":
                participant_id = action.get("participant_id")

                if not participant_id:
                    return {"error": "Missing participant_id."}

                try:
                    remove_event_participant(db = session, event_id = uuid.UUID(event_id), participant_id = uuid.UUID(participant_id))
                    return {
                        "response": "Participant removed.",
                        "action": "remove_participant",
                        "participant_id": participant_id,
                    }
                except Exception as e:
                    return {"error": f"Error removing participant: {str(e)}"}

            elif intent == "list_participants":
                event_id = action.get("event_id")
                range_type = action.get("range_type")
                target_date = action.get("target_date")

                if range_type in {"day", "week", "month"}:
                    return _build_participant_listing(calendar_context, range_type, target_date, data.current_time)

                if not event_id:
                    return {"response": "Which event should I list participants for?", "action": "clarify"}

                try:
                    participants = get_participants_for_event(db = session, event_id = uuid.UUID(event_id))
                    participant_lines = []
                    if not participants:
                        return {
                            "response": "No participants are listed for this event.",
                            "action": "list_participants",
                            "event_id": event_id,
                            "participants": [],
                        }
                    for p in participants:
                        if p.info:
                            participant_lines.append(f"- {p.name}: {p.info}")
                        else:
                            participant_lines.append(f"- {p.name}")

                    response_text = "Participants for this event:\n" + "\n".join(participant_lines)
                        
                    return {
                        "response": response_text,
                        "action": "list_participants",
                        "participants": [
                            {
                                "participant_id": str(p.participant_id),
                                "name": p.name,
                                "info": p.info,
                                "full_address": p.full_address,
                            }
                            for p in participants
                        ],
                    }
                except Exception as e:
                    return {"error": f"Error listing participants: {str(e)}"}

            elif intent == "get_participant_info":
                participant_id = action.get("participant_id")
                if not participant_id:
                    return {"error": "Missing participant_id."}

                try:
                    participant = get_participant_details(db = session, participant_id = uuid.UUID(participant_id))
                    if participant is None:
                        return {"error": "Participant not found"}

                    return {
                        "response": f"Found participant {participant.name}.",
                        "action": "get_participant_info",
                        "participant": {
                            "participant_id": str(participant.participant_id),
                            "name": participant.name,
                            "info": participant.info,
                            "full_address": participant.full_address,
                            "event_id": str(participant.event_id),
                        },
                    }
                
                except Exception as e:
                    return {"error": f"Error getting participant action: {str(e)}"}
                
        processed_actions += 1

        if len(results) == 1:
            return results[0]

    return {"intent": "multiple", "results": results}




WEEKDAY_MAP = {"MO": 0,"TU": 1,"WE": 2,"TH": 3,"FR": 4,"SA": 5,"SU": 6,}

def parse_hhmm(value: str):
    return datetime.strptime(value, "%H:%M").time()

# Written by Luis: takes a dict of actions and returns a list of tuples with start time and end time.
def handle_recurrence(action: dict[str, Any]) -> list[tuple[datetime, datetime]]:
    recurrence = action.get("recurrence") or {}

    days_of_week = recurrence.get("days_of_week") or []
    start_date_str = recurrence.get("start_date")
    end_date_str = recurrence.get("end_date")
    start_time_str = recurrence.get("start_time_of_day")
    end_time_str = recurrence.get("end_time_of_day")
    duration = int(action.get("duration_minutes") or 60)

    if not days_of_week:
        raise ValueError("Recurring event is missing days_of_week.")
    if not start_date_str:
        raise ValueError("Recurring event is missing start_date.")
    if not end_date_str:
        raise ValueError("Recurring event is missing end_date.")
    if not start_time_str:
        raise ValueError("Recurring event is missing start_time_of_day.")

    start_day = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    
    end_day = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    start_clock = parse_hhmm(start_time_str)
    if end_time_str:
        end_clock = parse_hhmm(end_time_str)

        # PUT THE CHECK HERE
        if end_clock <= start_clock:
            raise ValueError(
                "end_time_of_day must be later than start_time_of_day for this recurring event."
            )
        
    if end_day < start_day:
        raise ValueError("recurrence end_date cannot be before start_date.")

    valid_weekdays = {WEEKDAY_MAP[d] for d in days_of_week if d in WEEKDAY_MAP}
    start_clock = parse_hhmm(start_time_str)

    occurrences: list[tuple[datetime, datetime]] = []
    current_day = start_day

    while current_day <= end_day:
        if current_day.weekday() in valid_weekdays:
            start_dt = datetime.combine(current_day, start_clock)

            if end_time_str:
                end_clock = parse_hhmm(end_time_str)
                end_dt = datetime.combine(current_day, end_clock)
                if end_dt <= start_dt:
                    end_dt += timedelta(days=1)
            else:
                end_dt = start_dt + timedelta(minutes=duration)

            occurrences.append((start_dt, end_dt))

        current_day += timedelta(days=1)

    if not occurrences:
        raise ValueError("No occurrences were generated from the recurrence rule.")

    if len(occurrences) > 120:
        raise ValueError("Too many recurring occurrences. Limit is 120.")

    return occurrences
