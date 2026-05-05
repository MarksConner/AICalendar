
# Events Service 
# Defines events creation, deletion, modifications, and retrieval in the database. 
# Written by: Luis Matheus Perdomo

# Functional Requirements
# FR7: We use create event to populate own calendar.
# FR8: Allows for user manipulation of calendars using update, remove events, and find information about calendars (multiple functions).
# FR11/19/20: Multiple functions in this file allow the retrieval of information from events.
# FR15: Multiple function check for conflict as a last resort check.
# FR28/29: Multiple functions at the end of the file handles bookable events.

from app.db import SessionLocal
from app.models.events import Events
from app.models.event_participants import EventParticipants
from app.models.participants import Participants
from sqlalchemy import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.mapbox import geocode
import resend

# Creates an event model and commits to the database. (Edgar added the geocode parts) 
def create_event(db: Session, calendar_id: UUID, event_name: str, full_address: str, start_time:datetime, end_time: datetime, description: str, priority_rank: int) -> Events:
    geo_lat = None
    geo_long = None
    if full_address:
        coords = geocode(full_address)
        if coords:
            geo_lat, geo_long = coords

    conflicts = detect_event_conflicts(db=db,calendar_id=calendar_id,start_time=start_time,end_time=end_time,)
    if conflicts:
        names = ", ".join([event.event_name for event in conflicts])
        raise ValueError(f"Time conflict with existing event(s): {names}")
    
    new_event =  Events(calendar_id=calendar_id,
        event_name=event_name,
        start_time=start_time,
        end_time=end_time,
        event_description=description,
        priority_rank=priority_rank,
        full_address= full_address,
        geo_latitude = geo_lat,
        geo_longitude = geo_long
        )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event

# Return a list of events for a given day (useful for the timeline view, scheduling hints) 
def get_events_for_calendar_day(db: Session, calendar_id: UUID, day: datetime) -> list[Events]:
    start_of_day = datetime(day.year, day.month, day.day)
    end_of_day = datetime(day.year, day.month, day.day, 23, 59, 59)
    events = (db.query(Events).filter(Events.calendar_id == calendar_id).filter(Events.start_time >= start_of_day).filter(Events.start_time <= end_of_day).all())
    return events

# new function to get events for a calendar month, used for calendar month view
def get_events_for_calendar_month(db: Session,calendar_id: UUID,year: int,month: int) -> list[Events]:
    start_of_month = datetime(year, month, 1)

    if month == 12:
        start_of_next_month = datetime(year + 1, 1, 1)
    else:
        start_of_next_month = datetime(year, month + 1, 1)

    events = (db.query(Events).filter(Events.calendar_id == calendar_id).filter(Events.start_time < start_of_next_month).filter(Events.end_time > start_of_month).all())

    return events
    
# Modifies events in a calendar  
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
    if full_address is not None: #If address changed, re-geocode
        event.full_address = full_address
        coords = geocode(full_address)
        if coords:
            event.geo_latitude, event.geo_longitude = coords
        else: #Address changed but geocode failed, clear coords
            event.geo_latitude = None
            event.geo_longitude = None

    db.commit()
    db.refresh(event)
    return True

async def remove_event(db: Session, event_id: UUID) -> bool:
    event = db.query(Events).filter(Events.event_id == event_id).one_or_none()

    if event is None:
        raise ValueError("Event not found")

    email_data = []

    # Only collect cancellation email info for booked bookable events.
    # All other events delete normally.
    if event.event_type == "bookable" and event.is_booked:
        participants = get_participants_for_event(db=db, event_id=event_id)

        for participant in participants:
            if participant.info and "Email:" in participant.info:
                email_line = next(
                    (
                        line for line in participant.info.split("\n")
                        if line.strip().startswith("Email:")
                    ),
                    None
                )

                if email_line:
                    email = email_line.replace("Email:", "").strip()

                    email_data.append({
                        "email": email,
                        "name": participant.name,
                        "event_name": event.event_name,
                    })

    # If this fails, the event should not be considered deleted.
    db.delete(event)
    db.commit()

    for item in email_data:
        try:
            await send_email_to_booked_event_participant_canceling_event(
                email=item["email"],
                name=item["name"],
                event_name=item["event_name"],
            )
        except Exception as e:
            print("Cancellation email failed:", str(e), flush=True)

    return True


