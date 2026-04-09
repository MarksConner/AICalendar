from typing import Optional
from app.db import SessionLocal
from app.models.calendar import Calendar
from app.models.events  import Events
from sqlalchemy import UUID
from datetime import datetime
from backend.llm_agent import ask_llm
from sqlalchemy.orm import Session
from fastapi import HTTPException

def create_calendar(session: Session, calendar_name: str,user_id: UUID, date_start: Optional[datetime] = None, date_end:Optional[datetime] = None, icsfile: Optional[str] = None)->Calendar:
    new_calendar = Calendar(    
    calendar_name=calendar_name, 
    date_start=date_start, 
    date_end = date_end, 
    user_id = user_id,
    icsfile  = icsfile
    )
    session.add(new_calendar)
    session.commit()
    session.refresh(new_calendar)

    return new_calendar

def add_event_to_calendar(session: Session,calendar_id: UUID, event_id:UUID):
    event = session.query(Events).filter(Events.event_id == event_id).first()
    if event is None:
        raise ValueError("Event not found")
     
    event.calendar_id = calendar_id
    session.commit()
    session.refresh(event)
    return event

def remove_event_from_calendar(session: Session,calendar_id: UUID, event_id: UUID)-> bool:
        
    event = session.query(Events).filter(Events.event_id == event_id).first()
    if event is None:
        raise ValueError("Event not found")
        
    session.delete(event)
    session.commit()

#Careful! Only updates provided parameters 
def update_calendar(session: Session,calendar_id: UUID,calendar_name: str | None = None,  date_start: datetime | None = None, date_end: datetime | None = None,  icsfile: str | None = None,):
   
    calendar = (session.query(Calendar).filter(Calendar.calendar_id == calendar_id).first())

    if calendar is None:
        raise ValueError("Calendar not found")
    
    if calendar_name is not None:
        calendar.calendar_name = calendar_name
    if date_start is not None:
        calendar.date_start = date_start
    if date_end is not None:
        calendar.date_end = date_end
    if icsfile is not None:
        calendar.icsfile = icsfile

    session.commit()
    session.refresh(calendar)
    return calendar


#updat/replace calendar icsfile with new one
def update_calendar_icsfile(session: Session, calendar_id: UUID, icsfile: str)->bool:
    calendar = (session.query(Calendar).filter(Calendar.calendar_id == calendar_id).first())
    
    if calendar is not None and icsfile is not None and icsfile != "":
        calendar.icsfile = icsfile
        session.commit()
        session.refresh(calendar)
        return True
    
    return False

def get_all_events_by_calendar_id(session: Session ,calendar_id: UUID)->list[Events]:
    events = session.query(Events).filter(Events.calendar_id == calendar_id).all()
    return events

def get_event_by_calendar_id(session: Session ,calendar_id: UUID,event_id: UUID)->Events:
    event = session.query(Events).filter(Events.event_id ==event_id, Events.calendar_id == calendar_id).first()
    if event is None:
        raise ValueError("Event not found")
    return event

def get_calendars_by_user_id(session: Session, user_id: UUID) -> list[Calendar]:
    calendars = session.query(Calendar).filter(Calendar.user_id == user_id).all()
    return calendars

# This function retrieves the context of a calendar, including its events, ordered by start time.
# Basically it returns a dictionary with a list of events for the calendar, where each event is represented as a dictionary with its details (id, name, start time, end time, location). This context can be used to display the calendar and its events in the frontend.
# it is returned as a dictionary because the calendar context may include more than just the list of events in the future, such as calendar settings, user preferences, etc. By returning a dictionary, we can easily expand the context to include additional information without changing the structure of the response.
def get_calendar_context(session: Session, calendar_id: str) -> dict:
    events = (
        session.query(Events)
        .filter(Events.calendar_id == calendar_id)
        .order_by(Events.start_time.asc())
        .all()
    )

    return {
        "events": [
            {
                "id": str(event.event_id),
                "name": event.event_name,
                "start": event.start_time.isoformat() if event.start_time else None,
                "end": event.end_time.isoformat() if event.end_time else None,
                "location": event.full_address,
                "description": event.event_description,
                "priority_rank": event.priority_rank,
            }
            for event in events
        ]
    }

