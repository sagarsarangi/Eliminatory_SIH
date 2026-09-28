from fastapi import APIRouter
from app.services.groq_llm import generate_explanation
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

router = APIRouter(tags=["explain"])

class ExplainPayload(BaseModel):
    cow_id: str
    risk_tier: str
    joint_score: float
    sensor_data: Dict[str, Any]
    rf_features: List[str]
    rf_prob: float
    cnn_result: Optional[Dict[str, Any]] = None
    regional_severity: float = 0.0

class MockJointPrediction:
    def __init__(self, risk_tier, joint_score, regional_severity):
        self.risk_tier = risk_tier
        self.joint_score = joint_score
        self.regional_severity = regional_severity

@router.post("/explain")
async def explain_risk(payload: ExplainPayload):
    joint_pred = MockJointPrediction(
        risk_tier=payload.risk_tier,
        joint_score=payload.joint_score,
        regional_severity=payload.regional_severity
    )
    
    region_info = "no elevated activity nearby"
    if payload.regional_severity > 0.5:
        region_info = "elevated regional mastitis outbreak detected"
        
    explanation = generate_explanation(
        cow_id=payload.cow_id,
        joint_pred=joint_pred,
        sensor_data=payload.sensor_data,
        rf_features=payload.rf_features,
        rf_prob=payload.rf_prob,
        cnn_result=payload.cnn_result,
        region_info=region_info
    )
    
    return {"explanation": explanation}
