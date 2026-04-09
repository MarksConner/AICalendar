
from typing import List, Dict, Any, Optional
from icalendar import Calendar
from datetime import date, datetime

def parse_ics(ics_content: str) -> List[Dict[str, Any]]:
    cal = Calendar.from_ical(ics_content)
    events = []

    for component in cal.walk():
        if component.name == "VEVENT":
            raw_start = component.get("dtstart")
            raw_end = component.get("dtend")
            start_time = raw_start.dt if raw_start else None
            end_time = raw_end.dt if raw_end else None
            if isinstance(start_time, date) and not isinstance(start_time, datetime):
                start_time = datetime.combine(start_time, datetime.min.time())

            if isinstance(end_time, date) and not isinstance(end_time, datetime):
                end_time = datetime.combine(end_time, datetime.min.time())
            event = {
                "summary": str(component.get("summary")), #Summary is event name
                "dtstart": start_time, #start_time is datetime object
                "dtend": end_time, #end_time is datetime  end object
                "description": str(component.get("description", "")), #Description is event description
                "location": str(component.get("location", "")), #Location is full address
            
            }
            events.append(event)

    return events