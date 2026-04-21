from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.api import users
from app.api import calendar
from app.api import events_api
from app.api import chat_api
from app.api import messages_api

# LLM agent for AI suggestions and chatbot. Backend Folder
from backend.chat import router as chat_router
from backend.llm_routes import router as  ai_suggestions_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://frontend-production-134c.up.railway.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calendar.router)
app.include_router(users.router)
app.include_router(events_api.router)
app.include_router(chat_api.router)
app.include_router(messages_api.router)
app.include_router(ai_suggestions_router)
app.include_router(chat_router, prefix="/chat", tags=["chat"])

