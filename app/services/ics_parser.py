
from datetime import datetime, timedelta
class Event:
    def __init__(self, title, start, end, location=None, flexible=False):
        self.title = title
        self.start = start
        self.end = end
        self.location = location
        self.flexible = flexible  # can be moved
        self.travel_before = timedelta(minutes=0)

    def apply_travel(self, minutes):
        self.travel_before = timedelta(minutes=minutes)
        self.start = self.start - self.travel_before

    def to_dict(self):
        return {
            "title": self.title,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "location": self.location,
            "flexible": self.flexible,
            "travel_buffer_minutes": int(self.travel_before.total_seconds() / 60)
        }
        
class Scheduler:
    def __init__(self):
        self.events = []  #in-memory for now

    def add_event(self, title, start, duration_minutes, location=None, flexible=False, travel_time=0):
        start_dt = datetime.fromisoformat(start)
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        new_event = Event(title, start_dt, end_dt, location, flexible)

        #apply travel buffer BEFORE it
        if travel_time > 0:
            new_event.apply_travel(travel_time)

        #try inserting
        self.resolve_conflicts(new_event)
        self.events.append(new_event)
        self.events.sort(key=lambda e: e.start)

        return new_event.to_dict()

    def resolve_conflicts(self, new_event):
        for ev in self.events:
            if not self.overlaps(ev, new_event):
                continue

            if ev.flexible:
                #move flexible event 30 minutes after new event
                shift = (new_event.end - ev.start) + timedelta(minutes=30)
                ev.start += shift
                ev.end += shift
            else:
                #hard conflict with non-flexible event: move new_event instead
                shift = (ev.end - new_event.start) + timedelta(minutes=15)
                new_event.start += shift
                new_event.end += shift

    def overlaps(self, ev1, ev2):
        return not (ev1.end <= ev2.start or ev2.end <= ev1.start)

    def get_day(self, date_str):
        day_start = datetime.fromisoformat(date_str)
        result = []
        for ev in self.events:
            if ev.start.date() == day_start.date():
                result.append(ev.to_dict())
        return result

    def get_month(self, year, month):
        output = []
        for ev in self.events:
            if ev.start.year == year and ev.start.month == month:
                output.append(ev.to_dict())
        return output
    
from icalendar import Calendar
def load_calendar_from_file(path: str) -> Calendar:
    with open(path, "rb") as f:
        data = f.read()
    cal = Calendar.from_ical(data)
    return cal

def parse_calendar(calendar: Calendar) -> list[Event]:
    events: list[Event] = []
    attendees: list[str] = []
    organizer: str
    for block in calendar.walk("VEVENT"):
        title = str(block.get("SUMMARY", "Untitled"))
        start_time = block.decoded("DTSTART")
        
        if "DTEND" in block:
            end_time = block.decoded("DTEND")
        else:
            end_time = start_time  #if not final date make it an instant event
        location = str(block.get("LOCATION", ""))
        if "ATTENDEE" in block
        events.append(evt)


    
    
    print(events)
'''
DTSTART – start time/date
DTEND or DURATION – end time or duration
SUMMARY – title (but still handle missing)

LOCATION
DESCRIPTION
RRULE (recurrence)
PRIORITY
CATEGORIES
ORGANIZER
ATTENDEE
'''
def main():
    cal = load_calendar_from_file("sample.ics")
    events = parse_calendar(cal)
    scheduler = Scheduler()

#call main 
if __name__ == "__main__":
    main()