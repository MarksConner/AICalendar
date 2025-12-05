from sqlalchemy import Column, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import TIMESTAMP, ForeignKey, func
import uuid
from .base import Base

class Chat(Base):
    __tablename__ = "chat"
    chat_name = Column(Text)
    chat_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())