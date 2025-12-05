from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import func
from sqlalchemy import TIMESTAMP, ForeignKey, func
import uuid
from .base import Base

class EventParticipants(Base):
    __tablename__ = "eventsparticipants"

    name = Column(Text, primary_key=True)
    info = Column(Text, primary_key=True)   # composite PK with name
    role = Column(Text)

    event_id = Column(UUID(as_uuid=True), ForeignKey("events.event_id"))