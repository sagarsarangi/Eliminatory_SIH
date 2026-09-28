from fastapi import APIRouter, HTTPException, BackgroundTasks, Form, File, UploadFile
from typing import Optional
import logging
import base64
from app.core.schemas import SensorReading, TabularInput, JointPrediction
from app.core.state import ml_models
import app.core.state as app_state
from app.models.tabular import predict_rf
from app.models.image import predict_cnn
from app.models.joint import compute_joint_score
from app.services.supabase import (
    insert_sensor_reading,
    insert_tabular_prediction,
    insert_joint_prediction,
    get_farm_for_cow,
    get_cow,
    insert_cow,
)
from app.services.geohash import (
    compute_geohash,
    compute_regional_anomaly,
    recompute_geohash_stats,
)
from app.services.sms import send_sms
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ingest"])


@router.get("/ingest/latest")
async def get_latest_sensor_reading():
    """
    Return the most recently ingested raw sensor payload (from hardware/ESP32/Wokwi).
    Frontend polls this every few seconds to auto-fill the submit form.
    Returns null when nothing new has arrived since last poll.
    """
    reading = app_state.latest_sensor_reading
    # Clear after delivery so the same reading isn't repeatedly auto-filled
    app_state.latest_sensor_reading = None
    return {"reading": reading}


@router.get("/ingest/latest-result")
async def get_latest_joint_result():
    """
    Return the most recent full joint prediction result (from any source — hardware POST,
    manual form submission, or direct API call). Includes CNN verdict if image was sent.
    Frontend polls this to display the result panel when data arrives from hardware.
    Cleared after delivery so the same result isn't shown twice.
    """
    result = app_state.latest_joint_result
    app_state.latest_joint_result = None
    return {"result": result}


