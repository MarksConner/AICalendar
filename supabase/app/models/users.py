from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import func
import uuid
from .base import Base


Base = declarative_base()

class Users(Base):
    __tablename__ = 'users'
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, nullable=False, unique=True)
    username = Column(Text, nullable=False, unique=True)
    first_name = Column(Text, nullable=False)
    last_name = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())



