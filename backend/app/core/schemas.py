from pydantic import BaseModel, Field
from typing import Optional


# --- Tabular Prediction ---
class TabularInput(BaseModel):
    ec: float = Field(..., description="Milk electrical conductivity (mS/cm)")
    ph: float = Field(..., description="Milk pH")
    milk_temp: float = Field(..., description="Milk temperature (Celsius)")
    scc: float = Field(..., description="Somatic Cell Count")
    yield_l: float = Field(..., description="Milk yield (liters)")
    clotting: str = Field(..., description="Clotting level: none, slight, or clots")
    rumination_rate: Optional[float] = Field(
        None, description="Rumination rate per minute (from gyroscope)"
    )
    known_label: Optional[int] = Field(
        None, description="Optional known 0/1 label for comparison"
    )


class TabularPrediction(BaseModel):
    rf_probability: float
    rf_label: int
    top_features: list[dict]
    risk_tier: str


# --- Image Prediction ---
class ImagePrediction(BaseModel):
    detected: bool
    confidence: float
    cnn_score: float  # confidence toward mastitis (used in joint score)


# --- Joint Score ---
class JointScoreInput(BaseModel):
    cow_id: str
    rf_probability: float
    cnn_score: Optional[float] = None
    anomaly_severity: Optional[float] = None


class JointPrediction(BaseModel):
    cow_id: str
    joint_score: float
    risk_tier: str
    rf_probability: float
    cnn_score: Optional[float]
    anomaly_severity: Optional[float]
    rf_weight: float
    cnn_weight: float
    anomaly_weight: float


# --- Sensor Ingest ---
class SensorReading(BaseModel):
    cow_id: str
    milk_conductivity_mScm: float
    milk_ph: float
    milk_temp_c: float
    rumination_rate_per_min: Optional[float] = None
    scc: Optional[float] = None
    yield_l: Optional[float] = None
    clotting: Optional[str] = "none"
    gps: Optional[dict] = None  # {"lat": ..., "lng": ...}
    timestamp: Optional[str] = None


# --- Cow Registration ---
class CowRegister(BaseModel):
    cow_id: str
    farm_name: str
    breed: Optional[str] = None
    age: Optional[int] = None
    lactation_number: Optional[int] = None
    disease_history: Optional[str] = None
    farmer_phone: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


# --- Explain ---
class ExplainRequest(BaseModel):
    cow_id: str
    joint_score: float
    risk_tier: str
    rf_probability: float
    top_features: list[dict]
    ec: Optional[float] = None
    ph: Optional[float] = None
    milk_temp: Optional[float] = None
    scc: Optional[float] = None
    yield_l: Optional[float] = None
    clotting: Optional[str] = None
    rumination_rate: Optional[float] = None
    cnn_result: Optional[str] = None
    cnn_confidence: Optional[float] = None
    region_severity: Optional[float] = None
    region_context: Optional[str] = None


class ExplainResponse(BaseModel):
    explanation: str
    is_fallback: bool = False
