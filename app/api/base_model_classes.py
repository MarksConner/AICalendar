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
    
#Calendar pydantic operations
class CalendarCreate(BaseModel):
    calendar_name: str

class CalendarRead(CalendarCreate):
    calendar_id: UUID
    updated_at: datetime
    user_id: UUID

#Event pydantic operations
class EventCreate(BaseModel):
    calendar_id: UUID
    event_name: str
    event_description: str
    full_address: str
    priority_rank: int
    start_time: datetime
    end_time: datetime
    created_at: datetime


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

