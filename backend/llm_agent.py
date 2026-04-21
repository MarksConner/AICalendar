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




def ask_llm(message: str, * ,calendar_context: Optional[Dict[str, Any]] = None, chat_context: Optional[Dict[str, Any]] = None) -> str:
        
    now = datetime.now()
    current_time_text = now.strftime("%Y-%m-%d %H:%M:%S")
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
You MUST respond in valid JSON format.

Supported intents:
- add_event, assign a priority rank to the event based on how important it seems and how much the user emphasizes it. Use a scale of 0-10, with 10 being highest priority. If the user doesn't provide enough info to determine priority, make your best guess based on the content and tone of the message.
- traffic_info
- if ordinary conversation use chat 
- if user intent is to update an event use update_event and include the updated event details. 
- if user wants to delete an event, use delete_event and include the event_id of the event to delete
- if user wants to add event participants use add_participants
    - participants info can include preferences, contact details, or any relevant information about the participant that might be useful for scheduling or communication purposes. it can be a combination of things
- if user does not give enough information to update or delete an event, respond with clarify
- if user asks for participant details, use get_participant_info
- if user asks for a list of participants, use list_participants
- if user refers to prior messages in the chat for context, use the chat context to inform your response, but do not include the chat messages in your output. Instead, use the information from the chat context to determine the user's intent and how to respond.
- If you cant determine the intent, use unknown
- If user does not provide time details for an event, make your best guess based on the message content and any relevant chat context, but respond with clarify intent to confirm the inferred time details before proceeding with scheduling. 

If intent == "add_event", include:
{
  "intent": "add_event",
  "title": string,
  "datetime": ISO8601 string OR null,
  "earliest_start": ISO8601 string OR null,
  "latest_end": ISO8601 string OR null,
  "duration_minutes": integer,
  "location": string OR null,
  "flexible": boolean,
  "participants": [
    { "name": "Luis", "info": "string", "role": "guest" },
    { "name": "Ana", "info": "string", "role": "guest" }
  ]
}

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

if intent == "delete_event", include:
{
  "intent": "delete_event",
  "event_id": string
}

if intent == "add_participants"{
    "intent": "add_participant
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
    
