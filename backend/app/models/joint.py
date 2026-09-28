from typing import Optional, Dict, Any


def get_risk_tier(score: float) -> str:
    """
    Determine the risk tier based on the joint score.
    - < 0.20 -> "No Risk"
    - 0.20 - 0.45 -> "Low"
    - 0.45 - 0.70 -> "Moderate"
    - >= 0.70 -> "High"
    """
    if score < 0.20:
        return "No Risk"
    elif score < 0.45:
        return "Low"
    elif score < 0.70:
        return "Moderate"
    else:
        return "High"


def compute_joint_score(
    rf_probability: float,
    cnn_score: Optional[float] = None,
    anomaly_severity: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Compute the joint mastitis risk score.
    Formula: joint_score = 0.70 * rf + 0.20 * cnn + 0.10 * anomaly
    Weights are redistributed if components are missing.
    """
    base_w_rf = 0.70
    base_w_cnn = 0.20
    base_w_anomaly = 0.10

    if cnn_score is None and anomaly_severity is None:
        w_rf = 1.0
        w_cnn = 0.0
        w_anomaly = 0.0
    elif cnn_score is None:
        total = base_w_rf + base_w_anomaly
        w_rf = base_w_rf / total
        w_cnn = 0.0
        w_anomaly = base_w_anomaly / total
    elif anomaly_severity is None:
        total = base_w_rf + base_w_cnn
        w_rf = base_w_rf / total
        w_cnn = base_w_cnn / total
        w_anomaly = 0.0
    else:
        w_rf = base_w_rf
        w_cnn = base_w_cnn
        w_anomaly = base_w_anomaly

    score = w_rf * rf_probability
    if cnn_score is not None:
        score += w_cnn * cnn_score
    if anomaly_severity is not None:
        score += w_anomaly * anomaly_severity

    score = round(score, 4)

    return {
        "joint_score": score,
        "risk_tier": get_risk_tier(score),
        "rf_probability": rf_probability,
        "cnn_score": cnn_score,
        "anomaly_severity": anomaly_severity,
        "rf_weight": round(w_rf, 4),
        "cnn_weight": round(w_cnn, 4),
        "anomaly_weight": round(w_anomaly, 4),
    }
