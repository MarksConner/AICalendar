from typing import Any, List, Optional
from uuid import uuid4
import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.llm_agent import ask_day_hints_llm
from backend.llm_day_tips import SuggestionResponse,  SuggestionRequest, generate_prompt, parse_llm_response, sanitize_suggestions_for_time


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/day-suggestions", response_model=SuggestionResponse)
def get_day_suggestions(request: SuggestionRequest):
    prompt = generate_prompt(request.date, request.events, request.current_time)
    llm_output = ask_day_hints_llm(prompt)
    suggestions = parse_llm_response(llm_output)
    suggestions = sanitize_suggestions_for_time(suggestions, request.events, request.current_time)
    return SuggestionResponse(suggestions=suggestions)
