from datetime import datetime
import os
import json
from typing import Optional, Dict, Any

from openai import OpenAI

try:
    # Optional convenience: loads .env in local dev
    # pip install python-dotenv
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    # If python-dotenv isn't installed, that's fine.
    pass




def ask_llm(
    message: str,
    *,
    calendar_context: Optional[Dict[str, Any]] = None
) -> str:
        
    now = datetime.now()
    current_time_text = now.strftime("%Y-%m-%d %H:%M:%S")
    """
    Sends the user message and optional calendar context to the LLM.
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
- add_event
- traffic_info
- if ordinary conversation use chat 
- unknown

If intent == "add_event", include:
{
  "intent": "add_event",
  "title": string,
  "datetime": ISO8601 string OR null,
  "earliest_start": ISO8601 string OR null,
  "latest_end": ISO8601 string OR null,
  "duration_minutes": integer,
  "location": string OR null,
  "flexible": boolean
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

If unsure:
{
  "intent": "unknown"
}

Respond ONLY with valid JSON.
""".strip()

    if calendar_context:
        context_str = json.dumps(calendar_context, indent=2)
        system_prompt += f"\n\nCurrent calendar context:\n{context_str}"

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