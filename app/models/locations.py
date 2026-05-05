# Locations Model
# Defines an ORM model that maps the locations table in the database to a Python class.
# Written by: Luis Matheus Perdomo

from sqlalchemy import Column,INT, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from .base import Base


class Locations(Base):
    __tablename__ = 'locations'
    full_address = Column(Text, primary_key =True)
    zip_code = Column(INT)
    state = Column(Text)
    city = Column(Text)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'))

