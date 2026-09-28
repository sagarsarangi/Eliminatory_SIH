from fastapi import APIRouter, HTTPException
from app.core.schemas import CowRegister
from app.services.supabase import insert_farm, insert_cow, get_cow_history, get_farm_by_name
import pygeohash as geohash

router = APIRouter(prefix="/cows", tags=["cows"])


@router.post("/register")
async def register(payload: CowRegister):
    try:
        farm = get_farm_by_name(payload.farm_name)
        
        if not farm:
            farm_data = {
                "name": payload.farm_name,
                "contact_phone": payload.farmer_phone,
                "latitude": payload.lat,
                "longitude": payload.lng
            }
            if payload.lat is not None and payload.lng is not None:
                farm_data["geohash"] = geohash.encode(payload.lat, payload.lng, precision=6)
            
            farm = insert_farm(farm_data)
        
        if not farm:
            raise Exception("Failed to register farm.")

        cow_data = {
            "id": payload.cow_id,
            "farm_id": farm.get("id"),
            "breed": payload.breed,
            "age": payload.age,
            "lactation_number": payload.lactation_number,
            "disease_history": payload.disease_history
        }

        cow = insert_cow(cow_data)
        if not cow:
            raise Exception("Failed to register cow.")
            
        return cow
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{cow_id}/history")
async def history(cow_id: str):
    try:
        return get_cow_history(cow_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def list_cows():
    from app.services.supabase import get_all_cows
    try:
        return get_all_cows()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
