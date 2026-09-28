import asyncio
import httpx
import random
import time

API_URL = "http://localhost:8000/api/ingest/sensor"

async def simulate_esp32_stream():
    print("Starting ESP32 simulation stream to", API_URL)
    cow_id = "COW_DEMO"
    lat = 23.3441
    lng = 85.3096

    # Normal reading
    payload = {
        "cow_id": cow_id,
        "milk_conductivity_mScm": 5.2,
        "milk_ph": 6.7,
        "milk_temp_c": 38.0,
        "scc": 100000,
        "yield_l": 15.0,
        "clotting": "none",
        "rumination_rate_per_min": 45,
        "gps": {"lat": lat, "lng": lng}
    }
    
    async with httpx.AsyncClient() as client:
        print(f"Sending NORMAL reading for {cow_id}...")
        resp = await client.post(API_URL, json=payload)
        print("Response:", resp.json())
        await asyncio.sleep(3)

        # Deteriorating
        payload["milk_conductivity_mScm"] = 6.0
        payload["milk_ph"] = 6.5
        payload["scc"] = 300000
        payload["rumination_rate_per_min"] = 38
        
        print(f"\nSending DETERIORATING reading for {cow_id}...")
        resp = await client.post(API_URL, json=payload)
        print("Response:", resp.json())
        await asyncio.sleep(3)

        # High Risk
        payload["milk_conductivity_mScm"] = 7.5
        payload["milk_ph"] = 6.1
        payload["milk_temp_c"] = 39.5
        payload["scc"] = 800000
        payload["yield_l"] = 8.5
        payload["clotting"] = "slight"
        payload["rumination_rate_per_min"] = 28
        
        print(f"\nSending HIGH RISK reading for {cow_id}...")
        resp = await client.post(API_URL, json=payload)
        print("Response:", resp.json())
        print("\nDemo stream complete! Check Dashboard and SMS.")

if __name__ == "__main__":
    asyncio.run(simulate_esp32_stream())
