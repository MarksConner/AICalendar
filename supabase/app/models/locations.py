# Stores location current location of client or location of event
from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import TIMESTAMP, ForeignKey, func
import uuid
from .base import Base

Base = declarative_base()

class Locations(Base):
    __tablename__ = 'locations'
    full_address = Column(Text, primary_key =True)
    zip_code = Column(int)
    state = Column(Text)
    city = Column(Text)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.users_id'))

