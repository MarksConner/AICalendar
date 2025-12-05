from app.db import SessionLocal
from app.models.locations import Locations

def create_location(full_address: str, zip_code: int | None = None):
    session = SessionLocal()
    try:
        loc = Locations(full_address=full_address, zip_code=zip_code)
        session.add(loc)
        session.commit()
        session.refresh(loc)
        return loc
    finally:
        session.close()