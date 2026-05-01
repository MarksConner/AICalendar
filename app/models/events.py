from sqlalchemy import Column, String, Text, Integer, Float, TIMESTAMP, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import func
from .base import Base
import uuid

class Events(Base):
    __tablename__ = "events"
    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_name = Column(Text, nullable=False)
    event_description = Column(Text)
    full_address = Column(Text)
    geo_latitude = Column(Float, nullable=True)
    geo_longitude = Column(Float, nullable=True)
    priority_rank = Column(Integer)
    start_time = Column(TIMESTAMP, nullable=False)
    end_time = Column(TIMESTAMP)
    calendar_id = Column(UUID(as_uuid=True), ForeignKey('calendar.calendar_id'))
    created_at = Column(TIMESTAMP, server_default=func.now())
    event_type = Column(Text, nullable=False, default = "normal")
    is_booked = Column(Boolean,nullable = False, default = False)