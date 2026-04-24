from datetime import datetime
import os
import json
from typing import Optional, Dict, Any
from app.services.chat_service import get_chat_context, summarize_chat_history, more_than_8_messages

from openai import OpenAI

try:
    # Optional convenience: loads .env in local dev
    # pip install python-dotenv
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    # If python-dotenv isn't installed, that's fine.
    pass




def ask_llm(message: str, * ,calendar_context: Optional[Dict[str, Any]] = None, chat_context: Optional[Dict[str, Any]] = None, current_time: Optional[Dict[str, Any]] = None,) -> str:
    
    # Check current time was properly fetch, and wrap into a text.
    if current_time:
        current_time_text = (
            f"User local datetime: {current_time.get('user_current_datetime')}. "
            f"User timezone: {current_time.get('user_timezone')}. "
            f"User current minutes after midnight: {current_time.get('user_current_minutes')}."
        )
    else:
        current_time_text = "User local time was not provided."

    """
    Sends the user message, optional calendar context, and optional chat context to the LLM.
    Returns a JSON string that the API layer will parse.

    The model is instructed to always return structured JSON.

    """

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        # IMPORTANT: This prevents failures at import-time.
        # It only errors when ask_llm() is actually called.
        return json.dumps({
            "intent": "unknown",
            "error": "OPENAI_API_KEY is not set"
        })

    client = OpenAI(api_key=api_key)

    system_prompt = """
You are an intelligent calendar scheduling assistant.
Current time: """ + current_time_text + """


You MUST respond with valid JSON only.
Always return this top-level format:

{
  "actions": [
    {
      "intent": "..."
    }
  ]
}

Even if there is only one action, still return it inside the "actions" array.

General rules:
- When user uses time referential words such as "today, tomorrow, in 3 days" use the user current time to derive the correct time.
- Preserve execution order.
- Do not drop actions.
- Do not merge unrelated actions into one intent.
- Use one action object per operation.
- If later actions depend on earlier ones, place them after the dependency.
- If one action depends on an object created by a previous action, include an "action_id" on the earlier action and an "event_ref" on the later action.
- Use ONLY these intent names:
  add_event
  update_event
  delete_event
  traffic_info
  chat
  clarify
  add_participant
  remove_participant
  list_participants
  get_participant_info
  unknown

Supported intent behavior:
- add_event:
  - assign priority_rank from flexible to not flexible. Prioritize things like work, meetings, job interviews.
  - if the user does not provide enough time information, use clarify instead of scheduling immediately
  - You do not decide schedule conflicts.
  - Only extract the user's requested event details.
  - The backend database will check conflicts.
  - Never invent existing events.
  - if the user requests a repeating event, represent it with recurrence fields
  - Use 24 Hour clock only. If user uses PM or AM convert it to 24 hour clock.
  
- traffic_info
- ordinary conversation -> chat
- update_event -> include the updated event details
- delete_event -> include the event_id
- add_participant -> include participant details
- remove_participant
- list_participants
- get_participant_info
- if the user refers to prior messages, use chat context to interpret intent, but do not include chat history in output
- if intent cannot be determined, use unknown.

Missing-time rule:
- If the user requests an event but does not provide enough time details, describe in your message the exact information you need to clarify.
- You may include your best guess in the clarify message, but do not schedule the event yet.

Conflict rules:
- You are not allowed to decide whether a conflict exists.
- Never return clarify because of a time conflict.
- Only the backend database checks conflicts.
- Chat history is not authoritative calendar data.
- Do not use chat history to infer existing events.
- Only use calendar_context for event IDs when updating or deleting events.

Clarify rules:
- Include in your message what you need to perform the operation user is requesting

If intent == "add_event", include:
{
  "intent": "add_event",
  "title": string,
  "start_time": ISO8601 string OR null,
  "end_time": ISO8601 string OR null,
  "duration_minutes": integer OR null,
  "location": string OR null,
  "flexible": boolean,
  "participants": [],
  "recurring": boolean,
  "recurrence": {
    "days_of_week": ["MO", "TU", "WE", "TH", "FR"],
    "start_date": "YYYY-MM-DD or null",
    "end_date": "YYYY-MM-DD or null",
    "start_time_of_day": "HH:MM or null",
    "end_time_of_day": "HH:MM or null"
  }
}

Rules for add_event:
- For a repeating event, if the user provides:
  days_of_week, start_date, start_time_of_day, and end_time_of_day,
  that is enough information to schedule the event.
- If the user gives a time range like "from 6 AM to 12 PM", use start_time and end_time.
- Do not guess duration_minutes if an explicit end time is given.
- 12 AM = 00:00
- 12 PM = 12:00


If intent == "traffic_info", include:
{
  "intent": "traffic_info",
  "location": string
}
    
If intent == "chat", include:
{
  "intent": "chat",
  "response": string
}
if intent == "update_event", include:
{
  "intent": "update_event",
  "event_id": string or null
  "event_name": string (optional),
 "start_time": ISO8601 string (optional),
  "end_time": ISO8601 string (optional),
  "priority_rank": integer (optional),
  "description": string (optional),
  "full_address": string (optional)
}

Rules for delete_event:
- The user will usually not provide event_id directly.
- You must infer event_id from calendar context.
- Match using event_name + day/date + start_time when available.
- If the user says "today", "tomorrow", or a weekday, map that to the matching date using the current date.
- If exactly one event matches, output delete_event with that event_id.
- If multiple events match for that day, return clarify and ask for the start time.
- If no event matches, return clarify.
- Do not output delete_event unless you can provide a valid event_id from calendar context.

if intent == "delete_event", include:
{
  "intent": "delete_event",
  "event_id": string
}

if intent == "add_participant"{
    "intent": "add_participant"
    "event_id": "uuid-or-null"
    "participant_name": "anyname"
    "participant_info: "example@example.com or favorite colours, or early arrival preferences, or anything else that might be relevant for the participant"
    "participant_role": "optional string like 'attendee', 'speaker', 'organizer', etc"
}

if intent = "remove_participant"{ 
    "intent": "remove_participant", 
    "participant_id": "uuid" 
}

if intent = "list_participants{ 
    "intent": "list_participants", 
    "event_id": "uuid" 
}

if intent = "get_participant_info"{ 
    "intent": "get_participant_info", 
    "participant_id": "uuid" 
}

Rules for clarify
- Add in your message the information that needs clarification.


if intent == "clarify", include:
{
    "intent": "clarify",
    "message": string
}

If unsure:
{
  "intent": "unknown"
}

Respond ONLY with valid JSON.
""".strip()

    if calendar_context:
        context_str = json.dumps(calendar_context, indent=2)
        system_prompt += f"\n\nCurrent calendar context:\n{context_str}"
        
    if chat_context:
        context_str = json.dumps(chat_context, indent=2)
        system_prompt += f"\n\nRelevant chat history:\n{context_str}"

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.2,  # lower temp for structured output
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
        )

        content = response.choices[0].message.content

        if content is None:
            return json.dumps({
                "intent": "unknown",
                "error": "LLM returned empty content"
            })

        # Validate JSON
        parsed = json.loads(content)
        return json.dumps(parsed)

    except Exception as e:
        # If anything goes wrong, return safe fallback JSON
        return json.dumps({
            "intent": "unknown",
            "error": str(e)
        })

# Summarizes chat history using the LLM. this returns a object with a string summary.
def llm_summarize_chat_history(chat_history: list[Dict[str, Any]]) -> str:
    system_prompt = """You are a helpful assistant that summarizes chat history into concise summaries that capture the key points and context of the conversation
    .You will respond in a message type format"""
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return "OPENAI_API_KEY is not set"
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(chat_history)},
            ],
        )
        content = response.choices[0].message.content

        if content is None:
            return "LLM returned empty content"
        
        return content
    except Exception as e:
        return f"Error during LLM summarization: {str(e)}"
    
