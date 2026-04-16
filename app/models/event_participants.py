from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import func
from sqlalchemy import TIMESTAMP, ForeignKey, func
import uuid
from .base import Base

class EventParticipants(Base):
    __tablename__ = "events_participants"
    participant_id = Column(UUID(as_uuid=True), ForeignKey("participants.participant_id"), primary_key=True, nullable = False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.event_id"), primary_key=True, nullable = False)