from fastapi import FastAPI
from pydantic import BaseModel
from services.llm_agent import ask_llm
from services.mapbox import get_directions
from services.scheduler import Scheduler

import json

app = FastAPI()
scheduler = Scheduler()  #one global scheduler for now

class UserMessage(BaseModel):
    message: str
    location: str | None = None  #user's starting location


@app.post("/chat")
def chat(data: UserMessage):
    #Giving the agent more context
    calendar_context = {
        "existing_events": [ev.to_dict() for ev in scheduler.events],
        "preferences": {
            "work_hours": {
                "start": "09:00",
                "end": "17:00",
                "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            },
            "no_late_meetings_after": "20:00"
        }
    }

    #ask the LLM
    llm_output = ask_llm(data.message)

    if not llm_output:
        return {"error": "LLM returned an empty response"}

    #convert LLM output to dict
    try:
        info = json.loads(llm_output)
    except Exception as e:
        return {"error": f"Invalid JSON from LLM: {e}", "raw": llm_output}

    intent = info.get("intent", "unknown")


    #handle add event

    if intent == "add_event":
        title = info.get("title", "Untitled Event")
        start = info.get("datetime")
        location = info.get("location")
        duration = int(info.get("duration_minutes", 60))
        flexible = info.get("flexible", False)

        if start is None:
            return {"error": "Event datetime missing from LLM output."}

        #compute travel time if starting location is provided
        travel_minutes = 0
        if data.location and location:
            travel = get_directions(data.location, location)
            travel_minutes = int(travel["routes"][0]["duration"] / 60)

        #add the event to the scheduler
        placed_event = scheduler.add_event(
            title=title,
            start=start,
            duration_minutes=duration,
            location=location,
            flexible=flexible,
            travel_time=travel_minutes
        )

        return {
            "response": f"Event '{title}' scheduled!",
            "event": placed_event,
            "all_events": [ev.to_dict() for ev in scheduler.events]
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


    else:
        return {"response": "I didn't understand that, can you rephrase?"}
