# Chat logic (not database oriented, but it has some database operations from chat service).
# Defines how users communication with the AI agent will happen in conjuction with the database
# Written by: Luis Matheus Perdomo

# Functional Requirements
# FR5: Allows user to chat by using the database object to display messages.
# FR6: Allows AI agent to pull chat context to perfom operations

from datetime import datetime, timedelta
import uuid
import json

from sqlalchemy.orm import Session

from app.services import chat_service, messages_service
from app.services.calendar_service import get_calendar_context
from app.services.events_service import create_event
from backend.llm_agent import ask_llm


# Creates a chat (overlaps with create_chat_record)
def create_chat_with_first_message(session, user_id, content):
    chat = chat_service.create_chat_record(session, user_id, content)
    session.commit()
    return chat

# Handles the add event conversation logic. 
def handle_chat_message(session: Session, calendar_id: str, message: str):
    calendar_context = get_calendar_context(session, calendar_id)
    llm_response_str = ask_llm(message, calendar_context=calendar_context)
    llm_response = json.loads(llm_response_str)

    intent = llm_response.get("intent")
    if intent == "add_event":
        return handle_add_event_intent(session, calendar_id, llm_response)

    return llm_response


# When the AI agent parses intent as add_event this function parses for the fields in the database and creates event in the database
def handle_add_event_intent(session: Session, calendar_id: str, llm_response: dict):
    title = llm_response.get("title")
    start_str = llm_response.get("datetime")
    duration_minutes = llm_response.get("duration_minutes", 60)
    location = llm_response.get("location")

    if not title or not start_str:
        return {
            "intent": "add_event",
            "response": "I need a title and time to create the event.",
            "created": False
        }

    try:
        start_dt = datetime.fromisoformat(start_str)
    except ValueError:
        return {
            "intent": "add_event",
            "response": "I understood the event, but the time format was invalid.",
            "created": False
        }

    try:
        calendar_uuid = uuid.UUID(calendar_id)
    except ValueError:
        return {
            "intent": "add_event",
            "response": "Calendar ID is invalid.",
            "created": False
        }

    end_dt = start_dt + timedelta(minutes=duration_minutes)

    created_event = create_event(db=session,calendar_id=calendar_uuid,event_name=title,full_address=location or "",start_time=start_dt,end_time=end_dt,description="",priority_rank=0,)

    return {"intent": "add_event","response": f"Created event '{title}'.","created": True,"event_id": str(created_event.event_id)}
