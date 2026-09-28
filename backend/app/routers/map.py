from fastapi import APIRouter, HTTPException
from app.services.geohash import get_hotspot_geojson

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/hotspots")
async def hotspots():
    try:
        return get_hotspot_geojson()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/farms")
async def map_farms():
    from app.services.supabase import get_client
    try:
        client = get_client()
        # Fetch farms and related cows & joint predictions
        res = client.table("farms").select("*").execute()
        if not res.data:
            return []
            
        cows_res = client.table("cows").select("id, farm_id").execute()
        cows = cows_res.data or []
        cow_to_farm = {c["id"]: c["farm_id"] for c in cows}
        
        preds_res = client.table("joint_predictions").select("cow_id, risk_tier, joint_score").order("created_at", desc=True).execute()
        preds = preds_res.data or []
        
        latest_preds = {}
        for p in preds:
            if p["cow_id"] not in latest_preds:
                latest_preds[p["cow_id"]] = p
                
        farms_data = []
        for farm in res.data:
            farm_cows = [c_id for c_id, f_id in cow_to_farm.items() if f_id == farm["id"]]
            
            high_risk_count = 0
            max_score = 0
            farm_risk = "No Risk"
            
            for c_id in farm_cows:
                pred = latest_preds.get(c_id)
                if pred:
                    if pred["joint_score"] > max_score:
                        max_score = pred["joint_score"]
                        farm_risk = pred["risk_tier"]
                    if pred["risk_tier"] in ["High", "Moderate"]:
                        high_risk_count += 1
                        
            farms_data.append({
                "id": farm["id"],
                "name": farm.get("name", "Unknown Farm"),
                "lat": farm.get("lat", 0),
                "lng": farm.get("lng", 0),
                "geohash": farm.get("geohash", ""),
                "risk": farm_risk,
                "joint_score": max_score,
                "cows": len(farm_cows),
                "high_risk_count": high_risk_count
            })
            
        return farms_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
