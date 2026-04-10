from typing import Optional

from pydantic import BaseModel
from  datetime import datetime
from uuid import UUID    


#User pydantic operations
class UserCreate(BaseModel):
    email: str
    username: str
    first_name: str
    last_name: str
    password: str 

class UserLogin(BaseModel):
    email: str
    password: str 


class UserEmailVerify(BaseModel):
    email: str

class UserUpdatePassword(BaseModel):
    email: str
    token: str
    new_password: str

#JWT
class AccessToken(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    user_id: UUID
    email: str

class RefreshRequest(BaseModel):
    refresh_token: str

    
#Calendar pydantic operations
class CalendarCreate(BaseModel):
    user_id: UUID
    calendar_name: str
    date_start: Optional[datetime] = None
    date_end: Optional[datetime] = None

class CalendarRead(CalendarCreate):
    calendar_id: UUID
    updated_at: datetime
    user_id: UUID

#Event pydantic class 
class EventCreate(BaseModel):
    calendar_id: UUID
    event_name: str
    event_description: Optional[str] = None
    full_address: Optional[str] = None
    priority_rank: Optional[int] = 0
    start_time: datetime
    end_time: Optional[datetime] = None

class EventUpdate(BaseModel):
    event_name: Optional[str] = None
    event_description: Optional[str] = None
    full_address: Optional[str] = None
    priority_rank: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class EventRead(EventCreate):
    event_id: UUID
    created_at: datetime

#Chat 
class CreateChat(BaseModel):
    chat_title: str
    user_id: UUID


class CreateChatOnFirstMessage(BaseModel):
    content:str

#Messages
class SendMessage(BaseModel):
    chat_id: UUID
    content: str

class MessageResponse(BaseModel):
    message_id: UUID
    chat_id: UUID
    sender_is: bool
    content: str
    file_url: str | None = None

