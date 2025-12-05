from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import UUID
from uuid import UUID 
from sqlalchemy.orm import Session
from app.api.base_model_classes import CalendarCreate
from app.db import SessionLocal
from app.services.calendar_service import create_calendar
from app.services.events_service import create_event
from app.api.ics_parser import parse_ics 

router = APIRouter(prefix="/calendar", tags=["calendar"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

#We need to use Form and File for multipart/form-data since we are uploading a file. we add optional since the only required fields are calendar_name and user_id to identify the user.
#From(..) = not optional string input from form data
#File(..) = optional file upload from form data 
@router.post("/create")
async def create_calendar_from_ics( user_id: UUID = Form(...), calendar_name: str = Form(...),               
    date_start: Optional[str] = Form(None),        
    date_end: Optional[str] = Form(None),         
    file: UploadFile =File(...),      
    db: Session = Depends(get_db),
):
    #Get user by user_id to attach calendar to user Note: we get the user_id from the frontend locally stored after login
    date_start_dt: Optional[datetime] = None
    date_end_dt: Optional[datetime] = None

    if date_start:
        try:
            date_start_dt = datetime.fromisoformat(date_start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_start format")
    if date_end:
        try:
            date_end_dt = datetime.fromisoformat(date_end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_end format")

    ics_text: Optional[str] = None

    if file is None or not file.filename:
        new_calendar = create_calendar(db,calendar_name,user_id,date_start_dt,date_end_dt,icsfile=None)
        return new_calendar
    if file is not None:
        parsed_ics = await file.read()
        ics_text = parsed_ics.decode("utf-8")
        new_calendar = create_calendar(db, calendar_name, user_id, date_start_dt, date_end_dt, ics_text)
        events = parse_ics(ics_text)

    for idx, event in enumerate(events):
        event_name = event.get("summary")
        if not event_name :
            print(f"Skipping event #{idx} from ICS, missing name or start_time: {event}") #debugging print
            continue

        start_time = event.get("dtstart")

        create_event(
            db=db,
            calendar_id=new_calendar.calendar_id,
            event_name=event_name,
            full_address=event.get("full_address"),
            start_time=start_time,
            end_time=event.get("end_time"),
            description=event.get("event_description"),
            priority_rank=event.get("priority_rank", 0),
        )
        
    return new_calendar

'''
@router.get("/get_calendar")
async def get_calendar_by_name():
    pass
'''
'''
def create_calendar(session: Session, calendar_name: str,user_id: UUID, date_start: datetime, date_end:datetime, icsfile: str)->Calendar:


    try:
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
    
    finally: 
        session.close()

'''