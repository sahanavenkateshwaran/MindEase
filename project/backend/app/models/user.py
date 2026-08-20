from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Dict, Any

class UserBase(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    age: int = Field(..., ge=0, le=120)
    gender: str
    emergency_contact: str = Field(..., description="Emergency contact details")
    preferred_language: str = "English"
    music_preference: str = "Piano"
    video_preference: str = "Nature"
    dark_mode: bool = True
    role: str = "user" # user, therapist, admin

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("passwords do not match")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    emergency_contact: Optional[str] = None
    preferred_language: Optional[str] = None
    music_preference: Optional[str] = None
    video_preference: Optional[str] = None
    dark_mode: Optional[bool] = None

class UserResponse(UserBase):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True
        json_encoders = {
            # Let's ensure ObjectId is serializable if returned directly
            "ObjectId": str
        }
