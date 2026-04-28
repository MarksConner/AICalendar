from typing import Any, List, Optional
from uuid import uuid4
import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from backend.llm_agent import ask_llm


from pydantic import BaseModel, Field
from typing import List, Optional


class ParticipantForSuggestion(BaseModel):
    name: Optional[str] = None
    info: Optional[str] = None
    role: Optional[str] = None
    full_address: Optional[str] = None


class EventForSuggestion(BaseModel):
    title: Optional[str] = None
    event_name: Optional[str] = None
    name: Optional[str] = None

    startTime: Optional[str] = None
    start_time: Optional[str] = None
    start: Optional[str] = None

    endTime: Optional[str] = None
    end_time: Optional[str] = None
    end: Optional[str] = None

    location: Optional[str] = None
    full_address: Optional[str] = None
    address: Optional[str] = None

    description: Optional[str] = None
    event_description: Optional[str] = None

    distance_from_user: Optional[str] = None
    travel_distance: Optional[str] = None
    distance: Optional[str] = None
    travel_time_min: Optional[int] = None

    participants: List[ParticipantForSuggestion] = Field(default_factory=list)

    def get_title(self) -> str:
        return self.event_name or self.title or self.name or "Untitled event"

    def get_start(self) -> Optional[str]:
        return self.startTime or self.start_time or self.start

    def get_end(self) -> Optional[str]:
        return self.endTime or self.end_time or self.end

    def get_location(self) -> Optional[str]:
        return self.full_address or self.location or self.address

    def get_description(self) -> Optional[str]:
        return self.description or self.event_description

    def get_distance(self) -> Optional[str]:
        if self.distance_from_user:
            return self.distance_from_user
        if self.travel_distance:
            return self.travel_distance
        if self.distance:
            return self.distance
        if self.travel_time_min is not None:
            return f"{self.travel_time_min} minutes"
        return None


class SuggestionRequest(BaseModel):
    date: str
    current_time: dict | None = None
    events: List[EventForSuggestion] = Field(default_factory=list)


class SuggestionItem(BaseModel):
    id: str
    title: str
    description: str
    category: Optional[str] = None

    event_name: Optional[str] = None
    distance_from_user: Optional[str] = None
    participants_summary: Optional[str] = None
    reminder: Optional[str] = None


class SuggestionResponse(BaseModel):
    suggestions: List[SuggestionItem]



def format_events_for_llm(events: List[EventForSuggestion]) -> str:
    if not events:
        return "No events for this selected day."

    lines: List[str] = []
    for event in events:
        line = f"Event: {event.get_title()}"

        start = event.get_start()
        end = event.get_end()
        location = event.get_location()
        description = event.get_description()
        distance  = event.get_distance() 

        if start and end:
            line += f" from {start} to {end}"
        elif start:
            line += f" starting at {start}"

        if location:
            line += f" at {location}"
        if description:
            line += f". Description: {description}"
        if distance:
            line += f". Travel time from user: {distance}"
        
        if event.participants:
            participant_lines = []

            for participant in event.participants:
                participant_text = f"- {participant.name or 'Unnamed participant'}"

                if participant.info:
                    participant_text += f": {participant.info}"

                if participant.role:
                    participant_text += f" ({participant.role})"

                if participant.full_address:
                    participant_text += f", address: {participant.full_address}"

                participant_lines.append(participant_text)


        lines.append(line)

    return "\n".join(lines)


