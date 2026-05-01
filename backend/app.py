from fastapi import FastAPI
from backend.chat import router as chat_router

app = FastAPI(title="CalendarAI Backend")

app.include_router(chat_router, prefix="/chat")
