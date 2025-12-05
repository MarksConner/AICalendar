from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from fastapi.security import OAuth2PasswordBearer
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.services.user_service import get_user_by_email
from app.services.user_service import SECRET_KEY, ALGORITHM

#Create auth token on login, We dont use this yet but it's here for better security later on
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

#Mail Settings to send verification emails
BASE_DIR = Path(__file__).resolve().parent
class Settings(BaseSettings):
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    USER_CREDENTIALS: bool = True
    VALIDATE_CERTS: bool = True
    TEMPLATE_FOLDER: Path = Path(BASE_DIR, 'templates')
    model_config = SettingsConfigDict(env_file =".env",extra="ignore")
Config = Settings()

#Current User
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db),):
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_user_by_email(db, email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user