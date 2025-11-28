from app.db import SessionLocal
from app.models.users import Users
from datetime import datetime, timezone, timedelta
import uuid


def create_user(email: str, username: str, first_name: str, last_name: str,password: str) -> Users:
    session = SessionLocal()
    
    try:
        token = uuid.uuid4()
        new_user = Users(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            password = password,
            email_verification_token = token,
            email_verification_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5),
            email_verified = False,
            email_verification_sent_at = datetime.now(timezone.utc)
        )

        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        return new_user

    finally:
        session.close()


def get_user_by_user_id(user_id: uuid)-> Users:
    session = SessionLocal()
    try:
        user = session.query(Users).filter(Users.user_id == user_id).first()
        return user
    finally:
        session.close()

def get_user_by_email(email: str) -> Users:
    session = SessionLocal()
    try:
        user = session.query(Users).filter(Users.email == email).first()
        return user
    finally:
        session.close()

def login():
    pass

def delete_user_by_email(email: str) -> bool:
    session = SessionLocal()
    try:
        user_to_delete = session.query(Users).filter(Users.email == "n").first()
        if user_to_delete is None:
            
            print("User not found.")

        else:

            session.delete(user_to_delete)   
            session.commit()                 
            print("Deleted user with id:", user_to_delete.user_id,"And email:",user_to_delete.email)

    finally:
        session.close()

# called by frontend verify end point
def verify_user_email(token: uuid, verification_sent_at: timezone) -> bool:
    session = SessionLocal()

    try: 
        user = (session.query(Users).filter(Users.email_verification_token == token)).first

        if not user:
            return False
        
        if (not user.email_verification_expires_at or datetime.now(timezone.utc) > user.email_verification_expires_at):
            return False
        
        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_expires_at = None
        user.email_verification_sent_at = None
        session.commit()
        return True
    
    finally: 
        session.close()