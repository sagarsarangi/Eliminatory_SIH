import os
from dotenv import load_dotenv

load_dotenv(r"c:\Users\saran\Desktop\sih\.env")

from app.services.supabase import get_client

def verify():
    client = get_client()
    if not client:
        print("Failed to initialize Supabase client.")
        return

    try:
        farms = client.table("farms").select("id", count="exact").execute()
        print(f"Farms count: {farms.count}")
    except Exception as e:
        print(f"Farms error: {e}")

    try:
        cows = client.table("cows").select("id", count="exact").execute()
        print(f"Cows count: {cows.count}")
    except Exception as e:
        print(f"Cows error: {e}")

    try:
        jp = client.table("joint_predictions").select("id", count="exact").execute()
        print(f"Joint predictions count: {jp.count}")
    except Exception as e:
        print(f"Joint predictions error: {e}")

    try:
        geo = client.table("geohash_stats").select("geohash", count="exact").execute()
        print(f"Geohash stats count: {geo.count}")
    except Exception as e:
        print(f"Geohash error: {e}")

if __name__ == "__main__":
    verify()
