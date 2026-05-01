from sqlalchemy import Column, String, Text, Boolean
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import TIMESTAMP, ForeignKey, func
from .base import Base
import uuid

class Calendar(Base):
    __tablename__ = "calendar"  # must match supabase table name
    calendar_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    calendar_name = Column(Text, nullable=False)
    date_start = Column(TIMESTAMP)
    date_end = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    icsfile = Column(Text, nullable=True)
    is_public = Column(Boolean, nullable=False, default=False)
    public_token = Column(UUID(as_uuid=True), nullable=True, default=uuid.uuid4)