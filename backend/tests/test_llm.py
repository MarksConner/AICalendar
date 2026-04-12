import json
from datetime import datetime

import backend.chat as chat_module
from backend.schedule import Schedule
from backend.event import Event
from backend.api_llm_agent import SuggestionRequest, SuggestionResponse, EventForSuggestion, SuggestionItem, generate_prompt, parse_llm_suggestions, ask_llm_for_suggestions, create_suggestion_response
