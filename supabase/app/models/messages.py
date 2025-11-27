from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy import TIMESTAMP, ForeignKey, func
from .base import Base

Base = declarative_base()

class Messages(Base):
    __tablename__ = 'messages'
    messages_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey('chat.chat_id'), nullable=False)
    sent_at = Column(TIMESTAMP, server_default=func.now())
    sender_is = Column(bool, nullable=False)
    content = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
