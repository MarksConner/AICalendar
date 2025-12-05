from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.api.base_model_classes import CreateChat, SendMessage, CreateChatOnFirstMessage, MessageResponse
from app.services.chat_service import create_chat, delete_chat, delete_message_from_chat, get_messages_by_chat_id
from app.models.users import Users
from app.config import get_current_user
from sqlalchemy.orm import Session
from app.db import SessionLocal
from datetime import datetime, timezone
from typing import List


router = APIRouter(prefix="/chats", tags=["chats"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/first_message")
def createChatOnFirstMessage(firstMessage: CreateChatOnFirstMessage, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = create_chat(db, current_user.user_id, firstMessage.content)
    if not chat:
        raise HTTPException(status_code=400, details= "chat could not be created")
    return chat

@router.get("/get_all_messages_in_chat/{chat_id}", response_model=List[MessageResponse])
def get_all_messages(chat_id: UUID,db: Session = Depends(get_db)):
    all_messages = get_messages_by_chat_id(db, chat_id)
    if not all_messages:
        raise HTTPException(status_code=404,detail="No messages found for this chat")
    return all_messages


