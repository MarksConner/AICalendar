# Calendar Service 
# Defines calendar creation, deletion, modifications, and inspection in the database. It also defines operations for bookable calendars. Finally, pulling calendar context and pulling day_hints context from the database. 
# Written by: Luis Matheus Perdomo

# Functional Requirements
# FR6: We use get_calendar_context in order to send the AI agent the context it needs to perfom calendar operations.   
# FR7: We use create_calendar to populate own calendar.
# FR8: Allows for user manipulation of calendars using update, remove events, and find information about calendars (multiple functions).
# FR11/19/20: Multiple functions in this file allow the retrieval of information from the calendar. 
# FR16: By separating calendars by id we are able to create separation between calendars.
# FR28/29: Multiple functions at the end of the file handles publishing a calendar.

from typing import Optional
from app.models.calendar import Calendar
from app.models.events  import Events
from app.models.event_participants import EventParticipants
from app.models.participants import Participants
from sqlalchemy import UUID
from datetime import datetime
from backend.llm_agent import ask_llm
from sqlalchemy.orm import Session
from fastapi import HTTPException
import uuid

# Creates calendar model and inserts it into the database
def create_calendar(session: Session, calendar_name: str,user_id: UUID, date_start: Optional[datetime] = None, date_end:Optional[datetime] = None, icsfile: Optional[str] = None)->Calendar:
    new_calendar = Calendar(calendar_name=calendar_name, date_start=date_start, date_end = date_end, user_id = user_id,icsfile  = icsfile)
    session.add(new_calendar)
    session.commit()
    session.refresh(new_calendar)

    return new_calendar

# Add an event model into a calendar in the database (by assigning a calendar_id to an event) (Deprecated- events_services handles the calendar creation)
def add_event_to_calendar(session: Session,calendar_id: UUID, event_id:UUID):
    event = session.query(Events).filter(Events.event_id == event_id).first()
    if event is None:
        raise ValueError("Event not found")
     
    event.calendar_id = calendar_id
    session.commit()
    session.refresh(event)
    return event

# Removes an event from a calendar.
def remove_event_from_calendar(session: Session,calendar_id: UUID, event_id: UUID)-> bool:
        
    event = session.query(Events).filter(Events.event_id == event_id).first()
    if event is None:
        raise ValueError("Event not found")
        
    session.delete(event)
    session.commit()

# Updates calendar fields using the given parameters, very flexible to allow for reusability. 
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


# Updates calendar using ics file. (Not used (update calendar is used for this purpose))
def update_calendar_icsfile(session: Session, calendar_id: UUID, icsfile: str)->bool:
    calendar = (session.query(Calendar).filter(Calendar.calendar_id == calendar_id).first())
    
    if calendar is not None and icsfile is not None and icsfile != "":
        calendar.icsfile = icsfile
        session.commit()
        session.refresh(calendar)
        return True
    
    return False

# Returns all events in a calendar
def get_all_events_by_calendar_id(session: Session ,calendar_id: UUID)->list[Events]:
    events = session.query(Events).filter(Events.calendar_id == calendar_id).all()
    return events

# Returns an specific event in a specifica calendar
def get_event_by_calendar_id(session: Session ,calendar_id: UUID,event_id: UUID)->Events:
    event = session.query(Events).filter(Events.event_id ==event_id, Events.calendar_id == calendar_id).first()
    if event is None:
        raise ValueError("Event not found")
    return event

# Deletes the given calendar 
def delete_calendar_by_id(session: Session, calendar_id: UUID) -> bool:
    calendar = (session.query(Calendar).filter(Calendar.calendar_id == calendar_id).first())
    if calendar is None:
        return False
    
    session.delete(calendar)
    session.commit()

    return True

# Returns a list of all the calendars of a user in the database (used in the side panel to display all calendars)
def get_calendars_by_user_id(session: Session, user_id: UUID) -> list[Calendar]:
    calendars = session.query(Calendar).filter(Calendar.user_id == user_id).all()
    return calendars