# Returns an event model by id. (should not return a database query response)
def get_event_by_id(db: Session, event_id: UUID) -> Events | None:
    return (db.query(Events).filter(Events.event_id == event_id).one_or_none())


# Checks for event confilcts in the database, returns a list of conflicts. 
def detect_event_conflicts(db: Session,calendar_id: UUID,start_time: datetime, end_time: datetime,) -> list[Events]:
    conflicts = (db.query(Events).filter(Events.calendar_id == calendar_id).filter(Events.start_time < end_time).filter(Events.end_time > start_time).all())
    return conflicts

# Updates an event locaiton
def update_event_location(db: Session, calendar_id: UUID, event_id: UUID, new_location: str) -> bool:
    event_to_update = (db.query(Events).filter(Events.calendar_id == calendar_id,Events.event_id == event_id).first())

    if event_to_update is None:
        return False

    event_to_update.full_address = new_location
    db.commit()
    db.refresh(event_to_update)
    return True


# Participant-related functions (Be careful with the distinction between Participants and EventParticipants models, they serve different purposes)


# This function accomplishes two things: it creates a new participant in the Participants table and then creates an association in the EventParticipants table to link that participant to the specified event. It also checks if the event exists before trying to create the participant and association.
def add_event_participant(db: Session,event_id: UUID,name: str,info: str | None = None,full_address: str | None = None,) -> Participants:
    event = db.query(Events).filter(Events.event_id == event_id).one_or_none()
    if event is None:
        raise ValueError("Event not found")

    participant = (
        db.query(Participants).filter(Participants.name == name,Participants.info == info,Participants.full_address == full_address,).one_or_none())

    if participant is None:
        participant = Participants(name=name,info=info,full_address=full_address,)
        db.add(participant)
        db.flush()

    existing_link = (
        db.query(EventParticipants)
        .filter(EventParticipants.event_id == event_id,EventParticipants.participant_id == participant.participant_id,).one_or_none())

    if existing_link is None:
        db.add(EventParticipants(event_id=event_id,participant_id=participant.participant_id,))

    db.commit()
    db.refresh(participant)
    return participant

# Function  removes the association between the event_particiapant and the given event.
def remove_event_participant(db: Session, event_id: UUID, participant_id: UUID) -> bool:
    association = (
        db.query(EventParticipants).filter(EventParticipants.event_id == event_id,EventParticipants.participant_id == participant_id).one_or_none())

    if association is None:
        raise ValueError("Participant is not associated with this event")

    db.delete(association)
    db.commit()
    return True

# Remove participant. If an participant has not associations in EventParticipants it is removed.
def remove_participant(db: Session, participant_id: UUID) -> bool:
    participant = (db.query(Participants).filter(Participants.participant_id == participant_id).one_or_none())

    if participant is None:
        raise ValueError("Participant not found")

    association_exists = (db.query(EventParticipants).filter(EventParticipants.participant_id == participant_id).first())

    if association_exists is not None:
        raise ValueError("Cannot delete participant because they are still associated with one or more events")

    db.delete(participant)
    db.commit()
    return True

# returns a list of particicapnts for an event
def get_participants_for_event(db: Session, event_id: UUID) -> list[Participants]:
    event = db.query(Events).filter(Events.event_id == event_id).one_or_none()
    if event is None:
        raise ValueError("Event not found")
    participants = (
        db.query(Participants).join(EventParticipants,Participants.participant_id == EventParticipants.participant_id,).filter(EventParticipants.event_id == event_id).all())
    return participants


# Returns description of an participant
def get_participant_details(db: Session, participant_id: UUID) -> Participants | None:
    return (db.query(Participants).filter(Participants.participant_id == participant_id).one_or_none())

