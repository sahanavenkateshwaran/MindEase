from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Dict, Any
from bson import ObjectId
from app.auth import get_current_admin
from app.database import get_collection

router = APIRouter(prefix="/admin", tags=["Admin Control Panel"])

@router.get("/users")
async def get_users_list(current_admin: dict = Depends(get_current_admin)):
    users_coll = get_collection("users")
    cursor = users_coll.find({})
    users = []
    async for user in cursor:
        users.append({
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role", "user"),
            "age": user["age"],
            "gender": user["gender"]
        })
    return users

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    users_coll = get_collection("users")
    res = await users_coll.delete_one({"_id": ObjectId(user_id)})
    
    # Delete sub-history files
    collections_to_clean = [
        "chats", "journals", "emotion_history", "voice_history", 
        "video_history", "behavior_history", "mood_history", 
        "meditation_history", "exercise_history", "recommendations"
    ]
    for col_name in collections_to_clean:
        coll = get_collection(col_name)
        await coll.delete_many({"user_id": user_id})
        
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"message": "User and all associated mental health records deleted successfully."}

@router.get("/analytics")
async def get_platform_analytics(current_admin: dict = Depends(get_current_admin)):
    users_coll = get_collection("users")
    emotions_coll = get_collection("emotion_history")
    journals_coll = get_collection("journals")
    
    # Counts
    total_users = await users_coll.count_documents({})
    total_logs = await emotions_coll.count_documents({})
    total_journals = await journals_coll.count_documents({})
    
    # Aggregated Emotions
    pipeline = [
        {"$group": {"_id": "$emotion", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    emotion_distribution = {}
    cursor = emotions_coll.aggregate(pipeline)
    async for item in cursor:
        emotion_distribution[item["_id"]] = item["count"]
        
    # Source distributions
    source_pipeline = [
        {"$group": {"_id": "$source", "count": {"$sum": 1}}}
    ]
    source_distribution = {}
    scursor = emotions_coll.aggregate(source_pipeline)
    async for item in scursor:
        source_distribution[item["_id"]] = item["count"]
        
    return {
        "total_users": total_users,
        "total_emotion_logs": total_logs,
        "total_journals": total_journals,
        "emotion_distribution": emotion_distribution,
        "source_distribution": source_distribution
    }

@router.get("/content/videos")
async def get_wellness_videos(current_admin: dict = Depends(get_current_admin)):
    video_coll = get_collection("videos")
    cursor = video_coll.find({})
    videos = []
    async for v in cursor:
        v["_id"] = str(v["_id"])
        videos.append(v)
    return videos

@router.post("/content/videos")
async def add_wellness_video(
    video_data: Dict[str, str] = Body(...),
    current_admin: dict = Depends(get_current_admin)
):
    video_coll = get_collection("videos")
    new_video = {
        "title": video_data.get("title"),
        "url": video_data.get("url"),
        "category": video_data.get("category", "General"),
        "emotion": video_data.get("emotion", "Stress")
    }
    res = await video_coll.insert_one(new_video)
    return {"message": "Video added successfully", "id": str(res.inserted_id)}
