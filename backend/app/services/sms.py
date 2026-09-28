import os
import httpx
import logging

logger = logging.getLogger(__name__)

TEXTBEE_API_KEY = os.environ.get("TEXTBEE_API_KEY")
TEXTBEE_DEVICE_ID = os.environ.get("TEXTBEE_DEVICE_ID")

async def send_sms(phone_number: str, message: str) -> bool:
    """
    Send an SMS using the TextBee API.
    """
    if not TEXTBEE_API_KEY or not TEXTBEE_DEVICE_ID:
        logger.warning("TextBee configuration missing. Skipping SMS.")
        return False
        
    url = "https://api.textbee.dev/api/v1/gateway/send-sms"
    headers = {
        "x-api-key": TEXTBEE_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "deviceId": TEXTBEE_DEVICE_ID,
        "recipients": [phone_number],
        "message": message
    }
    
    try:
        with open("sms_debug.log", "a", encoding="utf-8") as f:
            f.write(f"send_sms called for {phone_number} with message: {message}\n")
            f.write(f"API_KEY present: {bool(TEXTBEE_API_KEY)}, DEVICE_ID present: {bool(TEXTBEE_DEVICE_ID)}\n")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=10.0)
            
            with open("sms_debug.log", "a", encoding="utf-8") as f:
                f.write(f"Response status: {response.status_code}, body: {response.text}\n")
                
            response.raise_for_status()
            logger.info(f"SMS sent successfully to {phone_number}")
            return True
    except Exception as e:
        with open("sms_debug.log", "a", encoding="utf-8") as f:
            f.write(f"Exception in send_sms: {e}\n")
        logger.error(f"Failed to send SMS to {phone_number}: {e}")
        return False

