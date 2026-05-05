# Users Model
# Defines an ORM model that maps the users table in the database to a Python class.
# Written by: Luis Matheus Perdomo

from sqlalchemy import Column, String, Boolean, Text, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import func
import uuid
from .base import Base

class Users(Base):
    __tablename__ = 'users'
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, nullable=False, unique=True)
    username = Column(Text, nullable=False, unique=True)
    first_name = Column(Text, nullable=False)
    last_name = Column(Text, nullable=False)

    password_hash = Column(Text, nullable=False, default='')

    created_at = Column(TIMESTAMP, server_default=func.now())
    email_verified = Column(Boolean, nullable=False, default=False)
    email_verification_token = Column(UUID(as_uuid=True), default=uuid.uuid4)
    email_verification_sent_at = Column(TIMESTAMP, server_default=func.now())
    email_verification_expires_at = Column(TIMESTAMP, nullable=True)
    password_reset_token = Column(UUID(as_uuid=True), default=uuid.uuid4)
    password_reset_sent_at = Column(TIMESTAMP, server_default=func.now())
    password_reset_expires_at = Column(TIMESTAMP, nullable=True)


