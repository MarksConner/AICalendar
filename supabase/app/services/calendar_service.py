from app.db import SessionLocal
from app.models.calendar import Calendar
from sqlalchemy import UUID
from datetime import datetime

def create_calendar( calendar_name: str,user_id: UUID, date_start: datetime, date_end:datetime)->Calendar:
    session = SessionLocal()

    try:
        new_calendar = Calendar(    
        calendar_name=calendar_name, 
        date_start=date_start, 
        date_end = date_end, 
        user_id = user_id )
        session.add(new_calendar)
        session.commit()
        session.refresh(new_calendar)

        return new_calendar
    
    finally: 
        session.close()


def remove_event_from_calendar():
    pass

def get_events_by_calendar_id():
    pass

def add_event_to_calendar():
    pass





