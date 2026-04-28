from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.api.base_model_classes import RefreshRequest, UserCreate, UserLogin,UserEmailVerify, UserResponse, UserUpdatePassword
from sqlalchemy.orm import Session
from app.models.users import Users
from app.db import SessionLocal
from app.services.user_service import (create_user,delete_user_by_email,verify_user_email,get_user_by_email,get_user_by_user_id, login_credentials,reset_password_token, create_reset_token, login_credentials_user, create_access_token)
from app.config import get_current_user
from datetime import datetime, timezone
from app.services.verify_email import mail, create_message
from app.security.jwt import check_refresh_token_expiration, create_refresh_token
import asyncio
import os

router = APIRouter(prefix="/users", tags=["users"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("")
def create_user_route(user: UserCreate, db: Session = Depends(get_db)):
    return create_user(db,user.email,user.username,user.first_name,user.last_name,user.password)

@router.get("/{user_id}/email")
def get_user_email(user: UUID, db: Session = Depends(get_db)):
    try:
        user.email = get_user_by_email(user.email,db) 

    except ValueError:
        raise HTTPException(status_code=404, detail="User not found")    
    return {"email": user.email}

@router.get("/verify_email")
def verify_email(token: UUID, db: Session = Depends(get_db)):
    verification_sent_at = datetime.now(timezone.utc)
    is_verified = verify_user_email(db, token)
    if not is_verified:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    return {"message": "Email verified"}

@router.post("/login")
def login_route(user: UserLogin, db: Session = Depends(get_db)):
    authenticated = login_credentials(db, user.email, user.password)
    if not authenticated:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    db_user = get_user_by_email(db, user.email)
    token = create_access_token({"sub": db_user.email, "user_id": str(db_user.user_id)})
    refresh_token = create_refresh_token({ "user_id": str(db_user.user_id)})
    
    return {"access_token": token, "refresh_token": refresh_token, "user_id": db_user.user_id, "token_type": "bearer"}

@router.post("/send_verification_email")
async def send_verification_email(user_data: UserEmailVerify,db: Session = Depends(get_db)):
    
    user = get_user_by_email(db, user_data.email)
    if not user:
        print("USER NOT FOUND", flush=True)
        raise HTTPException(status_code=404, detail="User not found")

    backend_url = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

    verify_link = (f"{backend_url}/users/verify_email"f"?token={user.email_verification_token}")

    message = create_message([user.email],"Verify Email",verify_link)

    try:
        await asyncio.wait_for(
            mail.send_message(message),
            timeout=15
        )
        return {"message": "Verification email sent"}

    except asyncio.TimeoutError:
        print("EMAIL SEND TIMEOUT", flush=True)
        raise HTTPException(
            status_code=504,
            detail="Email service timed out."
        )

    except Exception as e:
        print("EMAIL SEND ERROR:", repr(e), flush=True)
        raise HTTPException(
            status_code=500,
            detail=f"Email failed: {str(e)}"
        )
    

@router.post("/send_recover_password_email")
async def send_recover_password_email(user_data: UserEmailVerify,db: Session = Depends(get_db)):
    backend_url = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
    user = get_user_by_email(db, user_data.email)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    # Create reset token first
    create_reset_token(db, user.email)
    # Refresh user so password_reset_token is updated
    db.refresh(user)
    reset_link = (f"{backend_url}/users/update_password" f"?token={user.password_reset_token}")
    message = create_message([user.email],"Reset Password",reset_link)
    try:
        await asyncio.wait_for(
            mail.send_message(message),
            timeout=15
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Email service timed out.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")

    return {"message": "Recovery email was sent"}

@router.post("/update_password")
async def update_password(user_data: UserUpdatePassword, db: Session = Depends(get_db)):
    check =  reset_password_token(db,user_data.email, user_data.token, user_data.new_password)
    if not check:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    return {"message": "Password updated successfully"}
    
@router.get("/me")
def get_my_account(current_user: Users = Depends(get_current_user)):
    return {"user_id": str(current_user.user_id),"email": current_user.email}

@router.get("/by_id/{user_id}")
def get_user_by_id_route(user_id: UUID, db: Session = Depends(get_db)):
    user = get_user_by_user_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# users/refresh full path 
@router.post("/refresh")
def refresh_route(payload: RefreshRequest):
    try:
        decoded = check_refresh_token_expiration(payload.refresh_token)
        user_id = decoded["sub"]
        new_access_token = create_access_token(user_id)
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
        }
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")