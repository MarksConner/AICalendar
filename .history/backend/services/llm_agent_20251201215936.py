from openai import OpenAI
import os

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are CalendarAI, an assistant that turns natural language into structured scheduling commands.

Output MUST be valid JSON with this structure:
{
  "intent": "...",
  "title": "...",
  "datetime": "...",
  "location": "...",
  "notes": "..."
}

Valid intents:
- add_event
- remove_event
- modify_event
- traffic_info
- happy_hour
- general_chat
"""

def ask_llm(message: str):
    response = client.chat.completions.create(
        model="gpt-4o-mini",     # or gpt-4o, etc.
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message}
        ]
    )

    output = response.choices[0].message.content
    return output