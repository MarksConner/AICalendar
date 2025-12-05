from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import UUID
from sqlalchemy.orm import Session
from app.api.base_model_classes import CalendarCreate
from app.db import SessionLocal
from app.services.user_service import get_user_by_email
from app.services.calendar_service import create_calendar

router = APIRouter(prefix="/calendar", tags=["calendar"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/create")
async def create_calendar_from_ics(email: str = Form(...),calendar_name: str = Form(...),date_start: str = Form(...),date_end: str = Form(...),file: UploadFile = File(...),db: Session = Depends(get_db),):
    user = get_user_by_email(db, email)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    parsed_ics = await file.read()
    ics_text = parsed_ics.decode("utf-8")

    date_start_dt = datetime.fromisoformat(date_start)
    date_end_dt = datetime.fromisoformat(date_end)

    new_calendar = create_calendar(
        db,
        calendar_name,
        user.user_id,
        date_start_dt,
        date_end_dt,
        ics_text,
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