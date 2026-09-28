"""
Seed script to insert demo data into Supabase for MooSense Phase 2.
Run this script: python backend/seed_demo_data.py
"""
import asyncio
import random
from datetime import datetime, timedelta
import uuid

# Set up env so config loads
import os
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent))

from app.core.config import settings
from app.services.supabase import get_client

# Hardcoded demo farms with distinct geohashes (precision 5)
FARMS = [
    {"name": "Green Pastures", "lat": 22.8046, "lng": 86.2029, "region": "Jharkhand East", "phone": "+919999999999"},
    {"name": "Sunrise Dairy", "lat": 22.8123, "lng": 86.2215, "region": "Jharkhand East", "phone": "+918888888888"},
    # This will be our outbreak zone
    {"name": "Valley Farms", "lat": 23.3441, "lng": 85.3096, "region": "Ranchi District", "phone": "+917777777777"},
    {"name": "Highland Cattle Co", "lat": 23.3512, "lng": 85.3188, "region": "Ranchi District", "phone": "+916666666666"},
]

def generate_sensor_data(is_sick=False):
    if is_sick:
        return {
            "ec": round(random.uniform(6.5, 7.5), 2),  # Elevated EC
            "ph": round(random.uniform(6.8, 7.2), 2),  # Shifted pH
            "milk_temp": round(random.uniform(39.0, 40.5), 1),  # Fever
            "scc": random.randint(400000, 800000),  # High SCC
            "yield_l": round(random.uniform(8.0, 12.0), 1),  # Lower yield
            "clotting": random.choice(["slight", "clots"]),
            "rumination_rate": random.randint(25, 35)  # Depressed rumination
        }
    else:
        return {
            "ec": round(random.uniform(4.5, 5.5), 2),  # Normal EC
            "ph": round(random.uniform(6.5, 6.8), 2),  # Normal pH
            "milk_temp": round(random.uniform(37.5, 38.5), 1),  # Normal temp
            "scc": random.randint(50000, 200000),  # Normal SCC
            "yield_l": round(random.uniform(15.0, 22.0), 1),  # Normal yield
            "clotting": "none",
            "rumination_rate": random.randint(40, 55)  # Normal rumination
        }

async def seed():
    client = get_client()
    if not client:
        print("Supabase client not configured. Cannot run seed script.")
        print("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
        return

    print("Starting data seed...")
    
    # 1. Create Farms
    farm_ids = []
    import pygeohash as geohash
    for farm_data in FARMS:
        gh = geohash.encode(farm_data["lat"], farm_data["lng"], precision=5)
        farm_insert = {
            "id": str(uuid.uuid4()),
            "name": farm_data["name"],
            "lat": farm_data["lat"],
            "lng": farm_data["lng"],
            "geohash": gh,
            "region": farm_data["region"],
            "farmer_phone": farm_data["phone"]
        }
        res = client.table("farms").insert(farm_insert).execute()
        farm_ids.append((farm_insert["id"], gh, "Ranchi" in farm_data["region"]))
        print(f"Created Farm: {farm_data['name']} in geohash {gh}")

    # 2. Create Cows and Predictions
    # Outbreak zone (Ranchi) gets more sick cows
    for i, (farm_id, gh, is_outbreak_zone) in enumerate(farm_ids):
        num_cows = random.randint(5, 8)
        
        for j in range(num_cows):
            cow_id = f"COW_{i+1:02d}{j+1:02d}"
            is_sick = is_outbreak_zone and random.random() < 0.6  # 60% sick in outbreak zone, 0% elsewhere
            
            cow_insert = {
                "id": cow_id,
                "farm_id": farm_id,
                "breed": "Holstein",
                "age": random.randint(2, 6)
            }
            client.table("cows").insert(cow_insert).execute()
            
            # Create a sensor reading
            reading = generate_sensor_data(is_sick)
            reading["cow_id"] = cow_id
            reading["gps_lat"] = FARMS[i]["lat"] + random.uniform(-0.001, 0.001)
            reading["gps_lng"] = FARMS[i]["lng"] + random.uniform(-0.001, 0.001)
            
            read_res = client.table("sensor_readings").insert(reading).execute()
            reading_id = read_res.data[0]["id"]
            
            # Tabular Prediction
            rf_prob = random.uniform(0.75, 0.95) if is_sick else random.uniform(0.05, 0.35)
            client.table("tabular_predictions").insert({
                "cow_id": cow_id,
                "reading_id": reading_id,
                "rf_probability": rf_prob,
                "rf_label": 1 if rf_prob > 0.5 else 0
            }).execute()
            
            # Joint Prediction
            joint_score = rf_prob * 0.8 + (random.uniform(0, 0.2))  # Rough estimate for seed
            tier = "High" if joint_score > 0.7 else "Moderate" if joint_score > 0.45 else "Low" if joint_score > 0.2 else "No Risk"
            
            client.table("joint_predictions").insert({
                "cow_id": cow_id,
                "geohash": gh,
                "rf_probability": rf_prob,
                "joint_score": joint_score,
                "risk_tier": tier,
                "cnn_score": random.uniform(0.1, 0.9) if random.random() > 0.5 else None,
                "created_at": (datetime.now() - timedelta(minutes=random.randint(10, 1000))).isoformat()
            }).execute()
            
            print(f"  Created Cow: {cow_id} (Sick: {is_sick}, Tier: {tier})")

    # 3. Trigger geohash recalculation
    from app.services.geohash import recompute_geohash_stats
    print("Recomputing regional anomaly stats...")
    recompute_geohash_stats()
    
    print("Seed complete! You can now view the dashboard with populated data.")

if __name__ == "__main__":
    asyncio.run(seed())
