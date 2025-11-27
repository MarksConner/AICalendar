from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import func
from sqlalchemy import TIMESTAMP, ForeignKey, func
import uuid
from .base import Base

class Events(Base):
    __tablename__ = "events"
    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_name = Column(Text, nullable=False)
    event_description = Column(Text)
    priority_rank = Column(int)
    start_time = Column(TIMESTAMP, nullable=False)
    end_time = Column(TIMESTAMP)
    calendar_id = Column(UUID(as_uuid=True), ForeignKey('calendars.calendar_id'))
    created_at = Column(TIMESTAMP, server_default=func.now())
