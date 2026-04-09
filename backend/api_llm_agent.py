from typing import Any, List, Optional
from uuid import uuid4
import json
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.llm_agent import ask_llm

router = APIRouter(prefix="/ai", tags=["ai"])


class EventForSuggestion(BaseModel):
    title: Optional[str] = None
    event_name: Optional[str] = None
    name: Optional[str] = None

    startTime: Optional[str] = None
    start_time: Optional[str] = None

    endTime: Optional[str] = None
    end_time: Optional[str] = None

    location: Optional[str] = None
    full_address: Optional[str] = None

    description: Optional[str] = None
    event_description: Optional[str] = None

    def get_title(self) -> str:
        return self.title or self.event_name or self.name or "Untitled event"

    def get_start(self) -> Optional[str]:
        return self.startTime or self.start_time

    def get_end(self) -> Optional[str]:
        return self.endTime or self.end_time

    def get_location(self) -> Optional[str]:
        return self.location or self.full_address

    def get_description(self) -> Optional[str]:
        return self.description or self.event_description


class SuggestionRequest(BaseModel):
    date: str
    events: List[EventForSuggestion] = []


class SuggestionItem(BaseModel):
    id: str
    title: str
    description: str
    category: Optional[str] = None


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

        if start and end:
            line += f" from {start} to {end}"
        elif start:
            line += f" starting at {start}"

        if location:
            line += f" at {location}"

        if description:
            line += f". Description: {description}"

        lines.append(line)

    return "\n".join(lines)


def generate_prompt(date: str, events: List[EventForSuggestion]) -> str:
    return f"""
You are generating AI suggestions for ONE selected calendar day only.

Selected date:
{date}

Events for this selected day only:
{format_events_for_llm(events)}

Rules:
- Only talk about the selected date above.
- Do not mention the week, other days, tomorrow, yesterday, or upcoming days.
- Do not give generic weekly advice.
- Base every suggestion only on the events listed for this selected date.
- If there are no events, give only general suggestions for this one day.

Return ONLY a valid JSON array.
Each object must have:
- id
- title
- description
- optional category

Allowed categories:
- "travel"
- "tip"
- "info"

Example:
[
  {{
    "id": "1",
    "title": "Leave a short buffer",
    "description": "Your afternoon blocks are close together, so a short reset gap may help.",
    "category": "tip"
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


@router.post("/day-suggestions", response_model=SuggestionResponse)
def get_day_suggestions(request: SuggestionRequest):
    prompt = generate_prompt(request.date, request.events)
    llm_output = ask_llm(prompt)
    suggestions = parse_llm_response(llm_output)
    return SuggestionResponse(suggestions=suggestions)