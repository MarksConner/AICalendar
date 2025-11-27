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
