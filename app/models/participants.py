# Participants Model
# Defines an ORM model that maps the participant table in the database to a Python class.
# Written by: Luis Matheus Perdomo

from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import func
from sqlalchemy import TIMESTAMP, ForeignKey, func
import uuid
from .base import Base

class Participants(Base):
    __tablename__ = "participants"
    participant_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    info = Column(Text, nullable=True)
    full_address = Column(Text)

