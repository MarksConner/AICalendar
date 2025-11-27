from db import SessionLocal
from models.users import Users
from sqlalchemy import UUID

def create_user(email: str, username: str, first_name: str, last_name: str) -> Users:
    session = SessionLocal()
    try:
        new_user = Users(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        return new_user

    finally:
        session.close()

def get_user_by_user_id(user_id: UUID)-> Users:
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

def delete_user_by_email(email: str) -> bool:
    session = SessionLocal
    try:
        user_to_delete = session.query(Users).filter(Users.email == "luisamp971@gmail.com").first()
        if user_to_delete is None:
            
            print("User not found.")

        else:

            session.delete(user_to_delete)   
            session.commit()                 
            print("Deleted user with id:", user_to_delete.user_id,"And email:",user_to_delete.email)

    finally:
        session.close()



