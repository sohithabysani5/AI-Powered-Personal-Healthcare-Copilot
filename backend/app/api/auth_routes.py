"""Auth and User registration/login endpoints."""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, HealthProfile
from app.schemas.all_schemas import UserRegister, UserLogin, TokenResponse, UserResponse, UserUpdate, PasswordChange
from app.auth.security import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        preferred_language=user_in.preferred_language or "en",
        consent_external_ai=True,
        local_only_mode=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize associated HealthProfile
    profile = HealthProfile(user_id=user.id)
    db.add(profile)
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "preferred_language": user.preferred_language,
            "consent_external_ai": user.consent_external_ai,
            "local_only_mode": user.local_only_mode
        }
    }


@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive account."
        )

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "preferred_language": user.preferred_language,
            "consent_external_ai": user.consent_external_ai,
            "local_only_mode": user.local_only_mode
        }
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(user_update: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.preferred_language is not None:
        current_user.preferred_language = user_update.preferred_language
    if user_update.consent_external_ai is not None:
        current_user.consent_external_ai = user_update.consent_external_ai
    if user_update.local_only_mode is not None:
        current_user.local_only_mode = user_update.local_only_mode

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(pwd_in: PasswordChange, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(pwd_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    current_user.hashed_password = get_password_hash(pwd_in.new_password)
    db.commit()
    return {"message": "Password updated successfully."}


@router.delete("/me")
def delete_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return {"message": "Account and all associated health records deleted permanently."}
