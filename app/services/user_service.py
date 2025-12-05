from app.db import SessionLocal
from app.models.users import Users
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

import uuid
import jwt 

SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"

def create_user(session: Session, email: str, username: str, first_name: str, last_name: str,password: str) -> Users:

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


def get_user_by_user_id(session: Session, user_id: uuid)-> Users:

    user = session.query(Users).filter(Users.user_id == user_id).first()
    return user


def get_user_by_email(session: Session,email: str) -> Users:

    user = session.query(Users).filter(Users.email == email).first()
    return user


def delete_user_by_email(session: Session, email: str) -> bool:

    user_to_delete = session.query(Users).filter(Users.email == "n").first()
    if user_to_delete is None:
        print("User not found.")
    else:
        session.delete(user_to_delete)   
        session.commit()                 
        print("Deleted user with id:", user_to_delete.user_id,"And email:",user_to_delete.email)


# called by frontend verify end point
def verify_user_email(session: Session, token) -> bool:
    user = (session.query(Users).filter(Users.email_verification_token == token)).first()
    if not user:
        return False
    
    if not user.email_verification_expires_at:
        return False

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if now > user.email_verification_expires_at:
        return False

    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_expires_at = None
    user.email_verification_sent_at = None
    session.commit()
    return True


def get_user_email_by_id(session: Session,user_id: uuid)->str:
    user = (session.query(Users).filter(user_id == Users.user_id)).first()
    if user is None:
        raise ValueError("user not found")        
    return user.email

#Verify email and password exist and match return bool. 
def login_credentials(db: Session, email: str, passsword: str) -> bool:
    user = (db.query(Users).filter(Users.email == email, Users.password == passsword)).first()
    
    if user is None:
        return False
  

    return True

def create_reset_token(db: Session, email: str) ->bool:
    user = get_user_by_email(db,email)
    if user is None:
        return False
    user.password_reset_token = uuid.uuid4()
    user.password_reset_sent_at =  datetime.now(timezone.utc)
    user.password_reset_expires_at =  datetime.now(timezone.utc) + timedelta(minutes=5)
    db.commit()
    db.refresh(user)    
    return True
    
def reset_password_token(db: Session, email:str, token: str, new_password: str) -> bool:
    user = get_user_by_email(db,email)
    if user is None:
        return False
    if user.password_reset_token != token:
        return False
    if user.password_reset_token is None:
        return False
    if user.password_reset_expires_at is None:
        return False
    
    now = datetime.now(timezone.utc)
    
    if now > user.password_reset_expires_at:
        return False
    
    user.password = new_password
    user.password_reset_token = None
    user.password_reset_expires_at = None
    user.password_reset_sent_at = None
    db.commit()
    db.refresh(user)
    return True 

#Create access token. Data is a dict with email, user_id and a expiration date which is added.
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def  login_credentials_user(db, email: str, password: str):
    user = get_user_by_email(db, email)

    if not user:
        return None
    
    if not user.password  == password:
        return None
    dictionary: dict
    dictionary = {"email": user.email,"user_id": str(user.user_id)}
    
    token = create_access_token(dictionary)
    
    return {"access_token": token,"token_type": "bearer"}

