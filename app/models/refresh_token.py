# Refresh Token Table (not used)
# Defines an ORM model that maps the refresh token table in the database to a Python class.
# Written by: Luis Matheus Perdomo

from sqlalchemy import Column,Boolean, Text, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import func
import uuid

from .base import Base

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    refresh_token_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(Text, nullable=False) 
    parent_id = Column(UUID(as_uuid=True), ForeignKey("refresh_tokens.refresh_token_id"), nullable=True) 
    revoked = Column(Boolean, default=False)
    expires_at = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