# This function retrieves the context of a calendar, including its events, ordered by start time.
# Basically it returns a dictionary with a list of events for the calendar, where each event is represented as a dictionary with its details (id, name, start time, end time, location). This context can be used to display the calendar and its events in the frontend.
# it is returned as a dictionary because the calendar context may include more than just the list of events in the future, such as calendar settings, user preferences, etc. By returning a dictionary, we can easily expand the context to include additional information without changing the structure of the response.
def get_calendar_context(session: Session, calendar_id: str) -> dict:
    events = (session.query(Events).filter(Events.calendar_id == calendar_id).order_by(Events.start_time.asc()).all())

    return {
        "events": [
            {
                "event_id": str(event.event_id),
                "name": event.event_name,
                "start": event.start_time.isoformat() if event.start_time else None,
                "end": event.end_time.isoformat() if event.end_time else None,
                "location": event.full_address,
                "description": event.event_description,
                "priority_rank": event.priority_rank,
                "participants": [
                    {
                        "participant_id": str(p.participant_id),
                        "name": p.name,
                        "info": p.info,
                        "full_address": p.full_address,
                    }
                    for p in (
                        session.query(Participants)
                        .join(
                            EventParticipants,
                            EventParticipants.participant_id == Participants.participant_id,
                        )
                        .filter(EventParticipants.event_id == event.event_id)
                        .all()
                    )
                ],
            }
            for event in events
        ]
    }

# Used to pull calendar context for the llm and returns a list of recomendations for reschdeuling. (not used in full)
def day_scheduling_hints(db: Session,user_id: UUID,calendar_id: UUID,date: str,start_time: str,duration_minutes: int,end_time: str | None = None,):

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
        requested_end = requested_start.replace(hour=requested_start.hour,minute=requested_start.minute)
        requested_end = requested_start.fromisoformat(
            f"{date}T{end_time}:00"
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
    # Validate that end_time is after start_time
    if requested_end <= requested_start:
        raise HTTPException(status_code=400, detail="endTime must be after startTime")

    # Return a event list with all events in calendar 
    events = (db.query(Events).filter(Events.calendar_id == calendar_id).all())

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

#Bookable Calendar

# Set public field of a calendar
def set_calendar_as_public(db: Session, calendar_id: UUID) -> Calendar:
    calendar = db.query(Calendar).filter(Calendar.calendar_id == calendar_id).first()
    if calendar is None:
        raise ValueError("Calendar not found")

    calendar.is_public = True

    if calendar.public_token is None:
        calendar.public_token = uuid.uuid4()

    db.commit()
    db.refresh(calendar)

    return calendar

# Retrieves the calendar token.
def get_calendar_token(db: Session, calendar_id: UUID):
    calendar = db.query(Calendar).filter(Calendar.calendar_id == calendar_id).first()
    if calendar is None:
        raise ValueError("Calendar not found")

    if calendar.public_token is None:
        calendar.public_token = uuid.uuid4()
        db.commit()
        db.refresh(calendar)

    return calendar.public_token

# Returns boolean is_public
def get_if_calendar_is_public(db: Session, calendar_id: UUID) -> bool:
    calendar = db.query(Calendar).filter(Calendar.calendar_id == calendar_id).first()
    if calendar is None:
        raise ValueError("Calendar not found")

    return calendar.is_public

# Sets public boolean as false   
def set_calendar_as_private(db: Session, calendar_id: UUID) -> Calendar:
    calendar = db.query(Calendar).filter(Calendar.calendar_id == calendar_id).first()
    if calendar is None:
        raise ValueError("Calendar not found")

    calendar.is_public = False

    db.commit()
    db.refresh(calendar)

    return calendar

# using the public token returns an dict of the whole calendar fields (not used)
def get_public_calendar_by_token(db: Session, public_token: UUID) -> dict:
    calendar = (db.query(Calendar).filter(Calendar.public_token == public_token).filter(Calendar.is_public == True).first())
    if calendar is None:
        raise ValueError("Public calendar not found")

    events = (db.query(Events).filter(Events.calendar_id == calendar.calendar_id).filter(Events.event_type == "bookable").order_by(Events.start_time.asc()).all())

    return {
        "calendar_id": str(calendar.calendar_id),
        "calendar_name": calendar.calendar_name,
        "events": [
            {
                "event_id": str(event.event_id),
                "event_name": event.event_name,
                "start_time": event.start_time.isoformat() if event.start_time else None,
                "end_time": event.end_time.isoformat() if event.end_time else None,
                "event_description": event.event_description,
                "full_address": event.full_address,
                "priority_rank": event.priority_rank,
                "event_type": event.event_type,
                "is_booked": event.is_booked,
            }
            for event in events
        ],
    }
