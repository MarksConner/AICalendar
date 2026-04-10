from app.db import SessionLocal
from app.models.events import Events
from app.models.event_participants import EventParticipants
from sqlalchemy import UUID
from datetime import datetime
from sqlalchemy.orm import Session



def create_event(db: Session, calendar_id: UUID, event_name: str, full_address: str, start_time:datetime, end_time: datetime, description: str, priority_rank: int) -> Events:
    new_event =  Events(calendar_id=calendar_id,
        event_name=event_name,
        start_time=start_time,
        end_time=end_time,
        event_description=description,
        priority_rank=priority_rank,
        full_address= full_address
        )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event

def get_events_for_calendar_day(db: Session, calendar_id: UUID, day: datetime) -> list[Events]:
    start_of_day = datetime(day.year, day.month, day.day)
    end_of_day = datetime(day.year, day.month, day.day, 23, 59, 59)
    events = (db.query(Events).filter(Events.calendar_id == calendar_id).filter(Events.start_time >= start_of_day).filter(Events.start_time <= end_of_day).all())
    return events



def update_event(db: Session,event_id: UUID,event_name: str | None = None,start_time: datetime | None = None,end_time: datetime | None = None,priority_rank: int | None = None,description: str | None = None,
    full_address: str | None = None,
) -> bool:
    event = db.query(Events).filter(Events.event_id == event_id).one_or_none()

    if event is None:
        raise ValueError("Event not found")

    if event_name is not None:
        event.event_name = event_name
    if start_time is not None:
        event.start_time = start_time
    if end_time is not None:
        event.end_time = end_time
    if priority_rank is not None:
        event.priority_rank = priority_rank
    if description is not None:
        event.event_description = description
    if full_address is not None:
        event.full_address = full_address

    db.commit()
    db.refresh(event)
    return True

def remove_event(db: Session, event_id: UUID)->bool:
    event = (db.query(Events).filter(Events.event_id == event_id).one_or_none())
    if event is None:
        raise ValueError("Event not found")
    db.delete(event)
    db.commit()
    return True

def add_event_participant(db: Session, event_id: UUID,participants: list[EventParticipants])->bool:
    for participant in participants:
        participant.event_id = event_id
        db.add(participant)
    db.commit()
    return True 

def remove_event_participant(db: Session, participant_id: UUID)->bool:
    participant = (db.query(EventParticipants).filter(EventParticipants.participant_id == participant_id).one_or_none())

    if participant is None:
        raise ValueError("Participant not found")

    db.delete(participant)
    db.commit()
    return True


def get_event_by_id(db: Session, event_id: UUID) -> Events | None:
    """Return a single event or None."""
    return (db.query(Events).filter(Events.event_id == event_id).one_or_none())

def detect_event_conflicts(db: Session,calendar_id: UUID,start_time: datetime, end_time: datetime,) -> list[Events]:
    conflicts = (db.query(Events).filter(Events.calendar_id == calendar_id).filter(Events.start_time < end_time).filter(Events.end_time > start_time).all())
    return conflicts

def update_event_location(db: Session, calendar_id: UUID, event_id: UUID, new_location: str) -> bool:
    event_to_update = (db.query(Events).filter(Events.calendar_id == calendar_id,Events.event_id == event_id).first())

    if event_to_update is None:
        return False

    event_to_update.full_address = new_location
    db.commit()
    db.refresh(event_to_update)
    return True
