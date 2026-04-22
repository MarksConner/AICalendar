from datetime import timedelta
import json
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.orm import Session
from typing import Any

from backend.llm_agent import ask_llm, llm_summarize_chat_history
from backend.schedule import Schedule
from backend.errors import ConflictError
from backend.mapbox import get_directions

from app.db import SessionLocal
from app.services.calendar_service import get_calendar_context
from app.services.chat_service import get_chat_context, more_than_8_messages, summarize_chat_history
from app.services.events_service import (
    create_event, update_event, remove_event, add_event_participant,
    get_participants_for_event, remove_event_participant, get_participant_details
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter()
schedule = Schedule()

class UserMessage(BaseModel):
    message: str
    calendar_id: str | None = None
    location: str | None = None
    chat_id: str | None = None

@router.post("")
def chat(data: UserMessage):
    # short-lived read session
    with SessionLocal() as read_db:
        calendar_context = get_calendar_context(read_db, data.calendar_id) if data.calendar_id else None
        chat_context = get_chat_context(read_db, data.chat_id) if data.chat_id else None

    # no DB session held during LLM call
    llm_output = ask_llm(data.message,calendar_context=calendar_context,chat_context=chat_context)

    if not llm_output:
        return {"error": "LLM returned an empty response"}

    try:
        action = json.loads(llm_output)
    except Exception as e:
        return {"error": f"Invalid JSON from LLM: {e}", "raw": llm_output}

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
                duration = int(action.get("duration_minutes") or 60)
                priority = action.get("priority_rank", 0)
                recurring = bool(action.get("recurring"))

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
                            created_event = create_event(
                                db=session,
                                calendar_id=uuid.UUID(data.calendar_id),
                                event_name=title,
                                full_address=location or "",
                                start_time=oc_start_time,
                                end_time=oc_end_time,
                                description=action.get("description", ""),
                                priority_rank=priority,
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

                    if start and end:
                        start_dt = Schedule.parse_datetime(start)
                        end_dt = Schedule.parse_datetime(end)
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

                    created_event = create_event(
                        db=session,
                        calendar_id=uuid.UUID(data.calendar_id),
                        event_name=title,
                        full_address=location or "",
                        start_time=start_dt,
                        end_time=end_dt,
                        description=action.get("description", ""),
                        priority_rank=priority,
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

            
            elif intent == "traffic_action":
                if not data.location or not action.get("location"):
                    return {"error": "Missing starting location or destination."}

                travel = get_directions(data.location, action["location"])
                eta = travel['routes'][0]['duration'] / 60
                return {
                    "response": f"Traffic to {action['location']} is {eta:.1f} minutes."
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
                        results.append({"response": f"Event '{event_name}' updated successfully!",
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
                    delete_result = remove_event(
                        db=session,
                        event_id=uuid.UUID(event_id),
                    )

                    if delete_result:
                        results.append({
                            "response": f"Event '{event_id}' deleted successfully!",
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
                return {
                    "response": message
                }

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
                        action = action.get("participant_action"),
                        full_address = action.get("participant_location"),
                    )
                    return {
                        "response": f"Added {participant.name} to the event.",
                        "action": "add_participant",
                        "participant": {
                            "participant_id": str(participant.participant_id),
                            "name": participant.name,
                            "action": participant.action,
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

                if not event_id:
                    return {"error": "Missing event_id."}

                try:
                    participants = get_participants_for_event(db = session, event_id = uuid.UUID(event_id))
                    return {
                        "response": "Here are the participants.",
                        "action": "list_participants",
                        "participants": [
                            {
                                "participant_id": str(p.participant_id),
                                "name": p.name,
                                "action": p.action,
                                "full_address": p.full_address,
                                "event_id": str(p.event_id),
                            }
                            for p in participants
                        ],
                    }
                except Exception as e:
                    return {"error": f"Error listing participants: {str(e)}"}

            elif intent == "get_participant_action":
                participant_id = action.get("participant_id")
                if not participant_id:
                    return {"error": "Missing participant_id."}

                try:
                    participant = get_participant_details(db = session, participant_id = uuid.UUID(participant_id))
                    if participant is None:
                        return {"error": "Participant not found"}

                    return {
                        "response": f"Found participant {participant.name}.",
                        "action": "get_participant_action",
                        "participant": {
                            "participant_id": str(participant.participant_id),
                            "name": participant.name,
                            "action": participant.action,
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