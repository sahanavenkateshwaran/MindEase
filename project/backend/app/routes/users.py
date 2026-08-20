from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.auth import get_current_user
from app.database import get_collection
from app.models.user import UserUpdate

router = APIRouter(prefix="/users", tags=["User Preferences"])

@router.put("/profile")
async def update_profile(
    profile_update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    update_data = {k: v for k, v in profile_update.model_dump().items() if v is not None}
    
    if not update_data:
        return {"message": "No changes requested"}
        
    users_coll = get_collection("users")
    await users_coll.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    
    return {"message": "Profile updated successfully", "updated_fields": list(update_data.keys())}

@router.delete("/me")
async def delete_my_account(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    users_coll = get_collection("users")
    
    # Delete User Document
    await users_coll.delete_one({"_id": ObjectId(user_id)})
    
    # Delete associated mental health records
    collections_to_clean = [
        "chats", "journals", "emotion_history", "voice_history", 
        "video_history", "behavior_history", "mood_history", 
        "meditation_history", "exercise_history", "recommendations"
    ]
    for col_name in collections_to_clean:
        coll = get_collection(col_name)
        await coll.delete_many({"user_id": user_id})
        
    return {"message": "Your profile and all mental health records have been permanently deleted."}