def day_scheduling_hints(
    db: Session,
    user_id: UUID,
    calendar_id: UUID,
    date: str,
    start_time: str,
    duration_minutes: int,
    end_time: str | None = None,
):
    # Validate calendar exists and belongs to user
    calendar = db.query(Calendar).filter(Calendar.calendar_id == calendar_id).first()
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")

    # Validate calendar ownership
    if str(calendar.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Not authorized to access this calendar")

    try:
        datetime.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Validate start_time and end_time formats
    if end_time is None:
        end_time = "23:59"
    # Validate start_time and end_time formats
    try:
        requested_start = datetime.fromisoformat(f"{date}T{start_time}:00")
        requested_end = requested_start.replace(
            hour=requested_start.hour,
            minute=requested_start.minute
        )
        requested_end = requested_start.fromisoformat(
            f"{date}T{end_time}:00"
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
    # Validate that end_time is after start_time
    if requested_end <= requested_start:
        raise HTTPException(status_code=400, detail="endTime must be after startTime")

    # Return a event list with all events in calendar 
    events = (
        db.query(Events)
        .filter(Events.calendar_id == calendar_id)
        .all()
    )

    day_events = []
    conflicts = []

    proposed_end = requested_start + __import__("datetime").timedelta(minutes=duration_minutes)

    # Validate that proposed_end does not exceed end_time
    for event in events:
        if not event.start_time:
            continue
        if event.start_time.date().isoformat() != date:
            continue

        event_start = event.start_time
        event_end = event.end_time if event.end_time else event.start_time

        day_events.append((event, event_start, event_end))

        overlap_start = max(event_start, requested_start)
        overlap_end = min(event_end, proposed_end)
        if overlap_end > overlap_start:
            overlap_minutes = int((overlap_end - overlap_start).total_seconds() // 60)
            conflicts.append({
                "eventId": str(event.event_id),
                "name": event.event_name,
                "start": event_start.strftime("%H:%M"),
                "end": event_end.strftime("%H:%M") if event_end else None,
                "overlapMinutes": overlap_minutes,
            })

    # clip events to search window
    busy_ranges = [] # list of (start, end) tuples representing busy time ranges within the requested window

    for event, event_start, event_end in day_events:
        if event_end <= requested_start or event_start >= requested_end:
            continue

        clipped_start = max(event_start, requested_start)
        clipped_end = min(event_end, requested_end)

        if clipped_end > clipped_start:
            busy_ranges.append((clipped_start, clipped_end))

    busy_ranges.sort(key=lambda x: x[0])

    merged = []
    for start, end in busy_ranges:
        if not merged:
            merged.append([start, end])
        else:
            last_start, last_end = merged[-1]
            if start <= last_end:
                merged[-1][1] = max(last_end, end)
            else:
                merged.append([start, end])

    suggestions = []
    cursor = requested_start

    for busy_start, busy_end in merged:
        if busy_start > cursor:
            gap_minutes = int((busy_start - cursor).total_seconds() // 60)
            if gap_minutes >= duration_minutes:
                suggestions.append({
                    "startTime": cursor.strftime("%H:%M"),
                    "endTime": busy_start.strftime("%H:%M"),
                    "label": f"{gap_minutes} min free",
                    "inWorkingHours": True,
                })
        cursor = max(cursor, busy_end)

    if cursor < requested_end:
        gap_minutes = int((requested_end - cursor).total_seconds() // 60)
        if gap_minutes >= duration_minutes:
            suggestions.append({
                "startTime": cursor.strftime("%H:%M"),
                "endTime": requested_end.strftime("%H:%M"),
                "label": f"{gap_minutes} min free",
                "inWorkingHours": True,
            })

    return {
        "hasConflict": len(conflicts) > 0,
        "inWorkingHours": True,
        "workingHours": {
            "startTime": start_time,
            "endTime": end_time,
        },
        "conflicts": conflicts,
        "suggestions": suggestions,
    }