# Returns the address of an participant.
def get_participant_location(db: Session, participant_id: UUID) -> str | None:
    participant = (db.query(Participants).filter(Participants.participant_id == participant_id).one_or_none())

    if participant is None:
        raise ValueError("Participant not found")

    return participant.full_address


# General function to update any given field of the participant.
def update_participant_info(db: Session,participant_id: UUID,name: str | None = None,info: str | None = None,full_address: str | None = None,) -> Participants:
    participant = (db.query(Participants).filter(Participants.participant_id == participant_id).one_or_none())

    if participant is None:
        raise ValueError("Participant not found")

    if name is not None:
        participant.name = name
    if info is not None:
        participant.info = info
    if full_address is not None:
        participant.full_address = full_address

    db.commit()
    db.refresh(participant)
    return participant


# Checks if participant already has an event that overlaps. (Not used)
def detect_participant_event_conflicts(db: Session,participant_id: UUID, start_time: datetime,end_time: datetime,exclude_event_id: UUID | None = None,) -> list[Events]:
    if start_time >= end_time:
        raise ValueError("start_time must be earlier than end_time")

    query = (db.query(Events).join(EventParticipants, Events.event_id == EventParticipants.event_id).filter(EventParticipants.participant_id == participant_id).filter(Events.start_time < end_time).filter(Events.end_time > start_time))

    if exclude_event_id is not None:
        query = query.filter(Events.event_id != exclude_event_id)

    return query.all()

# Changes the location of an participant
def update_participant_location( db: Session,participant_id: UUID,new_location: str,) -> Participants:
    return update_participant_info(db=db,participant_id=participant_id,full_address=new_location,)

# Booable events section

# Set event as bookable
def set_event_as_bookable(db: Session, event_id: UUID) -> Events:
    event = db.query(Events).filter(Events.event_id == event_id).one_or_none()

    if event is None:
        raise ValueError("Event not found")

    event.event_type = "bookable"
    event.is_booked = False

    db.commit()
    db.refresh(event)
    return event


# Gives you a list of all the bookable events
def get_bookable_events_for_calendar(db: Session, calendar_id: UUID) -> list[Events]:
    events = (db.query(Events).filter(Events.calendar_id == calendar_id).filter(Events.event_type == "bookable").filter(Events.is_booked == False).all())
    return events

# Handles booking event loginc (adding participant, required checkes, and setting of priority to highest(
def book_event(db: Session, event_id: UUID, name: str, email: str, notes: str | None = None) -> Events:
    event = db.query(Events).filter(Events.event_id == event_id).one_or_none()

    if event is None:
        raise ValueError("Event not found")

    if event.event_type != "bookable":
        raise ValueError("Event is not bookable")

    if event.is_booked:
        raise ValueError("Event is already booked")

    event.is_booked = True

    booking_info = f"Email: {email}"

    if notes:
        booking_info = booking_info + f"\nNotes: {notes}"
    
    event.is_booked = True
    event.priority_rank = 3
    add_event_participant(db=db,event_id=event_id,name=name,info=booking_info,full_address=None,)

    db.commit()
    db.refresh(event)
    return event

#check if event is bookable
def is_event_bookable(db: Session, event_id: UUID) -> bool:
    event = db.query(Events).filter(Events.event_id == event_id).one_or_none()

    if event is None:
        raise ValueError("Event not found")

    return event.event_type == "bookable" and not event.is_booked



#Helper
# Uses resend to send email. The email explains the booked event has been deleted by the calendars owner.
async def send_email_to_booked_event_participant_canceling_event(email: str,name: str,event_name: str,):
    params: resend.Emails.SendParams = {
        "from": "AgendaAI <onboarding@resend.dev>",
        "to": [email],
        "subject": f"Event canceled: {event_name}",
        "html": f"""
            <p>Hello {name},</p>

            <p>The event <strong>{event_name}</strong> has been canceled.</p>

            <p>Please contact the calendar owner to reschedule.</p>

            <p>Thank you.</p>
        """,
    }

    await resend.Emails.send_async(params)
