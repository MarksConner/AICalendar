from datetime import timedelta
import json
import uuid
from fastapi import APIRouter
from pydantic import BaseModel

from backend.llm_agent import ask_llm
from backend.mapbox import get_directions
from backend.schedule import Schedule
from backend.errors import ConflictError
from app.services.calendar_service import get_calendar_context
from app.services.events_service import create_event, update_event, remove_event # imported to connect create event to database
# database session for now--
from app.db import SessionLocal
session = SessionLocal()
#----------------


router = APIRouter()

schedule = Schedule()  #one global scheduler for now


class UserMessage(BaseModel):
    message: str
    calendar_id: str | None # Luis- added this for other routers call that need calendar_id 
    location: str | None = None  #user's starting location


@router.post("")
def chat(data: UserMessage):
    calendar_context = get_calendar_context(session, data.calendar_id) # Luis- changed this to connect database context to LLM 

    #ask the LLM
    llm_output = ask_llm(data.message, calendar_context=calendar_context)
    print("RAW LLM OUTPUT:", llm_output) # debug print 
    
    if not llm_output:
        return {"error": "LLM returned an empty response"}

    #convert LLM output to dict
    try:
        info = json.loads(llm_output)
        print("PARSED INFO:", info)
    except Exception as e:
        return {"error": f"Invalid JSON from LLM: {e}", "raw": llm_output}

    intent = info.get("intent", "unknown")
    print("INTENT:", intent) # debug print

    #handle add event

    if intent == "add_event":
        print("ENTERED ADD EVENT BRANCH") # debug print
        title = info.get("title", "Untitled Event")
        start = info.get("datetime")
        location = info.get("location")
        duration = int(info.get("duration_minutes", 60))
        priority = info.get("priority_rank", 0)

        #If model didn't give a concrete time, try window-based scheduling
        if start is None:
            earliest = info.get("earliest_start")
            latest = info.get("latest_end")

            if earliest and latest:
                slot = schedule.find_slot(earliest, latest, duration)
                if slot is None:
                    return {"Error": "No available time in that window."}
                else:
                    start_dt = slot
            else:
                return {"Error": "Event datetime missing and no time window provided"}
        else:
            start_dt = Schedule.parse_datetime(start)

        #compute travel time if starting location is provided
        travel_minutes = 0
        if data.location and location:
            travel = get_directions(data.location, location)
            travel_minutes = int(travel["routes"][0]["duration"] / 60)

        #add the event to the scheduler
        try:
            calendar_uuid = uuid.UUID(data.calendar_id)
            print("CREATING EVENT:", {
                "title": title,
                "start": start_dt,
                "duration": duration,
                "location": location,
                "priority": priority,
                "travel_minutes": travel_minutes,
            }) # debug print
            end_dt = start_dt + timedelta(minutes=duration)
            created_event  = create_event(
                db=session,
                calendar_id=calendar_uuid,
                event_name=title,
                full_address=location or "",
                start_time=start_dt,
                end_time=end_dt,
                description="",
                priority_rank=priority,
            )
            print("CREATED EVENT:", created_event) # debug print
            print("EVENT CREATED IN DATABASE") # debug print
            print("On calendar:", data.calendar_id) # debug print
            
    
        except ConflictError as e:
            return {"error": str(e)}

        return {
        "response": f"Event '{title}' scheduled!",
        "event": {
            "event_id": str(created_event.event_id),
            "event_name": created_event.event_name,
            "event_description": created_event.event_description,
            "full_address": created_event.full_address,
            "priority_rank": created_event.priority_rank,
            "start_time": created_event.start_time.isoformat() if created_event.start_time else None,
            "end_time": created_event.end_time.isoformat() if created_event.end_time else None,
            "calendar_id": str(created_event.calendar_id),
        }
    }

    #handle traffic info

    elif intent == "traffic_info":
        if not data.location or not info.get("location"):
            return {"error": "Missing starting location or destination."}

        travel = get_directions(data.location, info["location"])
        eta = travel['routes'][0]['duration'] / 60
        return {
            "response": f"Traffic to {info['location']} is {eta:.1f} minutes."
        }

    #handle simple chatting
    elif intent == "chat":
        return {
            "response": info.get("response", "Hello! How can I help you?")
        }

    elif intent == "update_event": # use api call in app folder.
        event_id = info.get("event_id")
        event_name = info.get("event_name")
        if not event_id:
            return {"error": "Missing event_id for update."}
        # check if at least one field to update is provided
        updatable_fields = ["event_name", "start_time", "end_time", "priority_rank", "description", "full_address"]
        if not any(field in info for field in updatable_fields):
            return {"error": "No fields to update provided."}
        
        # call the update_event function from events_service with the provided fields
        try:
            update_result = update_event(
                db=session,
                event_id=uuid.UUID(event_id),
                event_name=info.get("event_name"),
                start_time=Schedule.parse_datetime(info["start_time"]) if info.get("start_time") else None,
                end_time=Schedule.parse_datetime(info["end_time"]) if info.get("end_time") else None,
                priority_rank=info.get("priority_rank"),
                description=info.get("description"),
                full_address=info.get("full_address"),
            )
            if update_result:
                return {"response": f"Event '{event_name}' updated successfully!"}
            else:
                return {"error": f"Failed to update event '{event_id}'."}
        except Exception as e:
            return {"error": f"Error updating event: {str(e)}"}
        
    elif intent == "delete_event":
        event_id = info.get("event_id")
        if not event_id:
            return {"error": "Missing event_id for deletion."}
        try:
            delete_result = remove_event(
                db=session,
                event_id=uuid.UUID(event_id),
            )
            if delete_result:
                return {"response": f"Event '{event_id}' deleted successfully!"}
            else:
                return {"error": f"Failed to delete event '{event_id}'."}
        except Exception as e:
            return {"error": f"Error deleting event: {str(e)}"}
        
    elif intent == "clarify": #asks user for missing info needed for update or delete
        message = info.get("message", "Can you please clarify your request?")
        return {
            "response": message
        }
    
    else:
        return {"response": "I didn't understand that, can you rephrase?"}
    



