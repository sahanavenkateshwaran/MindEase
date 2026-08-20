import asyncio
import app.database as database
from app.auth import create_access_token, get_current_user
from app.routes.dashboard import get_dashboard_summary

async def main():
    await database.connect_to_mongo()
    token = create_access_token({'sub':'debuguser@example.com'})
    current_user = await get_current_user(token)
    print(current_user)
    result = await get_dashboard_summary(current_user)
    print(result)

asyncio.run(main())
