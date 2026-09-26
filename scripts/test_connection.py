import asyncio
import os
import sys

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def test_mongo():
    print("=" * 60)
    print(" [*] Testing IntelliTicket MongoDB Connection ")
    print("=" * 60)
    print(f"Target URI: {settings.MONGODB_URI}")
    print(f"Database:   {settings.MONGODB_DB_NAME}")
    print("-" * 60)

    try:
        client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=4000)
        res = await client.admin.command('ping')
        print("[+] SUCCESS: Connected to MongoDB successfully!")
        print(f"Server Ping Response: {res}")
        
        db = client[settings.MONGODB_DB_NAME]
        collections = await db.list_collection_names()
        print(f"Active Collections: {collections}")
        
        if "tickets" in collections:
            count = await db.tickets.count_documents({})
            print(f"Total Tickets in DB: {count}")
        else:
            print("Notice: 'tickets' collection not found yet. Run 'python scripts/seed_data.py' to populate.")
            
        client.close()
    except Exception as e:
        print(f"[-] ERROR: Could not connect to MongoDB.")
        print(f"Details: {e}")
        print("\nTroubleshooting tips:")
        print("1. Start MongoDB Service: Open PowerShell as Admin and run 'net start MongoDB'")
        print("2. Or launch mongod directly: 'C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe --dbpath C:\\data\\db'")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_mongo())
