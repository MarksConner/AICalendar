from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.api.base_model_classes import EventCreate
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.services.events_service import  create_event,update_event,detect_event_conflicts, add_event_participant, get_event_by_id, remove_event, remove_event_participant
from datetime import datetime, timezone

router = APIRouter(prefix= "/events",tags=["events"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
@router.post("/create")
def create_event_route(event: EventCreate, db: Session = Depends(get_db)):
    new_event = create_event(
        event.calendar_id,
        event.event_name,
        event.full_address,
        event.start_time,
        event.end_time,
        event.event_description,
        event.priority_rank,
        event.created_at
    )
    return new_event

@router.put("/update/{event_id}")
def update_event_route(event_id: UUID, event: EventCreate, db: Session = Depends(get_db)):
    event = get_event_by_id(db, event)
    check = update_event()
    if check == False:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event updated successfully"}

@router.delete("/delete/{event_id}")
def delete_event_route(event_id: UUID, event: EventCreate, db: Session = Depends(get_db)):
    event = get_event_by_id(db, event)
    check = remove_event()
    if check == False:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}

@router.get("/event_id/{event_id}")
def get_event_by_id_router(event_id: UUID ,db: Session = Depends(get_db) ):
    event  = get_event_by_id(db, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


