from typing import Any, Optional

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



class AddEventParticipant(BaseModel):
    event_id: UUID
    name: str
    info: str | None = None
    full_address: str | None = None


class RemoveEventParticipant(BaseModel):
    event_id: UUID
    participant_id: UUID


class ParticipantInfo(BaseModel):
    participant_id: UUID
    name: str
    info: str | None = None
    full_address: str | None = None


class EventParticipantInfo(BaseModel):
    event_id: UUID
    participant_id: UUID
    participant: ParticipantInfo

class ParticipantsForEvent(BaseModel):
    event_id: UUID
    participants: list[ParticipantInfo]



#Messages
class SendMessage(BaseModel):
    chat_id: UUID
    content: str
    sender_is: bool

class MessageResponse(BaseModel):
    message_id: UUID
    chat_id: UUID
    sender_is: bool
    content: str
    file_url: str | None = None

#Mapbox Services
class TravelTimeResponse(BaseModel):
    travel_time_min: int
    event_lat: float
    event_long: float


class LocalEventsRequest(BaseModel):
    latitude: float
    longitude: float
    radius_km: float = 25
    keyword: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class LocalEventSuggestion(BaseModel):
    source: str
    external_id: str
    title: str
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    venue_name: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    url: str | None = None
    image_url: str | None = None
    is_free: bool | None = None
    raw: dict[str, Any] | None = None


class AddSuggestedEventRequest(BaseModel):
    calendar_id: UUID
    title: str
    description: str | None = None
    address: str | None = None
    start_time: datetime
    end_time: datetime | None = None
    priority_rank: int = 3


class RouteRequest(BaseModel):
    user_latitude: float
    user_longitude: float
    destination: str


class RouteResponse(BaseModel):
    destination_name: str
    destination_latitude: float
    destination_longitude: float
    distance_meters: float
    duration_seconds: float
    geometry: dict[str, Any] | None = None


#Bookable events 

class BookingRequest(BaseModel):
    name: str
    email: str
    notes: str | None = None

class PublicBookingRequest(BaseModel):
    name: str
    email: str
    description: str | None = None