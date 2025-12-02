from fastapi import FastAPI
from app.api import users  
from app.api import calendar  
from app.api import events_api
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI()
app.include_router(calendar.router) 
app.include_router(users.router)  
app.include_router(events_api.router)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
def home():
    with open("app/signup.html", "r", encoding="utf-8") as f:
        return f.read()
    
@app.get("/dashboard", response_class=HTMLResponse)
def dashboard():
    with open("app/dashboard.html", "r", encoding="utf-8") as f:
        return f.read()
    
@app.get("/login", response_class=HTMLResponse)
def dashboard():
    with open("app/login.html", "r", encoding="utf-8") as f:
        return f.read()