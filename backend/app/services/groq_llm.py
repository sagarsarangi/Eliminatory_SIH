import os
import logging
from groq import Groq
from app.core.schemas import JointPrediction

logger = logging.getLogger(__name__)

# Model to use — checked against live Groq model list
GROQ_MODEL = "qwen/qwen3.8-27b"

# Initialize Groq client
try:
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
except Exception as e:
    logger.error(f"Failed to initialize Groq client: {e}")
    groq_client = None


def generate_explanation(
    cow_id: str,
    joint_pred,          # supports both JointPrediction and duck-typed objects
    sensor_data: dict,
    rf_features: list,
    rf_prob: float,
    cnn_result: dict = None,
    region_info: str = "no elevated activity nearby",
) -> str:
    """Generate a plain-language mastitis risk explanation via Groq."""

    if not groq_client:
        logger.warning("Groq client not initialised — using fallback explanation.")
        return _fallback_explanation(cow_id, joint_pred.risk_tier, rf_features, sensor_data)

    # joint_score is 0-1 float; format as percentage for the prompt
    score_pct = joint_pred.joint_score * 100 if joint_pred.joint_score <= 1 else joint_pred.joint_score

    rf_features_str = ", ".join(rf_features) if rf_features else "elevated conductivity and abnormal pH"
    cnn_str = (
        f"{'Mastitis Detected' if cnn_result.get('detected') else 'Not Detected'} "
        f"({cnn_result.get('confidence', 0) * 100:.1f}% confidence)"
        if cnn_result else "not provided"
    )

    system_prompt = (
        "You are a dairy herd health assistant explaining a mastitis risk alert to a farmer. "
        "Write 3-4 clear, plain-language sentences. No bullet points, no numbering, no jargon. "
        "Cover: (1) what the data shows, (2) why it's concerning, (3) what to do immediately, (4) what signs to watch for next."
    )

    user_prompt = f"""\
Cow: {cow_id}
Risk level: {joint_pred.risk_tier} ({score_pct:.1f}% joint score)
Sensor readings: EC {sensor_data.get('ec')} mS/cm, pH {sensor_data.get('ph')}, milk temp {sensor_data.get('milk_temp')}°C, rumination {sensor_data.get('rumination_rate')}/min
Random Forest probability: {rf_prob * 100:.1f}% — top drivers: {rf_features_str}
Teat image result: {cnn_str}
Regional context: {region_info}

Write the farmer alert now (3-4 sentences, plain English)."""

    try:
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=220,
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq API error ({GROQ_MODEL}): {e}")
        return _fallback_explanation(cow_id, joint_pred.risk_tier, rf_features, sensor_data)


def _fallback_explanation(cow_id: str, tier: str, features: list, sensor_data: dict = None) -> str:
    """Human-readable fallback when Groq is unavailable."""
    ec  = sensor_data.get("ec")  if sensor_data else None
    ph  = sensor_data.get("ph")  if sensor_data else None
    tmp = sensor_data.get("milk_temp") if sensor_data else None

    readings = []
    if ec  is not None: readings.append(f"EC {ec} mS/cm")
    if ph  is not None: readings.append(f"pH {ph}")
    if tmp is not None: readings.append(f"temp {tmp}°C")
    reading_str = ", ".join(readings) if readings else "abnormal sensor values"

    feature_str = ", ".join(features) if features else reading_str

    if tier == "High":
        return (
            f"Cow {cow_id} has been flagged at High Risk — {feature_str} are outside normal range. "
            "Please contact a veterinarian immediately for a clinical examination."
        )
    if tier == "Moderate":
        return (
            f"Cow {cow_id} shows Moderate Risk — {feature_str} suggest early-stage concern. "
            "Increase monitoring frequency, check teat hygiene, and isolate if milking yield drops."
        )
    return (
        f"Cow {cow_id} shows Low Risk — {feature_str} have minor deviations. "
        "Continue regular monitoring and maintain standard udder hygiene protocols."
    )
