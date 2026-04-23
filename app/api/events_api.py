from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.base_model_classes import AddEventParticipant, AddSuggestedEventRequest, EventCreate, EventParticipantInfo, EventUpdate, LocalEventSuggestion, LocalEventsRequest, ParticipantInfo, ParticipantsForEvent, RemoveEventParticipant, RouteRequest, RouteResponse, TravelTimeResponse
from app.db import SessionLocal
from app.services.events_service import (create_event, get_events_for_calendar_day, get_events_for_calendar_month,update_event,detect_event_conflicts, 
 get_event_by_id, remove_event, add_event_participant, remove_event_participant,get_participants_for_event, get_participant_details,update_participant_location,update_participant_info,detect_participant_event_conflicts)
from datetime import datetime, timezone
from app.services.google_places_service import search_local_events
from app.services.mapbox_service import get_route
from backend.mapbox import geocode, get_travel_time_minutes


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


@router.post("/travel-time", response_model=RouteResponse)
def get_route_for_destination(request: RouteRequest):
    return get_route(
        user_longitude=request.user_longitude,
        user_latitude=request.user_latitude,
        destination=request.destination,
    )


@router.post("/local-suggestions", response_model=list[LocalEventSuggestion])
def get_local_event_suggestions(request: LocalEventsRequest):
    return search_local_events(
        latitude=request.latitude,
        longitude=request.longitude,
        radius_km=request.radius_km,
        keyword=request.keyword,
        start_date=request.start_date,
        end_date=request.end_date,
    )


@router.post("/add-suggested")
def add_suggested_event(request: AddSuggestedEventRequest, db: Session = Depends(get_db)):
    end_time = request.end_time or request.start_time
    created_event = create_event(
        db,
        request.calendar_id,
        request.title,
        request.address or "",
        request.start_time,
        end_time,
        request.description or "",
        request.priority_rank,
    )
    return {"message": "Suggested event added successfully", "event_id": created_event.event_id}


## Participants helpers and routes
def participant_to_response(participant) -> ParticipantInfo:
    return ParticipantInfo(participant_id=participant.participant_id,name=participant.name,info=participant.info,full_address=participant.full_address,)


@router.post("/add_participant/{event_id}", response_model=ParticipantInfo)
def add_participant_route(
    event_id: UUID,
    participant: AddEventParticipant,
    db: Session = Depends(get_db),
):
    try:
        created_participant = add_event_participant(
            db=db,
            event_id=event_id,
            name=participant.name,
            info=participant.info,
            full_address=participant.full_address,
        )
        return participant_to_response(created_participant)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/remove_participant", response_model=dict)
def remove_participant_route(
    payload: RemoveEventParticipant,
    db: Session = Depends(get_db),
):
    try:
        remove_event_participant(
            db,
            payload.event_id,
            payload.participant_id,
        )
        return {"message": "Participant removed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/participants_for_event/{event_id}", response_model=ParticipantsForEvent)
def get_participants_for_event_route(
    event_id: UUID,
    db: Session = Depends(get_db),
):
    try:
        participants = get_participants_for_event(db, event_id)
        return ParticipantsForEvent(
            event_id=event_id,
            participants=[participant_to_response(p) for p in participants],
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/participant_info/{participant_id}", response_model=ParticipantInfo)
def get_participant_info_route(participant_id: UUID,db: Session = Depends(get_db),):
    participant = get_participant_details(db, participant_id)

    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")

    return participant_to_response(participant)

@router.get("/event_id/{event_id}/travel_time", response_model=TravelTimeResponse)
def get_travel_time_route(
    event_id: UUID,
    from_lat: float,
    from_long: float,
    db: Session = Depends(get_db),
):
    event = get_event_by_id(db, event_id)
    if event is None:
        raise HTTPException(status_code = 404, detail = "Event not found") #Server could not find requested resource
    
    if not event.full_address:
        raise HTTPException(status_code = 400, detail = "This event has no location set") #Request not processed due to client error
    
    #Grab cached coords. If None, geocode now and save
    if event.geo_latitude is not None and event.geo_longitude is not None:
        event_lat = event.geo_latitude
        event_long = event.geo_longitude
    else:
        coords = geocode(event.full_address)
        if coords is None:
            raise HTTPException(status_code = 422, detail = "Could not find geographical coordinates for this event's address.") #Request failed due to semantic error
        event_lat, event_long = coords
        event.geo_latitude = event_lat
        event.geo_longitude = event_long
        db.commit()
        
    travel_time = get_travel_time_minutes(from_lat, from_long, event_lat, event_long)
    if travel_time is None:
        raise HTTPException(status_code = 503, detail = "Could not calculate travel time. Mapbox API may be down.") #Service unavailable
    
    return TravelTimeResponse(travel_time_min = travel_time, event_lat = event_lat, event_long = event_long)