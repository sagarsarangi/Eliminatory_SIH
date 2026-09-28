import logging
import asyncio
from app.services.groq_llm import generate_explanation
from app.services.sms import send_sms
from app.services.supabase import get_farm_for_cow, insert_alert
from app.core.schemas import JointPrediction, TabularInput

logger = logging.getLogger(__name__)

async def process_alert(
    cow_id: str,
    joint_pred: JointPrediction,
    sensor_data: dict,
    rf_features: list,
    rf_prob: float,
    cnn_result: dict = None,
    anomaly_severity: float = 0.0
):
    """
    Background task to generate an explanation via Groq, insert the alert into Supabase,
    and send an SMS if the risk tier is High.
    """
    try:
        # Get farm details to find farmer phone number
        farm = get_farm_for_cow(cow_id)
        farmer_phone = farm.get("farmer_phone") if farm else None

        # Determine region info
        region_info = "no elevated activity nearby"
        if anomaly_severity > 0.5:
            region_info = "elevated regional mastitis outbreak detected"

        # Generate explanation using Groq
        message = generate_explanation(
            cow_id=cow_id,
            joint_pred=joint_pred,
            sensor_data=sensor_data,
            rf_features=rf_features,
            rf_prob=rf_prob,
            cnn_result=cnn_result,
            region_info=region_info
        )

        sms_sent = False
        # Send SMS if risk is High and we have a phone number
        if joint_pred.risk_tier == "High" and farmer_phone:
            sms_sent = await send_sms(farmer_phone, message)

        # Insert alert record into Supabase
        alert_record = {
            "cow_id": cow_id,
            "risk_tier": joint_pred.risk_tier,
            "joint_score": joint_pred.joint_score,
            "message": message,
            "sms_sent": sms_sent
        }
        insert_alert(alert_record)
        logger.info(f"Alert processed and stored for cow {cow_id}")

    except Exception as e:
        logger.error(f"Error processing alert for cow {cow_id}: {e}")
