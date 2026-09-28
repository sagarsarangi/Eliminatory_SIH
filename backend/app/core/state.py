"""Shared application state — avoids circular imports between main.py and routers."""

# Populated at startup by the lifespan handler in main.py
ml_models: dict = {}

# Latest raw sensor reading from hardware (ESP32/Wokwi) — overwritten on each ingest
# Shape mirrors the ESP32 JSON payload. Frontend polls GET /api/ingest/latest to auto-fill the form.
latest_sensor_reading: dict | None = None

# Latest full joint prediction result (from any source — hardware POST, manual form, curl).
# Includes CNN verdict if image was provided. Frontend polls GET /api/ingest/latest-result.
# Cleared after delivery so the same result isn't re-shown on the next poll.
latest_joint_result: dict | None = None
