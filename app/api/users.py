from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.api.base_model_classes import RefreshRequest, UserCreate, UserLogin,UserEmailVerify, UserResponse, UserUpdatePassword
from sqlalchemy.orm import Session
from app.models.users import Users
from app.db import SessionLocal
from app.services.user_service import (create_user,delete_user_by_email,verify_user_email,get_user_by_email,get_user_by_user_id, login_credentials,reset_password_token, create_reset_token, login_credentials_user, create_access_token)
from app.config import get_current_user
from datetime import datetime, timezone
from app.services.verify_email import send_email
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
    if user.password != user.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
    try:
        return create_user(db, user.email, user.username, user.first_name, user.last_name, user.password)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # Less than 6 characters is handled in the service layer, but we can also catch it here to avoid unnecessary DB calls
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


#Get username by user_id
@router.get("/{user_id}/username")
def get_user_name(user_id: UUID, db: Session = Depends(get_db)):
    try:
        user = get_user_by_user_id(db, user_id)
        if user is None:
            raise ValueError("User not found")
        return {"username": user.username}
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found")


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
    refresh_token = create_refresh_token(str(db_user.user_id))
    
    return {"access_token": token, "refresh_token": refresh_token, "user_id": db_user.user_id, "token_type": "bearer"}

@router.post("/send_verification_email")
async def send_verification_email(user_data: UserEmailVerify,db: Session = Depends(get_db)):
    
    user = get_user_by_email(db, user_data.email)
    if not user:
        print("USER NOT FOUND", flush=True)
        raise HTTPException(status_code=404, detail="User not found")

    backend_url = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

    verify_link = (f"{backend_url}/users/verify_email"f"?token={user.email_verification_token}")

    body = f"""
    <h2>Verify Email</h2>
    <p>Click the link below to verify your account:</p>
    <p><a href="{verify_link}">Verify Email</a></p>
    <p>{verify_link}</p>
    """

    try:
        send_email([user.email],"Verify Email",body)
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
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    user = get_user_by_email(db, user_data.email)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    # Create reset token first
    create_reset_token(db, user.email)
    # Refresh user so password_reset_token is updated
    db.refresh(user)
    reset_link = (f"{frontend_url}/update"f"?token={user.password_reset_token}"f"&email={user.email}")
    body = f"""
    <h2>Reset Password</h2>
    <p>Click the link below to reset your password:</p>
    <p><a href="{reset_link}">Reset Password</a></p>
    """

    try:
        send_email([user.email],"Reset Password",body)
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
def refresh_route(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        decoded = check_refresh_token_expiration(payload.refresh_token)
        token_subject = decoded["sub"]
        user_id = token_subject.get("user_id") if isinstance(token_subject, dict) else token_subject
        db_user = get_user_by_user_id(db, UUID(str(user_id)))
        if db_user is None:
            raise ValueError("USER_NOT_FOUND")

        new_access_token = create_access_token({
            "sub": db_user.email,
            "user_id": str(db_user.user_id),
        })
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
        }
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
