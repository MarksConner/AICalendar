from datetime import datetime, timedelta
from models.schedule import Event

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

    #Helper that searches for first free fitting slot
    def find_slot(self, earliest_start_iso, latest_end_iso, duration_minutes):
        earliest = datetime.fromisoformat(earliest_start_iso)
        latest = datetime.fromisoformat(latest_end_iso)
        duration = timedelta(minutes=duration_minutes)

        #Only considering that day/window
        candidates = [e for e in self.events if e.start.date() == earliest.date()]
        candidates.sort(key=lambda e: e.start)

        #Start with earliest start as the current start
        current_start = earliest

        for ev in candidates:
            #If event is before current start, skip
            if ev.end <=current_start:
                continue
            
            #If there is a gap between current start and ev's start, check for fit
            if ev.start - current_start >= duration:
                #Gap found
                if current_start + duration <= latest:
                    return current_start

                #Move current start to after this event has already ended
                if ev.end > current_start:
                    current_start = ev.end

        #Check after last event in candidates
        if latest - current_start >= duration:
            return current_start
        return None
