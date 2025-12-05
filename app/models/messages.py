from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy import TIMESTAMP, ForeignKey,Boolean,func
from .base import Base


class Messages(Base):
    __tablename__ = 'messages'
    message_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey('chat.chat_id'), nullable=False)
    sent_at = Column(TIMESTAMP, server_default=func.now())
    sender_is = Column(Boolean, nullable=False)
    content = Column(Text)
    file_url = Column(Text, nullable=True)