def generate_prompt(date: str,events: List[EventForSuggestion],current_time: Optional[dict[str, Any]] = None) -> str:
    current_time = current_time or {}
    user_current_time = (current_time.get("user_current_datetime")or current_time.get("user_current_time")or "Unknown")
    user_timezone = current_time.get("user_timezone") or "Unknown"
    next_upcoming_event_name = get_next_upcoming_event_name(events, current_time)
    print(user_current_time)

    return f"""
You are generating AI day hints for ONE selected calendar day only.
Next upcoming event for Schedule Insight:
{next_upcoming_event_name or "No upcoming events left today"}

Selected date:
{date}

User current local time:
{user_current_time}

User timezone:
{user_timezone}

Events for this selected day only:
{format_events_for_llm(events)}

Return ONLY a valid JSON array with EXACTLY 3 objects.

The 3 objects must be:

1. Schedule Insight event card
- category must be "Schedule Insight"
- Use ONLY the event named under "Next upcoming event for Schedule Insight".
- Do not choose any other event for Schedule Insight.
- If it says "No upcoming events left today", say there are no remaining upcoming events.
- Include event_name.
- Include useful event details in description.
- If the event has participants, summarize them in participants_summary.
- If particants have emails in their info provide their emails
- If the event has a description, use it to create reminder.
- If travel time exists, include distance_from_user.

2. Tip card
- category must be Tip"
- Give one useful tip about the selected day schedule.
- This can be about prioritizing, preparing, studying, resting, or managing gaps.
- Include how many events for the day.
- If there is a description field in events such as studying, reminder, prioritize to mention this.
- Check the priority levels of the events and give a tip if there is less than 30 minutes between important events
- If the event has participants, summarize them in participants_summary.
- If particants have emails in their info provide their emails
- Do NOT include distance_from_user unless directly necessary.

3. Travel card
- category must be "Travel"
- Mention travel time or travel preparation if location/travel time exists.
- If no travel time exists, give a general location/travel reminder.
- Include distance_from_user if available.
- Do NOT include participants_summary.

Rules:
- Only talk about the selected date above.
- Do not mention other days.
- Do not invent participants, distances, locations, or descriptions.
- Keep each card short and readable.
- Do not return more than 3 cards.

Each object must have:
- id
- title
- description
- category
- event_name
- distance_from_user
- participants_summary
- reminder

Allowed categories:
- "Schedule Insight"
- "Tip"
- "Travel"

Example:
[
  {{
    "id": "1",
    "description": "You have Automata and Formal Languages from 12:00 to 13:15.",
    "category": "Schedule Insight",
    "event_name": "Automata and Formal Languages",
    "distance_from_user": "12 min travel",
    "participants_summary": null,
    "reminder": "Study the Turing machine material before the quiz."
  }},
  {{
    "id": "2",
    "description": "Your afternoon has multiple events, so leave a short buffer before dinner.",
    "category": "Tip",
    "event_name": null,
    "distance_from_user": null,
    "participants_summary": "Daniel is comming he likes beef",
    "reminder": null
  }},
  {{
    "id": "3",
    "description": "Plan extra time before leaving for your event location.",
    "category": "Travel",
    "event_name": "Dinner at Peppermill Casino",
    "distance_from_user": "12 min travel",
    "participants_summary": null,
    "reminder": null
  }}
]
""".strip()
    

def extract_json_array(text: str) -> str:
    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    if cleaned.startswith("[") and cleaned.endswith("]"):
        return cleaned

    match = re.search(r"\[[\s\S]*\]", cleaned)
    if match:
        return match.group(0)

    raise HTTPException(status_code=500, detail="LLM did not return a JSON array")


def normalize_suggestion_item(item: dict[str, Any]) -> SuggestionItem:
    return SuggestionItem(
        id=str(item.get("id") or uuid4()),
        title=str(item.get("title") or "Suggestion"),
        description=str(item.get("description") or ""),
        category=item.get("category"),
        event_name=item.get("event_name"),
        distance_from_user=item.get("distance_from_user"),
        participants_summary=item.get("participants_summary"),
        reminder=item.get("reminder"),
    )


def parse_llm_response(llm_output: str) -> List[SuggestionItem]:
    if not llm_output or not llm_output.strip():
        raise HTTPException(status_code=500, detail="LLM returned an empty response")

    json_text = extract_json_array(llm_output)

    try:
        raw = json.loads(json_text)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid LLM JSON: {e}")

    if not isinstance(raw, list):
        raise HTTPException(status_code=500, detail="LLM output must be a JSON array")

    suggestions: List[SuggestionItem] = []
    for item in raw:
        if isinstance(item, dict):
            suggestions.append(normalize_suggestion_item(item))

    return suggestions

def get_next_upcoming_event_name(events: List[EventForSuggestion],current_time: Optional[dict[str, Any]] = None) -> Optional[str]:
    current_time = current_time or {}
    user_current_minutes = current_time.get("user_current_minutes")

    if user_current_minutes is None:
        return None

    upcoming_events = []

    for event in events:
        start = event.get_start()
        if not start:
            continue

        try:
            event_time = start.split("T")[1]
            hour = int(event_time[0:2])
            minute = int(event_time[3:5])
            event_minutes = hour * 60 + minute

            if event_minutes > user_current_minutes:
                upcoming_events.append((event_minutes, event.get_title()))
        except Exception:
            continue

    if not upcoming_events:
        return None

    upcoming_events.sort()
    return upcoming_events[0][1]