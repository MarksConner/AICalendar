import bcrypt
from app.db import SessionLocal
from app.models.users import Users
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.refresh_token import RefreshToken
import hashlib
import uuid
import jwt 
import os

SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))

def create_user(session: Session, email: str, username: str, first_name: str, last_name: str, password: str) -> Users:

    if len(password) <= 5  :
        raise ValueError("Password must be more than 5 characters long.")
    token = uuid.uuid4()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    new_user = Users(
        email=email,
        username=username,
        first_name=first_name,
        last_name=last_name,
        password_hash = hashed_password.decode('utf-8'),
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


# Verify user email using token
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


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

#Verify email and password exist and match, return bool. 
def login_credentials(db: Session, email: str, passsword: str) -> bool:
    user = (db.query(Users).filter(Users.email == email)).first()

    if user is None:
        return False
  
    if not verify_password(passsword, user.password_hash):
        return False

    return True

#Password reset token functions
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
    if len(new_password) < 6:
        raise ValueError("Password must be at least 6 characters long.")
    print("incoming token:", token, type(token))
    print("db token:", user.password_reset_token, type(user.password_reset_token))
    print("expires:", user.password_reset_expires_at, "now:", datetime.now(timezone.utc))
    if user is None:
        return False
    if user.password_reset_token !=   token:
        return False
    if user.password_reset_token is None:
        return False
    if user.password_reset_expires_at is None:
        return False
    
    now = datetime.now(timezone.utc)
    
    if now > user.password_reset_expires_at:
        return False
    
    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    user.password_hash = hashed_password.decode('utf-8')
    user.password_reset_token = None
    user.password_reset_expires_at = None
    user.password_reset_sent_at = None
    db.commit()
    db.refresh(user)
    return True 

#Create access token. Data is a dict with email, user_id and a expiration date.
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

#Login user and return access token based on email and password
def  login_credentials_user(db, email: str, password: str):
    user = get_user_by_email(db, email)

    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    dictionary: dict
    dictionary = {"email": user.email,"user_id": str(user.user_id)}
    token = create_access_token(dictionary)   
    
    return {"access_token": token,"token_type": "bearer"}

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_refresh_session(db: Session, user_id, raw_refresh_token: str, expires_at: datetime):
    row = RefreshToken(
        user_id=user_id,
        token_hash=hash_token(raw_refresh_token),
        expires_at=expires_at,
        revoked=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
