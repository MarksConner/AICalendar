import pytest
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException
from app.api.base_model_classes import CalendarCreate, EventCreate
from app.db import SessionLocal
from app.models.calendar import Calendar
from app.models.event_participants import EventParticipants
from app.models.events import Events
from app.models.users import Users
from app.services.events_service import (
    create_event,
    get_events_for_calendar_day,
    update_event,
    remove_event,
    get_event_by_id,
    detect_event_conflicts,
    add_event_participant,
    remove_event_participant,
    get_participants_for_event,
    get_participant_details,
    remove_participant,
    update_participant_location,
    update_participant_info,
    detect_participant_event_conflicts,
)
from app.services.calendar_service import (
    create_calendar,
    add_event_to_calendar,
    remove_event_from_calendar,
    update_calendar,
    update_calendar_icsfile,
    get_all_events_by_calendar_id,
    get_event_by_calendar_id,
    get_calendars_by_user_id,
    get_calendar_context,
    day_scheduling_hints,
)

"""
Service only tests (database operations) for calendar and event services.

Covered here:
- create_event
- get_events_for_calendar_day
- update_event
- remove_event
- get_event_by_id
- detect_event_conflicts
- create_calendar
- add_event_to_calendar
- remove_event_from_calendar
- update_calendar
- update_calendar_icsfile
- get_all_events_by_calendar_id
- get_event_by_calendar_id
- get_calendars_by_user_id
- get_calendar_context
- day_scheduling_hints

Not included yet:
- add_event_participant
- remove_event_participant

Those two need the exact EventParticipants model fields.
"""


# --------------------------
# Fixtures
# --------------------------

@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def user_id():
    return uuid4()


@pytest.fixture
def fake_event_data():
    return {
        "event_name": "Test Event",
        "event_description": "This is a test event description",
        "full_address": "North Test Park",
        "priority_rank": 1,
        "start_time": datetime(2026, 4, 9, 10, 0, 0),
        "end_time": datetime(2026, 4, 9, 11, 0, 0),
    }


