from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.api.base_model_classes import EventCreate, EventUpdate
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.services.events_service import  create_event, get_events_for_calendar_day, get_events_for_calendar_month,update_event,detect_event_conflicts, add_event_participant, get_event_by_id, remove_event, remove_event_participant
from datetime import datetime, timezone


router = APIRouter(prefix= "/events",tags=["events"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
@router.post("/create")
def create_event_route(event: EventCreate , db: Session = Depends(get_db)):
    new_event = create_event(   
        db,
        event.calendar_id,
        event.event_name,
        event.full_address,
        event.start_time,
        event.end_time,
        event.event_description,
        event.priority_rank,
    )
    return new_event

@router.get("/calendar/{calendar_id}/day/{day}")
def get_events_for_calendar_day_route(calendar_id: UUID, day: datetime, db: Session = Depends(get_db)):
    events = get_events_for_calendar_day(db, calendar_id, day)
    return events

# This functions needs to match the query parameters sent by the frontend when it requests events for the month view, which are year and monthIndex (0-11). The function should convert monthIndex to month (1-12) and then call get_events_for_calendar_month with the correct parameters. The route should be a GET request to /calendar/{calendar_id}/events with query parameters year and monthIndex.
@router.get("/calendar/{calendar_id}/events")
def get_events_for_calendar_month_route(calendar_id: UUID, year: int, monthIndex: int,db: Session = Depends(get_db)):
    month = monthIndex + 1
    return get_events_for_calendar_month(db, calendar_id, year, month)

@router.put("/update/{event_id}")
def update_event_route(event_id: UUID, event: EventUpdate, db: Session = Depends(get_db)):
    updated = update_event(
        db=db,
        event_id=event_id,
        event_name=event.event_name,
        start_time=event.start_time,
        end_time=event.end_time,
        priority_rank=event.priority_rank,
        description=event.event_description,
        full_address=event.full_address,
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")

    return get_event_by_id(db, event_id)

@router.delete("/delete/{event_id}")
def delete_event_route(event_id: UUID, db: Session = Depends(get_db)):
    event = get_event_by_id(db, event_id)
    check = remove_event(db, event_id)
    if check == False:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}

@router.get("/event_id/{event_id}")
def get_event_by_id_router(event_id: UUID ,db: Session = Depends(get_db) ):
    event  = get_event_by_id(db, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


