from fastapi import FastAPI
from app.api import users  
from app.api import calendar  
from app.api import events_api
from app.api import chat_api
from app.api import messages_api
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.include_router(calendar.router) 
app.include_router(users.router)  
app.include_router(events_api.router)
app.include_router(chat_api.router)
app.include_router(messages_api.router)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

