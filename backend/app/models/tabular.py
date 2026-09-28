import joblib
import json
import numpy as np
from pathlib import Path

from app.core.config import settings
from app.core.schemas import TabularInput, TabularPrediction


def load_rf_model():
    """Load the trained Random Forest model and feature names."""
    model_path = Path(settings.ML_ARTIFACTS_DIR) / "rf_model.joblib"
    features_path = Path(settings.ML_ARTIFACTS_DIR) / "feature_names.json"

    model = joblib.load(str(model_path))
    with open(features_path, "r") as f:
        feature_names = json.load(f)

    return {"model": model, "feature_names": feature_names}


def _get_risk_tier(probability: float) -> str:
    """Map RF probability to risk tier."""
    if probability < 0.20:
        return "No Risk"
    elif probability < 0.45:
        return "Low"
    elif probability < 0.70:
        return "Moderate"
    else:
        return "High"


def _encode_clotting(value: str) -> int:
    """Encode clotting string to ordinal."""
    if isinstance(value, int) or str(value).isdigit():
        return int(value)
    mapping = {"none": 0, "slight": 1, "clots": 2}
    return mapping.get(str(value).lower(), 0)


def predict_rf(model_data: dict, input_data: TabularInput) -> TabularPrediction:
    """Run Random Forest prediction on tabular input."""
    model = model_data["model"]
    feature_names = model_data["feature_names"]

    # Build feature vector in the same order as training
    clotting_encoded = _encode_clotting(input_data.clotting)
    ec_ph_ratio = input_data.ec / input_data.ph if input_data.ph != 0 else 0
    scc_log = np.log1p(input_data.scc)

    feature_map = {
        "Milk_Temperature": input_data.milk_temp,
        "Milk_pH": input_data.ph,
        "Milk_Conductivity": input_data.ec,
        "Somatic_Cell_Count": input_data.scc,
        "Milk_Yield": input_data.yield_l,
        "Clotting": clotting_encoded,
        "EC_pH_ratio": ec_ph_ratio,
        "SCC_log": scc_log,
    }

    import pandas as pd
    features = pd.DataFrame([feature_map], columns=feature_names)

    # Predict
    probability = model.predict_proba(features)[0][
        1
    ]  # probability of class 1 (mastitis)
    label = int(model.predict(features)[0])

    # Feature importances
    importances = model.feature_importances_
    sorted_indices = np.argsort(importances)[::-1][:3]  # top 3
    top_features = [
        {
            "name": feature_names[i], 
            "value": round(float(feature_map[feature_names[i]]), 2),
            "importance": round(float(importances[i]), 4)
        }
        for i in sorted_indices
    ]

    risk_tier = _get_risk_tier(probability)

    return TabularPrediction(
        rf_probability=round(float(probability), 4),
        rf_label=label,
        top_features=top_features,
        risk_tier=risk_tier,
    )
