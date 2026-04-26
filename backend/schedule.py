from __future__ import annotations
from dataclasses import replace
from datetime import datetime, timedelta
from uuid import uuid4

from .event import Event
from .errors import ConflictError
from .time_utils import event_overlaps, free_slots

class Schedule:
    def __init__ (self):
        self._events: list[Event] = []

    @property
    def events(self) -> list[Event]:
        return list(self._events)

    @staticmethod
    def parse_datetime(value: str) -> datetime:
        # this helps if your model outputs timestamps ending in "Z"
        if value.endswith("Z"):
            value = value[:-1]
        dt = datetime.fromisoformat(value)
        return  dt.replace(tzinfo=None)
    
    def get(self, event_id: str) -> Event:
        for evnt in self._events:
            if evnt.id == event_id:
                return evnt
        raise KeyError(f"No event with id {event_id} found.")

    def add_event(
        self,
        name: str,
        start: datetime,
        duration_minutes: int,
        location: str | None = None,
        priority: int = 0,
        flexible: bool = False,
        travel_time_min: int = 0,
        allow_conflicts: bool = False,
    ) -> Event:
        # here I am just setting the end time based on the duration
        end = start + timedelta(minutes = duration_minutes)
        
        # here I am creating a new event and setting all it's perameters appropriately
        new_event = Event(
            id=str(uuid4()),
            name=name,
            start=start,
            end=end,
            location=location,
            priority=priority,
            flexible=flexible,
            travel_time_min=travel_time_min,
        )
        # I am checking for conflicts because almost all events should not overlap
        # I raise an error if it conflicts unless allow_conflicts is set to true
        if not allow_conflicts:
            conflicts = [evnt for evnt in self._events if event_overlaps(evnt, new_event)]
            if conflicts:
                raise ConflictError(new_event = new_event, conflicts = conflicts)
            
        # I am now adding the event to the list of ._events and sorting it based on start time
        self._events.append(new_event)
        self._events.sort(key = lambda evnt: evnt.start)
        return new_event
    
    # removing is simple, I get the count of events before and after to ensure one was removed
    def remove_event(self, event_id: str) -> bool:
        before_count = len(self._events)
        # here I am using a list comprehension to remove the appropriate event
        self._events = [evnt for evnt in self._events if evnt.id != event_id]
        return len(self._events) < before_count
    
    
    # moving an event is similar to adding, but I have to keep the same duration
    def move_event(self, event_id: str, new_start: datetime, allow_conflicts: bool = False) -> Event:
        evnt = self.get(event_id)
        duration = evnt.end - evnt.start
        end = new_start + duration
        # the replace function from dataclasses is useful here to create a new event with the updated times
        moved = replace(evnt, start = new_start, end = end)

        if not allow_conflicts:
            for other in self._events:
                if other.id == event_id:
                    continue
                if event_overlaps(other, moved):
                    raise ConflictError(new_event = moved, conflicts = [other])
        
        self._events = [evnt if evnt.id != event_id else moved for evnt in self._events]
        self._events.sort(key = lambda evnt: evnt.start)

        return moved

    # this is used when your model provides earliest/latest instead of a fixed datetime
    def find_slot(self, earliest_start_iso: str, latest_end_iso: str, duration_minutes: int) -> datetime | None:
        earliest = self.parse_datetime(earliest_start_iso)
        latest = self.parse_datetime(latest_end_iso)
        duration = timedelta(minutes=duration_minutes)

        # only considering that window
        candidates = free_slots(
            events=self.events,
            window_start=earliest,
            window_end=latest,
            duration=duration,
        )
        if not candidates:
            return None
        return candidates[0][0]