@router.post("/ingest/sensor", response_model=JointPrediction)
async def ingest_sensor_data(
    background_tasks: BackgroundTasks,
    cow_id: str = Form(...),
    ec: float = Form(...),
    ph: float = Form(...),
    milk_temp: float = Form(...),
    rumination_rate: Optional[float] = Form(None),
    gps_lat: Optional[float] = Form(None),
    gps_lng: Optional[float] = Form(None),
    image: UploadFile = File(None)
):
    """
    Ingest sensor telemetry and optional image from ESP32/app, predict mastitis risk, and save to DB.
    Also stores the raw payload in state so the frontend form can be auto-filled via GET /api/ingest/latest.
    """

    logger.info("=" * 60)
    logger.info("INGEST /api/ingest/sensor — request received")
    logger.info(f"  cow_id        : {cow_id}")
    logger.info(f"  ec            : {ec}")
    logger.info(f"  ph            : {ph}")
    logger.info(f"  milk_temp     : {milk_temp}")
    logger.info(f"  rumination    : {rumination_rate}")
    logger.info(f"  gps_lat       : {gps_lat}")
    logger.info(f"  gps_lng       : {gps_lng}")
    # Image diagnostics
    if image is None:
        logger.info("  image         : None (not sent)")
    else:
        logger.info(f"  image.filename     : {repr(image.filename)}")
        logger.info(f"  image.content_type : {repr(image.content_type)}")
        logger.info(f"  image.size         : {image.size}")   # may be None before read
        logger.info(f"  image field name   : {repr(image.headers.get('content-disposition', 'N/A'))}")
    logger.info("=" * 60)

    # Store raw reading in state for frontend polling
    app_state.latest_sensor_reading = {
        "cow_id": cow_id,
        "ec": ec,
        "ph": ph,
        "milk_temp": milk_temp,
        "rumination_rate": rumination_rate,
        "gps_lat": gps_lat,
        "gps_lng": gps_lng,
        "received_at": datetime.now(timezone.utc).isoformat(),
    }

    # Fill in median values for the missing tabular fields based on EDA dataset
    # SCC median is 163.0, Yield median is 18.9, Clotting mode is "none"
    scc = 163.0
    yield_l = 18.9
    clotting = "none"

    gps_dict = None
    if gps_lat is not None and gps_lng is not None:
        gps_dict = {"lat": gps_lat, "lng": gps_lng}

    reading = SensorReading(
        cow_id=cow_id,
        milk_conductivity_mScm=ec,
        milk_ph=ph,
        milk_temp_c=milk_temp,
        rumination_rate_per_min=rumination_rate,
        scc=scc,
        yield_l=yield_l,
        clotting=clotting,
        gps=gps_dict,
        timestamp=datetime.now(timezone.utc).isoformat()
    )

    # 0. Check if cow exists, create if not
    try:
        cow = get_cow(cow_id)
        if not cow:
            logger.info(f"Auto-creating missing cow: {cow_id}")
            farm_id = None
            if gps_dict:
                try:
                    from app.services.locationiq import reverse_geocode
                    gh = compute_geohash(gps_dict["lat"], gps_dict["lng"])
                    # Check if a farm already exists for this geohash
                    from app.services.supabase import get_client
                    client = get_client()
                    res = client.table("farms").select("*").eq("geohash", gh).execute()
                    if res.data:
                        farm_id = res.data[0]["id"]
                    else:
                        # Auto-create farm
                        location_data = await reverse_geocode(gps_dict["lat"], gps_dict["lng"])
                        addr = location_data.get("address", {})
                        region = addr.get("county") or addr.get("state_district") or addr.get("city") or addr.get("state") or "Unknown"
                        
                        farm_insert = {
                            "name": f"Auto Farm {gh}",
                            "lat": gps_dict["lat"],
                            "lng": gps_dict["lng"],
                            "geohash": gh,
                            "region": region
                        }
                        f_res = client.table("farms").insert(farm_insert).execute()
                        if f_res.data:
                            farm_id = f_res.data[0]["id"]
                except Exception as geo_e:
                    logger.error(f"Error during auto farm creation: {geo_e}")
            
            insert_cow({"id": cow_id, "farm_id": farm_id})
    except Exception as e:
        logger.error(f"Error auto-creating cow: {e}")

    # 1. Insert reading into Supabase
    try:
        db_reading = {
            "cow_id": cow_id,
            "ec": ec,
            "ph": ph,
            "milk_temp": milk_temp,
            "scc": scc,
            "yield_l": yield_l,
            "clotting": clotting,
            "rumination_rate": rumination_rate,
            "gps_lat": gps_lat,
            "gps_lng": gps_lng
        }
        insert_sensor_reading(db_reading)
    except Exception as e:
        logger.error(f"Supabase error inserting sensor reading: {e}")

    # 2. Convert reading into TabularInput
    tabular_input = TabularInput(
        ec=ec,
        ph=ph,
        milk_temp=milk_temp,
        scc=scc,
        yield_l=yield_l,
        clotting=clotting,
        rumination_rate=rumination_rate
    )

    # 3. Call Random Forest inference
    logger.info("Running RF model...")
    if "rf" not in ml_models or ml_models["rf"] is None:
        raise HTTPException(status_code=503, detail="RF model not loaded")

    rf_result = predict_rf(ml_models["rf"], tabular_input)
    logger.info(f"RF result → probability={rf_result.rf_probability:.4f}  label={rf_result.rf_label}")

    # 4. Process CNN if Image is provided
    # Guard: accept image if filename is non-empty OR content_type is image/* OR size > 0
    cnn_score = None
    cnn_result_str = None
    image_bytes = b""

    has_image = (
        image is not None
        and (
            bool(image.filename)
            or (image.content_type and image.content_type.startswith("image/"))
        )
    )
    logger.info(f"Image present check → has_image={has_image}")

    if has_image:
        if "cnn" not in ml_models or ml_models["cnn"] is None:
            logger.warning("CNN model not loaded — skipping image prediction")
        else:
            logger.info("CNN model loaded — reading image bytes...")
            try:
                image_bytes = await image.read()
                logger.info(f"Image bytes read → {len(image_bytes)} bytes")
                if image_bytes:
                    logger.info("Running CNN inference...")
                    cnn_pred = predict_cnn(ml_models["cnn"], image_bytes)
                    cnn_score = cnn_pred.cnn_score
                    cnn_result_str = "Detected" if cnn_pred.detected else "Not Detected"
                    logger.info(
                        f"CNN result → detected={cnn_pred.detected}  "
                        f"confidence={cnn_pred.confidence:.4f}  cnn_score={cnn_score:.4f}  "
                        f"verdict={cnn_result_str}"
                    )
                else:
                    logger.warning("Image field present but read() returned 0 bytes — skipping CNN")
            except Exception as e:
                logger.error(f"CNN inference error: {e}", exc_info=True)
    else:
        logger.info("No image in request — CNN skipped, weight redistributed to RF")

    # 5. Get regional anomaly score
    geohash_val = None
    anomaly_severity = 0.0
    if gps_dict:
        try:
            geohash_val = compute_geohash(gps_dict["lat"], gps_dict["lng"])
            anomaly_result = compute_regional_anomaly(geohash_val)
            anomaly_severity = anomaly_result.get("severity", 0.0)
            logger.info(f"Geohash={geohash_val}  anomaly_severity={anomaly_severity:.4f}")
            # Trigger regional recomputation in background
            background_tasks.add_task(recompute_geohash_stats)
        except Exception as e:
            logger.error(f"Error computing geohash or anomaly: {e}")
    else:
        logger.info("No GPS — skipping geohash/anomaly (severity=0.0)")

    # 6. Compute Joint Score
    logger.info(f"Computing joint score: rf={rf_result.rf_probability:.4f}  cnn={cnn_score}  anomaly={anomaly_severity:.4f}")
    try:
        joint_prediction_dict = compute_joint_score(
            rf_probability=rf_result.rf_probability,
            cnn_score=cnn_score,
            anomaly_severity=anomaly_severity,
        )
        joint_prediction_dict["cow_id"] = reading.cow_id
        joint_prediction = JointPrediction(**joint_prediction_dict)
        logger.info(
            f"Joint result → score={joint_prediction.joint_score:.4f}  "
            f"tier={joint_prediction.risk_tier}  "
            f"w_rf={joint_prediction.rf_weight:.2f}  "
            f"w_cnn={joint_prediction.cnn_weight:.2f}  "
            f"w_anomaly={joint_prediction.anomaly_weight:.2f}"
        )
    except Exception as e:
        logger.error(f"Error computing joint score: {e}")
        raise HTTPException(status_code=500, detail="Error computing joint prediction")

    # Store full result in state so frontend can poll and display it (hardware/API requests)
    # cnn_detected / cnn_confidence give the frontend the CNN verdict even when image came from API
    
    hw_image_base64 = None
    if has_image and image_bytes:
        mime = image.content_type if image.content_type else "image/jpeg"
        b64_str = base64.b64encode(image_bytes).decode('utf-8')
        hw_image_base64 = f"data:{mime};base64,{b64_str}"

    app_state.latest_joint_result = {
        **joint_prediction.model_dump(),
        "cnn_detected": (cnn_score is not None and cnn_score >= 0.5),
        "cnn_confidence": cnn_score,
        "image_was_submitted": has_image,
        "hw_image_base64": hw_image_base64,
        "source": "hardware",  # marks it as externally originated so frontend treats it differently
    }

    # 7. Insert tabular prediction into Supabase
    try:
        rf_dict = {
            "cow_id": reading.cow_id,
            "rf_probability": rf_result.rf_probability,
            "rf_label": rf_result.rf_label,
            "top_features": rf_result.top_features
        }
        insert_tabular_prediction(rf_dict)
    except Exception as e:
        logger.error(f"Supabase error inserting tabular prediction: {e}")

    # 8. Insert joint prediction into Supabase
    try:
        jp_dict = joint_prediction.model_dump()
        # map anomaly_severity back to regional_severity for DB
        jp_dict["regional_severity"] = jp_dict.pop("anomaly_severity", 0.0)
        # remove weight columns as they are not in the DB schema
        jp_dict.pop("rf_weight", None)
        jp_dict.pop("cnn_weight", None)
        jp_dict.pop("anomaly_weight", None)
        
        if geohash_val:
            jp_dict["geohash"] = geohash_val
        insert_joint_prediction(jp_dict)
    except Exception as e:
        logger.error(f"Supabase error inserting joint prediction: {e}")

    # 9. Send SMS alert for Moderate or High risk
    if joint_prediction.risk_tier in ["Moderate", "High"]:
        try:
            import os
            target_phone = os.environ.get("TEST_SMS_NUMBER")
            if not target_phone:
                farm = get_farm_for_cow(reading.cow_id)
                target_phone = farm.get("farmer_phone") if farm else None
            
            if target_phone:
                risk_pct = round(joint_prediction.joint_score * 100, 1)
                sms_body = (
                    f"MooSense Alert: Cow {reading.cow_id} - {joint_prediction.risk_tier} Risk ({risk_pct}%). "
                    f"EC={ec} mS/cm, pH={ph}, Temp={milk_temp}C. "
                    f"{'Contact vet immediately.' if joint_prediction.risk_tier == 'High' else 'Monitor closely and check udder.'}"
                )
                background_tasks.add_task(send_sms, target_phone, sms_body)
                logger.info(f"SMS queued for {target_phone} — {joint_prediction.risk_tier} risk on {reading.cow_id}")
            else:
                logger.info("No phone number configured (set TEST_SMS_NUMBER in .env or farmer_phone in DB). Skipping SMS.")
        except Exception as e:
            logger.error(f"SMS alert error: {e}")

    return joint_prediction
