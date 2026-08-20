from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, get_collection
from app.routes import auth, users, chat, journal, voice, video, dashboard, therapist, admin

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn.error")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    await connect_to_mongo()
    
    # Pre-seed default video library and emergency contacts
    try:
        videos_coll = get_collection("videos")
        v_count = await videos_coll.count_documents({})
        if v_count == 0:
            logger.info("Pre-seeding default wellness videos...")
            from app.services.recommendation_engine import recommendation_engine
            # Seed Stress and Sadness categories
            all_vids = []
            for em in ["Stress", "Sad", "Angry", "Happy"]:
                for v in recommendation_engine.get_relaxation_videos(em):
                    all_vids.append({
                        "title": v["title"],
                        "url": v["url"],
                        "category": v["category"],
                        "emotion": em
                    })
            await videos_coll.insert_many(all_vids)
            logger.info(f"Successfully seeded {len(all_vids)} videos.")

        contacts_coll = get_collection("emergency_contacts")
        c_count = await contacts_coll.count_documents({})
        if c_count == 0:
            logger.info("Pre-seeding emergency support hotlines...")
            default_contacts = [
                {"name": "National Suicide Prevention Lifeline", "number": "988 (Call or Text)", "description": "Free, confidential 24/7 support for suicide distress", "country": "US/National"},
                {"name": "Crisis Text Line", "number": "Text HOME to 741741", "description": "Free 24/7 text support with trained crisis counselors", "country": "Global"},
                {"name": "The Trevor Project (LGBTQ+)", "number": "1-866-488-7386", "description": "Crisis intervention and suicide prevention for LGBTQ youth", "country": "US"},
                {"name": "Vandrevala Foundation for Mental Health", "number": "+91 9999 666 555", "description": "24/7 mental wellness crisis helpline", "country": "India"},
                {"name": "AASRA Helpline", "number": "+91-9820466726", "description": "Suicide prevention helpline in India", "country": "India"}
            ]
            await contacts_coll.insert_many(default_contacts)
            logger.info("Seeded emergency contacts.")
    except Exception as ex:
        logger.error(f"Startup data seeding warning: {ex}")
        
    yield
    # Shutdown actions
    await close_mongo_connection()

app = FastAPI(
    title="Mental Health AI Platform API",
    description="Backend services for AI-powered emotion detection, behavior analysis, and wellness recommendations.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(journal.router, prefix="/api")
app.include_router(voice.router, prefix="/api")
app.include_router(video.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(therapist.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Mental Health AI Platform Backend"}

@app.get("/api/emergency-contacts")
async def get_emergency_contacts():
    """
    Public endpoint to retrieve emergency support helplines.
    """
    contacts_coll = get_collection("emergency_contacts")
    cursor = contacts_coll.find({})
    contacts = []
    async for c in cursor:
        contacts.append({
            "name": c["name"],
            "number": c["number"],
            "description": c["description"],
            "country": c.get("country", "National")
        })
    # If DB isn't connected or empty, provide fallback
    if not contacts:
        return [
            {"name": "National Suicide Prevention Lifeline", "number": "988 (Call or Text)", "description": "Free, confidential 24/7 support", "country": "US"},
            {"name": "Crisis Text Line", "number": "Text HOME to 741741", "description": "Free 24/7 text support", "country": "Global"}
        ]
    return contacts

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
