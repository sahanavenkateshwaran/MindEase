from datetime import timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from app.database import get_collection
from app.models.user import UserCreate, UserLogin, UserResponse, ForgotPassword
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.config import settings


def build_demo_user(email: str, password: str) -> dict:
    return {
        "name": "Demo User",
        "email": email.lower(),
        "age": 30,
        "gender": "Other",
        "emergency_contact": "Support Line - 988",
        "preferred_language": "English",
        "music_preference": "Piano",
        "video_preference": "Nature",
        "dark_mode": True,
        "role": "user",
        "password": get_password_hash(password),
    }

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    users_collection = get_collection("users")
    
    # Check if email exists
    existing_user = await users_collection.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    # Auto-assign roles for testing convenience
    role = "user"
    email_lower = user_data.email.lower()
    if email_lower.startswith("therapist") or "therapist" in email_lower:
        role = "therapist"
    elif email_lower.startswith("admin") or "admin" in email_lower:
        role = "admin"
    else:
        role = user_data.role

    hashed_password = get_password_hash(user_data.password)
    
    new_user = {
        "name": user_data.name,
        "email": email_lower,
        "age": user_data.age,
        "gender": user_data.gender,
        "emergency_contact": user_data.emergency_contact,
        "preferred_language": user_data.preferred_language,
        "music_preference": user_data.music_preference,
        "video_preference": user_data.video_preference,
        "dark_mode": user_data.dark_mode,
        "role": role,
        "password": hashed_password
    }
    
    result = await users_collection.insert_one(new_user)
    
    # Create Access Token
    access_token = create_access_token(data={"sub": new_user["email"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(result.inserted_id),
            "name": new_user["name"],
            "email": new_user["email"],
            "role": new_user["role"]
        }
    }

@router.post("/login")
async def login(credentials: UserLogin):
    users_collection = get_collection("users")
    email = credentials.email.lower()
    user = await users_collection.find_one({"email": email})

    if not user:
        if email == "user@example.com" and credentials.password == "password123":
            user = build_demo_user(email, credentials.password)
            result = await users_collection.insert_one(user)
            user["_id"] = result.inserted_id
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user["email"]})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role", "user")
        }
    }

@router.post("/forgot-password")
async def forgot_password(data: ForgotPassword):
    # Mock system sending recovery link
    users_collection = get_collection("users")
    user = await users_collection.find_one({"email": data.email.lower()})
    if not user:
        # Prevent email enumeration: return success even if email not registered
        pass
    return {"message": "If the email exists, a password reset link has been sent."}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["_id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "age": current_user["age"],
        "gender": current_user["gender"],
        "emergency_contact": current_user["emergency_contact"],
        "preferred_language": current_user["preferred_language"],
        "music_preference": current_user["music_preference"],
        "video_preference": current_user["video_preference"],
        "dark_mode": current_user["dark_mode"],
        "role": current_user.get("role", "user")
    }
