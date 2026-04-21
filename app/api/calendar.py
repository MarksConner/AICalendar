from datetime import datetime
from hashlib import new
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from uuid import UUID 
from sqlalchemy.orm import Session
from app.api.base_model_classes import CalendarCreate
from app.config import get_current_user
from app.db import SessionLocal
from app.services.calendar_service import create_calendar, get_calendars_by_user_id, day_scheduling_hints
from app.services.events_service import create_event
from app.services.ics_parser import parse_ics

# Export calendar to ics 
from fastapi.responses import Response
from app.services.ics_exporter import export_calendar_to_ics

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
@router.post("/import-ics")
async def create_calendar_from_ics(
    user_id: UUID = Form(...),
    calendar_name: str = Form(...),
    date_start: Optional[str] = Form(None),
    date_end: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
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

    if file is None or not file.filename:
        new_calendar = create_calendar(db, calendar_name, user_id, date_start_dt, date_end_dt, None)
        return new_calendar

    parsed_ics = await file.read()
    ics_text = parsed_ics.decode("utf-8")

    new_calendar = create_calendar(db, calendar_name, user_id, date_start_dt, date_end_dt, ics_text)
    events = parse_ics(ics_text)

    for idx, event in enumerate(events):
        event_name = event.get("summary")
        start_time = event.get("dtstart")

        if not event_name or not start_time:
            print(f"Skipping event #{idx} from ICS, missing name or start_time: {event}")
            continue

        create_event(
            db=db,
            calendar_id=new_calendar.calendar_id,
            event_name=event_name,
            full_address=event.get("location"),
            start_time=start_time,
            end_time=event.get("dtend"),
            description=event.get("description"),
            priority_rank=0,
        )

    return new_calendar

@router.post("/create")
def create_calendar_route(calendar: CalendarCreate ,db: Session = Depends(get_db)):
    new_calendar = create_calendar(db, calendar.calendar_name, calendar.user_id, calendar.date_start, calendar.date_end, icsfile=None)
    return new_calendar

@router.get("")
def get_calendars_by_user_id_route( db: Session = Depends(get_db),  current_user = Depends(get_current_user)):
    calendars = get_calendars_by_user_id(db, current_user.user_id)
    return calendars


@router.get("/day-hints")
def get_day_hints_route(
    date: str,
    calendar_id: UUID,
    startTime: str,
    durationMinutes: int,
    endTime: str | None = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    hints = day_scheduling_hints(
        db=db,
        user_id=current_user.user_id,
        calendar_id=calendar_id,
        date=date,
        start_time=startTime,
        end_time=endTime,
        duration_minutes=durationMinutes,
    )
    return hints

#Export calendar to ics
@router.get("/export/{calendar_id}")
def export_calendar(calendar_id: str):
    ics_content = export_calendar_to_ics(calendar_id)

    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="calendar-{calendar_id}.ics"'
        },
    )