@pytest.fixture
def test_user(db_session):
    user = Users(
        user_id=uuid4(),
        email=f"test_{uuid4().hex[:8]}@example.com",
        username=f"user_{uuid4().hex[:8]}",
        first_name="Test",
        last_name="User",
        password_hash="fake_hash",
        email_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def other_test_user(db_session):
    user = Users(
        user_id=uuid4(),
        email=f"other_{uuid4().hex[:8]}@example.com",
        username=f"other_{uuid4().hex[:8]}",
        first_name="Other",
        last_name="User",
        password_hash="fake_hash",
        email_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

# Creates test calendar
@pytest.fixture
def created_calendar(db_session, test_user):
    return create_calendar(db_session, "Test Calendar", test_user.user_id)

# Creates calendar is being created and present in database
def test_create_calendar(db_session, test_user):
    calendar = create_calendar(db_session, "Test Calendar", test_user.user_id)

    assert calendar is not None
    assert calendar.calendar_id is not None
    assert calendar.calendar_name == "Test Calendar"
    assert calendar.user_id == test_user.user_id

# tests calendar update. Updates calendar name, the date calendar starts and ends. Checks change is represented in database
def test_update_calendar(db_session, created_calendar):
    new_name = "Updated Calendar Name"
    new_date_start = datetime(2026, 5, 1, 0, 0, 0)
    new_date_end = datetime(2026, 5, 31, 23, 59, 59)

    updated_calendar = update_calendar(
        db_session,
        created_calendar.calendar_id,
        calendar_name=new_name,
        date_start=new_date_start,
        date_end=new_date_end,
    )

    db_session.expire_all()
    reloaded = db_session.query(Calendar).filter(
        Calendar.calendar_id == created_calendar.calendar_id
    ).first()

    assert updated_calendar.calendar_id == created_calendar.calendar_id
    assert reloaded.calendar_name == new_name
    assert reloaded.date_start == new_date_start
    assert reloaded.date_end == new_date_end

# Tests only calendar name change
def test_update_calendar_name_only(db_session, created_calendar):
    updated_calendar = update_calendar(
        db_session,
        created_calendar.calendar_id,
        calendar_name="Partially Updated Calendar Name",
    )

    db_session.expire_all()
    reloaded = db_session.query(Calendar).filter(
        Calendar.calendar_id == created_calendar.calendar_id
    ).first()

    assert updated_calendar.calendar_id == created_calendar.calendar_id
    assert reloaded.calendar_name == "Partially Updated Calendar Name"

#Tests for error. If a calendar does not exists it should not modify 
def test_update_calendar_nonexistent_calendar(db_session):
    with pytest.raises(ValueError, match="Calendar not found"):
        update_calendar(db_session, uuid4(), calendar_name="New Name")

# Description: Tests calendars updates through ics file.
# Behaviour  
def test_update_calendar_icsfile(db_session, created_calendar):
    new_icsfile = "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR"

    result = update_calendar_icsfile(
        db_session,
        created_calendar.calendar_id,
        new_icsfile,
    )

    db_session.expire_all()
    updated_calendar = db_session.query(Calendar).filter(
        Calendar.calendar_id == created_calendar.calendar_id
    ).first()

    assert result is True
    assert updated_calendar.icsfile == new_icsfile

#Description: Tests for error. 
#Behaviour: If a calendar is being updated with nothing through an icsfile it should change nothing.
def test_update_calendar_icsfile_invalid(db_session, created_calendar):
    result_empty = update_calendar_icsfile(
        db_session,
        created_calendar.calendar_id,
        "",
    )
    result_none = update_calendar_icsfile(
        db_session,
        created_calendar.calendar_id,
        None,
    )

    assert result_empty is False
    assert result_none is False

#Tests 
def test_update_calendar_icsfile_nonexistent_calendar(db_session):
    result = update_calendar_icsfile(
        db_session,
        uuid4(),
        "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR",
    )
    assert result is False


def test_get_calendars_by_user_id(db_session, test_user, other_test_user):
    cal1 = create_calendar(db_session, "Calendar 1", test_user.user_id)
    cal2 = create_calendar(db_session, "Calendar 2", test_user.user_id)
    _other = create_calendar(db_session, "Other User Calendar", other_test_user.user_id)

    calendars = get_calendars_by_user_id(db_session, test_user.user_id)
    calendar_ids = [calendar.calendar_id for calendar in calendars]

    assert cal1.calendar_id in calendar_ids
    assert cal2.calendar_id in calendar_ids



def test_create_event_and_get_event_by_id(db_session, created_calendar, fake_event_data):
    event = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        fake_event_data["start_time"],
        fake_event_data["end_time"],
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    assert event.event_id is not None
    assert event.event_name == fake_event_data["event_name"]
    assert event.calendar_id == created_calendar.calendar_id
    assert event.full_address == fake_event_data["full_address"]
    assert event.start_time == fake_event_data["start_time"]
    assert event.end_time == fake_event_data["end_time"]
    assert event.event_description == fake_event_data["event_description"]
    assert event.priority_rank == fake_event_data["priority_rank"]

    db_session.expire_all()
    retrieved_event = get_event_by_id(db_session, event.event_id)

    assert retrieved_event is not None
    assert retrieved_event.event_id == event.event_id
    assert retrieved_event.event_name == event.event_name
    assert retrieved_event.calendar_id == event.calendar_id


def test_get_event_by_id_returns_none_when_missing(db_session):
    assert get_event_by_id(db_session, uuid4()) is None


def test_get_events_for_calendar_day(db_session, created_calendar, fake_event_data):
    same_day_event = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        datetime(2026, 4, 9, 10, 0, 0),
        datetime(2026, 4, 9, 11, 0, 0),
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    other_day_event = create_event(
        db_session,
        created_calendar.calendar_id,
        "Other Day Event",
        "123 Test St",
        datetime(2026, 4, 10, 10, 0, 0),
        datetime(2026, 4, 10, 11, 0, 0),
        "Other day description",
        2,
    )

    events = get_events_for_calendar_day(
        db_session,
        created_calendar.calendar_id,
        datetime(2026, 4, 9, 15, 0, 0),
    )

    event_ids = [event.event_id for event in events]

    assert same_day_event.event_id in event_ids
    assert other_day_event.event_id not in event_ids


def test_update_event(db_session, created_calendar, fake_event_data):
    event = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        fake_event_data["start_time"],
        fake_event_data["end_time"],
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    result = update_event(
        db_session,
        event.event_id,
        "Updated Event Name",
        datetime(2026, 4, 9, 12, 0, 0),
        datetime(2026, 4, 9, 13, 0, 0),
        2,
        "Updated description",
    )

    assert result is True

    db_session.expire_all()
    updated_event = get_event_by_id(db_session, event.event_id)

    assert updated_event.event_name == "Updated Event Name"
    assert updated_event.start_time == datetime(2026, 4, 9, 12, 0, 0)
    assert updated_event.end_time == datetime(2026, 4, 9, 13, 0, 0)
    assert updated_event.priority_rank == 2
    assert updated_event.event_description == "Updated description"


def test_update_event_nonexistent_event(db_session):
    with pytest.raises(ValueError, match="Event not found"):
        update_event(
            db_session,
            uuid4(),
            "Updated Event Name",
            datetime(2026, 4, 9, 12, 0, 0),
            datetime(2026, 4, 9, 13, 0, 0),
            2,
            "Updated description",
        )


def test_remove_event(db_session, created_calendar, fake_event_data):
    event = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        fake_event_data["start_time"],
        fake_event_data["end_time"],
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    result = remove_event(db_session, event.event_id)

    assert result is True

    db_session.expire_all()
    deleted_event = get_event_by_id(db_session, event.event_id)
    assert deleted_event is None


def test_remove_event_nonexistent_event(db_session):
    with pytest.raises(ValueError, match="Event not found"):
        remove_event(db_session, uuid4())


def test_detect_event_conflicts_overlap(db_session, created_calendar):
    existing_event = create_event(
        db_session,
        created_calendar.calendar_id,
        "Existing Event",
        "123 Test St",
        datetime(2026, 4, 9, 10, 0, 0),
        datetime(2026, 4, 9, 11, 0, 0),
        "Description",
        1,
    )

    conflicts = detect_event_conflicts(
        db_session,
        created_calendar.calendar_id,
        datetime(2026, 4, 9, 10, 30, 0),
        datetime(2026, 4, 9, 11, 30, 0),
    )

    conflict_ids = [event.event_id for event in conflicts]
    assert existing_event.event_id in conflict_ids


def test_detect_event_conflicts_no_overlap(db_session, created_calendar):
    create_event(
        db_session,
        created_calendar.calendar_id,
        "Existing Event",
        "123 Test St",
        datetime(2026, 4, 9, 10, 0, 0),
        datetime(2026, 4, 9, 11, 0, 0),
        "Description",
        1,
    )

    conflicts = detect_event_conflicts(
        db_session,
        created_calendar.calendar_id,
        datetime(2026, 4, 9, 11, 30, 0),
        datetime(2026, 4, 9, 12, 30, 0),
    )

    assert conflicts == []


def test_add_event_to_calendar(db_session, created_calendar, other_test_user):
    other_calendar = create_calendar(db_session, "Other Calendar", other_test_user.user_id)

    event = create_event(
        db_session,
        other_calendar.calendar_id,
        "Movable Event",
        "123 Test St",
        datetime(2026, 4, 9, 10, 0, 0),
        datetime(2026, 4, 9, 11, 0, 0),
        "Description",
        1,
    )

    added_event = add_event_to_calendar(
        db_session,
        created_calendar.calendar_id,
        event.event_id,
    )

    db_session.expire_all()
    reloaded = get_event_by_id(db_session, event.event_id)

    assert added_event.event_id == event.event_id
    assert reloaded.calendar_id == created_calendar.calendar_id


def test_add_event_to_calendar_nonexistent_event(db_session, created_calendar):
    with pytest.raises(ValueError, match="Event not found"):
        add_event_to_calendar(db_session, created_calendar.calendar_id, uuid4())


def test_remove_event_from_calendar(db_session, created_calendar, fake_event_data):
    event = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        fake_event_data["start_time"],
        fake_event_data["end_time"],
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    result = remove_event_from_calendar(
        db_session,
        created_calendar.calendar_id,
        event.event_id,
    )

    db_session.expire_all()
    deleted_event = get_event_by_id(db_session, event.event_id)

    assert result is None
    assert deleted_event is None


def test_remove_event_from_calendar_nonexistent_event(db_session, created_calendar):
    with pytest.raises(ValueError, match="Event not found"):
        remove_event_from_calendar(db_session, created_calendar.calendar_id, uuid4())


def test_get_all_events_by_calendar_id(db_session, created_calendar, fake_event_data):
    event1 = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        fake_event_data["start_time"],
        fake_event_data["end_time"],
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    event2 = create_event(
        db_session,
        created_calendar.calendar_id,
        "Another Event",
        "456 Elm St",
        datetime(2026, 4, 10, 12, 0, 0),
        datetime(2026, 4, 10, 13, 0, 0),
        "Another description",
        2,
    )

    events = get_all_events_by_calendar_id(db_session, created_calendar.calendar_id)
    event_ids = [event.event_id for event in events]

    assert event1.event_id in event_ids
    assert event2.event_id in event_ids


def test_get_event_by_calendar_id(db_session, created_calendar, fake_event_data):
    event = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        fake_event_data["start_time"],
        fake_event_data["end_time"],
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    found = get_event_by_calendar_id(
        db_session,
        created_calendar.calendar_id,
        event.event_id,
    )

    assert found.event_id == event.event_id
    assert found.calendar_id == created_calendar.calendar_id


def test_get_event_by_calendar_id_not_found(db_session, created_calendar):
    with pytest.raises(ValueError, match="Event not found"):
        get_event_by_calendar_id(db_session, created_calendar.calendar_id, uuid4())


def test_get_calendar_context(db_session, created_calendar):
    first_event = create_event(
        db_session,
        created_calendar.calendar_id,
        "First Event",
        "123 Test St",
        datetime(2026, 4, 9, 9, 0, 0),
        datetime(2026, 4, 9, 10, 0, 0),
        "First description",
        1,
    )

    second_event = create_event(
        db_session,
        created_calendar.calendar_id,
        "Second Event",
        "456 Elm St",
        datetime(2026, 4, 9, 11, 0, 0),
        datetime(2026, 4, 9, 12, 0, 0),
        "Second description",
        2,
    )

    context = get_calendar_context(db_session, str(created_calendar.calendar_id))

    assert "events" in context
    assert len(context["events"]) >= 2
    assert context["events"][0]["id"] == str(first_event.event_id)
    assert context["events"][1]["id"] == str(second_event.event_id)
    assert context["events"][0]["name"] == "First Event"
    assert context["events"][1]["name"] == "Second Event"



def test_day_scheduling_hints_success_no_conflict(db_session, created_calendar):
    create_event(
        db_session,
        created_calendar.calendar_id,
        "Morning Event",
        "123 Test St",
        datetime(2026, 4, 9, 10, 0, 0),
        datetime(2026, 4, 9, 11, 0, 0),
        "Morning description",
        1,
    )

    create_event(
        db_session,
        created_calendar.calendar_id,
        "Afternoon Event",
        "456 Elm St",
        datetime(2026, 4, 9, 13, 0, 0),
        datetime(2026, 4, 9, 14, 0, 0),
        "Afternoon description",
        2,
    )

    result = day_scheduling_hints(
        db_session,
        created_calendar.user_id,
        created_calendar.calendar_id,
        "2026-04-09",
        "09:00",
        60,
        "17:00",
    )

    assert result["hasConflict"] is False
    assert result["workingHours"]["startTime"] == "09:00"
    assert result["workingHours"]["endTime"] == "17:00"
    assert len(result["suggestions"]) > 0


def test_day_scheduling_hints_conflict(db_session, created_calendar):
    existing_event = create_event(
        db_session,
        created_calendar.calendar_id,
        "Busy Event",
        "123 Test St",
        datetime(2026, 4, 9, 10, 0, 0),
        datetime(2026, 4, 9, 11, 0, 0),
        "Busy description",
        1,
    )

    result = day_scheduling_hints(
        db_session,
        created_calendar.user_id,
        created_calendar.calendar_id,
        "2026-04-09",
        "10:30",
        60,
        "17:00",
    )

    assert result["hasConflict"] is True
    assert len(result["conflicts"]) == 1
    assert result["conflicts"][0]["eventId"] == str(existing_event.event_id)


def test_day_scheduling_hints_calendar_not_found(db_session, user_id):
    with pytest.raises(HTTPException) as excinfo:
        day_scheduling_hints(
            db_session,
            user_id,
            uuid4(),
            "2026-04-09",
            "09:00",
            60,
            "17:00",
        )

    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "Calendar not found"


def test_day_scheduling_hints_wrong_user(db_session, created_calendar):
    with pytest.raises(HTTPException) as excinfo:
        day_scheduling_hints(
            db_session,
            uuid4(),
            created_calendar.calendar_id,
            "2026-04-09",
            "09:00",
            60,
            "17:00",
        )

    assert excinfo.value.status_code == 403
    assert excinfo.value.detail == "Not authorized to access this calendar"


def test_day_scheduling_hints_invalid_date(db_session, created_calendar):
    with pytest.raises(HTTPException) as excinfo:
        day_scheduling_hints(
            db_session,
            created_calendar.user_id,
            created_calendar.calendar_id,
            "04-09-2026",
            "09:00",
            60,
            "17:00",
        )

    assert excinfo.value.status_code == 400
    assert "Invalid date format" in excinfo.value.detail


def test_day_scheduling_hints_invalid_time(db_session, created_calendar):
    with pytest.raises(HTTPException) as excinfo:
        day_scheduling_hints(
            db_session,
            created_calendar.user_id,
            created_calendar.calendar_id,
            "2026-04-09",
            "9am",
            60,
            "17:00",
        )

    assert excinfo.value.status_code == 400
    assert "Invalid time format" in excinfo.value.detail


def test_day_scheduling_hints_end_before_start(db_session, created_calendar):
    with pytest.raises(HTTPException) as excinfo:
        day_scheduling_hints(
            db_session,
            created_calendar.user_id,
            created_calendar.calendar_id,
            "2026-04-09",
            "17:00",
            60,
            "09:00",
        )

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "endTime must be after startTime"

# EventParticipants

def test_create_event_participant(db_session, created_calendar, fake_event_data, test_user):
    event = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        fake_event_data["start_time"],
        fake_event_data["end_time"],
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    participant = add_event_participant(
        db_session,
        event.event_id,
        test_user.first_name,
        test_user.email,
        None,
    )

    participants = get_participants_for_event(db_session, event.event_id)
    participant_names = [p.name for p in participants]

    assert participant is not None
    assert participant.participant_id is not None
    assert participant.name == test_user.first_name
    assert test_user.first_name in participant_names


def test_remove_event_participant(db_session, created_calendar, fake_event_data, test_user):
    event = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        fake_event_data["start_time"],
        fake_event_data["end_time"],
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    participant = add_event_participant(
        db_session,
        event.event_id,
        test_user.first_name,
        test_user.email,
        None,
    )

    result = remove_event_participant(db_session, event.event_id, participant.participant_id)

    participants = get_participants_for_event(db_session, event.event_id)
    participant_ids = [p.participant_id for p in participants]

    assert result is True
    assert participant.participant_id not in participant_ids


def test_get_event_participants(db_session, created_calendar, fake_event_data, test_user, other_test_user):
    event = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        fake_event_data["start_time"],
        fake_event_data["end_time"],
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    add_event_participant(
        db_session,
        event.event_id,
        test_user.first_name,
        test_user.email,
        None,
    )
    add_event_participant(
        db_session,
        event.event_id,
        other_test_user.first_name,
        other_test_user.email,
        None,
    )

    participants = get_participants_for_event(db_session, event.event_id)
    participant_names = [p.name for p in participants]

    assert test_user.first_name in participant_names
    assert other_test_user.first_name in participant_names
    assert len(participants) == 2


def test_get_events_participants_info(db_session, created_calendar, fake_event_data, test_user, other_test_user):
    event = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        fake_event_data["start_time"],
        fake_event_data["end_time"],
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    add_event_participant(
        db_session,
        event.event_id,
        test_user.first_name,
        test_user.email,
        None,
    )
    add_event_participant(
        db_session,
        event.event_id,
        other_test_user.first_name,
        other_test_user.email,
        None,
    )

    participants_info = get_participants_for_event(db_session, event.event_id)

    names = [p.name for p in participants_info]
    infos = [p.info for p in participants_info]

    assert test_user.first_name in names
    assert other_test_user.first_name in names
    assert test_user.email in infos[0]
    assert other_test_user.email in infos[1]
    assert other_test_user.email in infos


def test_get_participant_details(db_session, created_calendar, fake_event_data, test_user):
    event = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        fake_event_data["start_time"],
        fake_event_data["end_time"],
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    participant = add_event_participant(
        db_session,
        event.event_id,
        test_user.first_name,
        test_user.email,
        "123 Test St",
    )

    found = get_participant_details(db_session, participant.participant_id)

    assert found is not None
    assert found.participant_id == participant.participant_id
    assert found.name == test_user.first_name
    assert found.info == test_user.email
    assert found.full_address == "123 Test St"


def test_detect_participant_event_conflicts(db_session, created_calendar, test_user):
    event1 = create_event(
        db_session,
        created_calendar.calendar_id,
        "Existing Event",
        "123 Test St",
        datetime(2026, 4, 9, 10, 0, 0),
        datetime(2026, 4, 9, 11, 0, 0),
        "Description",
        1,
    )

    participant = add_event_participant(
        db_session,
        event1.event_id,
        test_user.first_name,
        test_user.email,
        None,
    )

    conflicts = detect_participant_event_conflicts(
        db_session,
        participant.participant_id,
        datetime(2026, 4, 9, 10, 30, 0),
        datetime(2026, 4, 9, 11, 30, 0),
    )

    conflict_ids = [event.event_id for event in conflicts]
    assert event1.event_id in conflict_ids


def test_remove_participant_only_when_unlinked(db_session, created_calendar, fake_event_data, test_user):
    event = create_event(
        db_session,
        created_calendar.calendar_id,
        fake_event_data["event_name"],
        fake_event_data["full_address"],
        fake_event_data["start_time"],
        fake_event_data["end_time"],
        fake_event_data["event_description"],
        fake_event_data["priority_rank"],
    )

    participant = add_event_participant(
        db_session,
        event.event_id,
        test_user.first_name,
        test_user.email,
        None,
    )

    with pytest.raises(ValueError, match="Cannot delete participant"):
        remove_participant(db_session, participant.participant_id)

    remove_event_participant(db_session, event.event_id, participant.participant_id)
    result = remove_participant(db_session, participant.participant_id)

    assert result is True
    assert get_participant_details(db_session, participant.participant_id) is None