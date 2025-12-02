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
    

class EmailModel(BaseModel):
    addresses: list[str]
    
#Calendar pydantic operations
class CalendarCreate(BaseModel):
    calendar_name: str
    date_start: datetime 
    date_end: datetime

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

'''
  __tablename__ = "events"
    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_name = Column(Text, nullable=False)
    event_description = Column(Text)
    full_address = Column(Text)
    priority_rank = Column(Integer)
    start_time = Column(TIMESTAMP, nullable=False)
    end_time = Column(TIMESTAMP)
    calendar_id = Column(UUID(as_uuid=True), ForeignKey('calendar.calendar_id'))
    created_at = Column(TIMESTAMP, server_default=func.now())
'''