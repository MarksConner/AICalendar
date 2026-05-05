# Messages API routes.
# Routes that allow api_client + appDataService to connect to the database related operations in the messages services. 
# Written By: Luis Matheus Perdomo

# Inherits all the FR's of calendars services.
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models.users import Users
from app.config import get_current_user
from app.api.base_model_classes import SendMessage, MessageResponse
from app.services.messages_service import (create_message,get_message_by_id,get_messages_by_chat_id)
from app.db import SessionLocal

router = APIRouter(prefix="/messages", tags=["messages"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/debug")
def debug_messages():
    return {"status": "messages router is working"}

@router.post("/send_message", response_model=MessageResponse)
def send_message(new_message: SendMessage, db: Session = Depends(get_db)):
    if(new_message.sender_is == True):
        message = create_message(db,new_message.chat_id,new_message.content,True)
    else:
        message = create_message(db,new_message.chat_id,new_message.content,False)
    if not message:
        raise HTTPException(status_code=400, detail="Message could not be created")

    return message
