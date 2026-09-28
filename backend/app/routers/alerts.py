from fastapi import APIRouter
from app.services.supabase import get_recent_alerts
from app.services.sms import send_sms
from pydantic import BaseModel

router = APIRouter(tags=["alerts"])

class SMSTestPayload(BaseModel):
    phone_number: str
    message: str

@router.get("/alerts/recent")
async def get_alerts(limit: int = 20):
    return get_recent_alerts(limit)

@router.post("/sms/test")
async def test_sms(payload: SMSTestPayload):
    success = await send_sms(payload.phone_number, payload.message)
    return {"success": success, "message": "SMS sent successfully" if success else "Failed to send SMS"}
