from app.db import SessionLocal
from app.models.events import Events
from app.models.event_participants import EventParticipants
from sqlalchemy import UUID
from datetime import datetime

def create_event(calendar_id: UUID, event_name: str, full_address: str, start_time:datetime, end_time: datetime, description: str, priority_rank: int) -> Events:
    session = SessionLocal()
    try:
        new_event =  Events(calendar_id=calendar_id,
            event_name=event_name,
            start_time=start_time,
            end_time=end_time,
            event_description=description,
            priority_rank=priority_rank,
            full_address= full_address
            )
        session.add(new_event)
        session.commit()
        session.refresh(new_event)
        return new_event
    finally:
        session.close()
        

def update_event():
    pass

def remove_event():
    pass

def add_event_participant():
    pass

def remove_event_participant():
    pass

def get_event_by_id():
    pass

def detect_event_conflicts():
    pass