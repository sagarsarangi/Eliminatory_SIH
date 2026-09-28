# MooSense — AI-Enabled Bovine Mastitis Forecasting System
### Detailed Project & Software Plan

---

## 1. One-Line Pitch

An IoT + AI system that predicts subclinical mastitis in dairy cattle **7–14 days before clinical symptoms appear**, using milk sensor data (EC, pH, temperature), cow behavior (rumination via gyroscope), a teat-image CNN classifier, and time-series anomaly detection — fused into a joint risk score, explained in plain language by a GenAI layer, and surfaced through a landing page → working app with dashboard, live disease map, open API, and SMS alerts to farmers.

---

## 2. What We Are Actually Building (Scope for the Demo)

Given the fixed hardware output (EC, pH, milk temp, gyroscope rotation, GPS) and the two datasets available, the system has **five independent, demoable pillars**:

| Pillar | Input | Output |
|---|---|---|
| **A. Tabular Risk Classifier** | EC, pH, milk temp, SCC, yield, coagulation, rumination-derived activity score | Binary label (0/1) + probability score, since the Kaggle dataset's `class` column is binary, not probabilistic |
| **B. Image-Based Detector (CNN)** | Photo of cow teat (upload or API) | Mastitis: Detected / Not Detected + confidence score |
| **C. Anomaly Detector (Regional Hotspot Z-Score)** | Geohash-binned regional mastitis rate vs. overall average | Anomaly severity: how statistically elevated this cow's region is right now |
| **D. Hardware Simulation Layer** | Simulated ESP32 (Wokwi) → JSON over WiFi/serial | Live-streamed sensor readings into backend |
| **E. GenAI Explanation Layer (Groq)** | Risk score + top contributing features | Plain-language, farmer-friendly explanation + preventive advice |

**On the UI**, the tabular result and the CNN image result are shown as **two independent verdicts** (per your ask — audience sees them as separate signals). **Internally**, the backend computes one **joint weighted score** that actually drives the alert/SMS/map logic:

```
joint_score = (0.70 × RandomForest_probability)
            + (0.20 × CNN_confidence_if_mastitis_else_inverse)
            + (0.10 × Regional_hotspot_zscore_severity)
```

This joint score — not either individual model alone — is what determines the final risk tier (No/Low/Moderate/High), triggers SMS, and is what gets plotted on the map/dashboard as "current risk." The two independent model outputs are still stored and displayed separately so farmers/vets can see *why* (milk chemistry vs. visual symptom vs. regional outbreak signal). Critically, the regional hotspot component means **a cow with otherwise normal readings still gets a nudged-up risk score if she's in a region where many other cows are currently flagged** — catching the "outbreak spreading nearby" scenario even before her own sensors show anything unusual.

---

## 3. Architecture Overview

```
┌─────────────────────┐
│  ESP32 (Wokwi sim)  │  EC probe, pH probe, DS18B20, MPU6050, GPS
│  → JSON over WiFi    │
└──────────┬───────────┘
           │ POST /api/ingest/sensor
           ▼
┌─────────────────────────────────────────────┐
│           Next.js Full-Stack App              │
│  ┌─────────────┐        ┌──────────────────┐ │
│  │  Frontend    │◄──────►│  API Routes /     │ │
│  │  (React,     │        │  Server Actions   │ │
│  │  Dashboard,  │        │  (thin proxy /    │ │
│  │  MapLibre)   │        │  auth / DB calls) │ │
│  └─────────────┘        └─────────┬──────────┘ │
└────────────────────────────────────┼────────────┘
                                      │ REST
                                      ▼
                        ┌─────────────────────────┐
                        │   FastAPI Backend         │
                        │  ┌───────────────────┐   │
                        │  │ Tabular Classifier │   │
                        │  │ (RandomForest/     │   │
                        │  │  XGBoost, in-mem)  │   │
                        │  ├───────────────────┤   │
                        │  │ CNN Image Model    │   │
                        │  │ (ResNet/MobileNet, │   │
                        │  │  in-mem, torch)    │   │
                        │  ├───────────────────┤   │
                        │  │ Open API Endpoints │   │
                        │  │ /predict/tabular   │   │
                        │  │ /predict/image     │   │
                        │  │ /ingest/sensor     │   │
                        │  ├───────────────────┤   │
                        │  │ SMS Trigger        │   │
                        │  │ (TextBee webhook)  │   │
                        │  └───────────────────┘   │
                        └───────────┬───────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             ┌────────────┐  ┌────────────┐  ┌─────────────┐
             │  Supabase   │  │ Cloudinary │  │  TextBee     │
             │  (Postgres  │  │ (teat      │  │  (SMS API)   │
             │  + Auth +   │  │  images)   │  │              │
             │  Realtime)  │  │            │  │              │
             └────────────┘  └────────────┘  └─────────────┘
```

**Why this split:** Next.js handles UI + light server logic (auth, DB reads for dashboard, proxying); FastAPI is the dedicated ML serving layer since Python owns your model ecosystem (sklearn/XGBoost/PyTorch). Both are stateless-deployable (Vercel for Next.js, Render/Railway/Fly.io for FastAPI) — no AWS anywhere.

---

## 4. Hardware Layer (Simulated)

### 4.1 Sensors (fixed, as given)
| Sensor | Measures | Simulated via |
|---|---|---|
| EC probe (analog) | Milk electrical conductivity | Wokwi potentiometer / scripted value generator |
| pH probe (analog) | Milk pH / acidity | Wokwi potentiometer / scripted value generator |
| DS18B20 (digital, 1-Wire) | Milk/udder temperature | Wokwi DS18B20 virtual sensor |
| MPU6050 (I2C gyroscope+accel) | Cow head rotation → chewing/rumination rhythm | Wokwi MPU6050 virtual sensor, scripted motion pattern |
| GPS (NEO-6M or virtual) | Farm/animal location | Wokwi NEO-6M virtual module or hardcoded lat/lng per simulated farm |

### 4.2 ESP32 Firmware (Wokwi, Arduino/C++)
- Reads all 5 sensors on a loop (e.g., every 10s in demo mode).
- Converts raw ADC/I2C values into real units (mS/cm, pH, °C, rotation events/min).
- Derives a simple **rumination proxy**: count of rhythmic rotation peaks per minute from gyroscope data (basic peak-detection, no ML on-device).
- Packages into JSON:
```json
{
  "cow_id": "COW_014",
  "timestamp": "2026-09-16T10:32:00Z",
  "milk_conductivity_mScm": 6.8,
  "milk_ph": 6.9,
  "milk_temp_c": 38.9,
  "rumination_rate_per_min": 42,
  "gps": { "lat": 22.8046, "lng": 86.2029 }
}
```
- Local feedback: 16x2 LCD shows values, RGB LED shows risk color (green/yellow/red) once backend responds, buzzer on High Risk.
- Sends JSON via WiFi (simulated network in Wokwi) → `POST /api/ingest/sensor`.

### 4.3 Demo story
"Here's our ESP32 circuit in Wokwi, reading simulated EC/pH/temp/rotation/GPS live, streaming to our dashboard in real time — this is exactly what a farmer's physical device would send." This is honest and sufficient for a hackathon — no need to claim real hardware.

---

## 5. Data & Datasets

### 5.1 Tabular dataset (Kaggle: `cow-mastitis-from-milk`)
Columns: `Cow_ID, Day, Timepoint, Milk_Temperature, Milk_pH, Milk_Conductivity, Somatic_Cell_Count, Milk_Yield, Clotting, class` (label)

**Preprocessing / feature engineering plan:**
- Clean nulls, standardize/normalize numeric columns.
- Encode `Clotting` (categorical: none/slight/clots) as ordinal.
- Add engineered features:
  - `EC_pH_ratio` (mastitis often raises EC while pH shifts)
  - `SCC_log` (log-transform, SCC is highly skewed)
  - `Yield_drop_pct` if multiple days per cow are available (rolling comparison)
- The dataset's `class` label is **binary (0 = no mastitis, 1 = mastitis)** — confirmed, not a probability and not multi-class. Map this to our 4-tier system (No/Low/Moderate/High) by using the Random Forest's `predict_proba()` output (Section 6.1), not the raw 0/1 label, then bucket that probability into 4 risk bands, e.g.:
  - `<20%` → No Risk, `20–45%` → Low, `45–70%` → Moderate, `>70%` → High

### 5.2 Image dataset (Kaggle: `mastitis-in-cows`)
~500–600 teat images, balanced mastitis/no-mastitis.
- Standard image preprocessing: resize (224x224), normalize, augmentation (flip, rotation, brightness jitter — small dataset needs this).
- Train/val/test split ~70/15/15, stratified.

---

## 6. ML Models

### 6.1 Model A — Tabular Risk Classifier (Random Forest)
- **Algorithm:** Random Forest classifier (switched from XGBoost per your call) — robust on small/medium tabular data, handles non-linear feature interactions, gives feature importances "for free" (useful for the "Primary Risk Drivers" explainability feature and for the GenAI layer's input).
- **Label:** the Kaggle `class` column is **binary (0 = no mastitis, 1 = mastitis)** — not a probability. So:
  - Train as a standard binary classifier.
  - Use `predict_proba()` to get a continuous probability (0–1) from the trained Random Forest, even though ground truth is 0/1. This probability is what feeds the 70% weight in the joint score — the raw 0/1 label itself is only used for training/evaluation, never shown as the "score."
- **Training:** scikit-learn `RandomForestClassifier`, stratified train/test split (dataset is per-cow/per-day so split by `Cow_ID` to avoid leakage across timepoints of the same cow), cross-validation, `GridSearchCV` for `n_estimators`/`max_depth`/`min_samples_leaf`.
- **Output:** probability score (0–1) + binary label + top contributing features (`feature_importances_`).
- **Serving:** trained model pickled/joblib-dumped, loaded in-memory at FastAPI startup (`@app.on_event("startup")`). No separate model server needed at hackathon scale.
- **Stretch goal (trend/forecasting):** if a cow has ≥3 days of readings, compute rolling deltas (EC trend, temp trend, rumination trend) and feed as extra features, or run a simple logistic regression on the trend slope to flag "worsening trajectory" separately from single-point risk.

### 6.2 Model B — Teat Image CNN
- **Approach:** Transfer learning — MobileNetV2 or ResNet18 (small, fast, good for ~500 images) with frozen base + fine-tuned classification head. Given the small dataset, transfer learning is essential over training from scratch.
- **Framework:** PyTorch (pairs well with FastAPI) or TensorFlow/Keras — recommend **PyTorch** for consistency with FastAPI's Python-native ecosystem.
- **Output:** binary classification (Mastitis Detected / Not Detected) + confidence %.
- **Serving:** `.pt` model loaded in-memory at FastAPI startup, inference on uploaded image via `torchvision.transforms`.

### 6.3 Model C — Regional Hotspot Anomaly Detection (Z-Score Based)
- **Purpose:** independent of any single cow's own sensor readings, this asks: *"is this cow's region currently experiencing an unusually high mastitis rate compared to the overall average across all monitored regions?"* — this is what lets a nearby outbreak raise a healthy-looking cow's risk score, and it's the same computation that drives the hotspot layer on the Live Map (Section 10), so the visualization and the score are always consistent with each other.
- **Region definition:** cows/farms are binned by **geohash** (e.g., precision 5–6, roughly a few km per cell — tune based on how spread out your simulated farms are) rather than raw lat/lng or fixed radius, since geohash cells map directly and cleanly onto the map's hotspot grid/heatmap layer — no separate "region logic" for scoring vs. visualization.
- **Computation:**
  1. For each geohash cell, compute the **recent mastitis rate**: proportion of joint predictions in that cell (over a rolling window, e.g. last 7–14 days) that landed in Moderate/High risk.
  2. Compute the **mean and standard deviation** of this rate across all active geohash cells.
  3. For a given cell: `z = (cell_rate - overall_mean_rate) / overall_std_rate`.
  4. Normalize `z` into a 0–1 **severity score** (e.g. clip to a reasonable z-range like [-1, 3] and min-max scale) — this is the `anomaly_severity` term in the joint score.
  5. Cells with too few readings (below a minimum count threshold, e.g. 3 cows) are excluded from the z-score population and default to `anomaly_severity = 0` for cows in them, to avoid one or two cows swinging a region's statistics wildly.
- **Recomputation cadence:** recalculated whenever a new joint prediction lands (cheap aggregate query over `joint_predictions` grouped by geohash) — no need for a separate scheduled job at hackathon scale, though a periodic refresh (e.g. every few minutes) is a reasonable optimization if read load becomes a concern.
- **Fallback for demo:** pre-seed 2–3 simulated farms in the *same* geohash cell with several High Risk cows, then submit a new, otherwise-healthy-looking cow in that same cell live — her joint score visibly ticks up purely from the regional term, which is a clean, explainable demo moment ("she looks fine on paper, but her region is currently an outbreak zone").

### 6.4 Joint Score Computation (Backend Only)
```python
joint_score = (0.70 * rf_probability) + (0.20 * cnn_score) + (0.10 * anomaly_severity)
```
- `cnn_score`: CNN's confidence that mastitis IS present (if CNN says "not detected", use `1 - confidence` so the term still represents "evidence toward mastitis").
- `anomaly_severity`: normalized regional hotspot z-score severity (0 = region completely normal, 1 = region strongly elevated), sourced from `geohash_stats`. Defaults to 0 if the cow's geohash cell has too few readings to compute a reliable z-score yet. Separately, if no image was submitted for a given reading (image is optional/independent), the 20% CNN weight is redistributed proportionally to RF for that computation.
- Risk banding on `joint_score`: `<0.20` No Risk · `0.20–0.45` Low · `0.45–0.70` Moderate · `>0.70` High.
- This joint score is what's stored as the "current risk" on the cow record, drives the map color, drives SMS triggering, and drives the GenAI explanation prompt — even though the dashboard UI shows the RF result and CNN result as two separate labeled cards.

### 6.5 Explainability (nice-to-have, judges love this)
- For Model A: bar chart of top 3 contributing features per prediction ("75% risk — driven by EC spike + rumination drop", matching your original flowchart language).
- For Model B: simple Grad-CAM heatmap overlay on the teat image, if time permits — shows *where* the model is looking.

---

## 7. GenAI Explanation Layer (Groq)

**Purpose:** convert everything the system knows about a specific prediction — the raw milk/sensor values submitted, what the tabular model returned, what the image model returned, and the regional hotspot context — into a short, plain-language, farmer-readable explanation and preventive-action recommendation. This is what actually gets sent as the SMS body and shown on the farmer-facing alert card, instead of a raw JSON/number.

- **Provider:** Groq API (fast inference, generous free tier, good fit for a hackathon demo needing low-latency calls on every prediction).
- **Model:** a Groq-hosted Llama model (e.g. `llama-3.1-8b-instant` or the latest available small/fast Groq model at build time — check Groq's model list when you build, since offerings change).
- **Trigger:** called server-side from FastAPI right after the joint score is computed (only for Moderate/High risk, to avoid unnecessary calls on routine healthy readings — configurable).
- **What goes into the prompt (full context, not just the final score):**
  - *Raw submitted milk/sensor data:* EC, pH, milk temp, SCC, yield, clotting, rumination rate — the actual values the farmer/device submitted, not just derived features, so the explanation can reference specifics ("your milk's conductivity was notably high").
  - *Tabular model output:* RF probability, binary verdict (0/1), and top contributing features from `feature_importances_`.
  - *Image model output:* CNN verdict (detected/not detected) + confidence, if a teat photo was submitted for this cow; explicitly noted as "not provided" if it wasn't, so the model doesn't fabricate a visual finding.
  - *Regional hotspot context:* this region's current z-score severity and, if available, a short human-readable signal like "3 other cows in this area were flagged this week" — pulled from `geohash_stats` — so the explanation can mention outbreak context when relevant.
  - *Joint score + risk tier:* the final computed number and its band, as the anchor for the explanation.
- **Prompt design (kept tight and structured):**
```
System: You are a dairy health assistant writing a SHORT alert for a rural farmer.
Keep it under 40 words, plain language, no jargon, actionable.

User: Cow {cow_id}. Risk level: {risk_tier} ({joint_score}%).

Milk/sensor readings submitted: EC {ec} mS/cm, pH {ph}, milk temp {milk_temp}°C,
SCC {scc}, yield {yield_l} L, clotting: {clotting}, rumination rate {rumination_rate}/min.
Tabular model: {rf_label} ({rf_probability}% probability), top factors: {top_features_list}.
Image result: {cnn_result and confidence, or "not provided"}.
Regional hotspot status: {region_zscore_severity} — {e.g. "3 other cows flagged nearby this week" or "no elevated activity nearby"}.

Write:
1. One sentence explaining why this cow is flagged, referencing the most relevant
   factor(s) from the data above (milk chemistry, visual symptom, or nearby outbreak).
2. One sentence of immediate preventive action (non-antibiotic if Moderate, vet-contact if High).
```
- **Output usage:**
  - Farmer-facing alert card on dashboard.
  - SMS body sent via TextBee (kept within SMS length limits).
  - Stored in `alerts.message` (replacing/augmenting the earlier static template from Section 11).
- **Fallback:** if the Groq call fails/times out, fall back to a static templated message (the original Section 11 template) so the alert/SMS pipeline never blocks on an external LLM call.
- **Regional language note:** Groq call can request output directly in Hindi/Odia by adjusting the system prompt language instruction — easy extension, not core-blocking for the first pass (English first, then add a language toggle).

---

## 8. Backend (FastAPI) — API Design

All endpoints are **open** (no auth required for prediction endpoints, so any curl/external client can call them — auth only gates dashboard/write-heavy admin routes if needed).

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/ingest/sensor` | POST | Receives ESP32 JSON payload, stores raw reading in Supabase, runs Model A + Model C, updates joint score, triggers SMS if High Risk |
| `/api/predict/tabular` | POST | Standalone: accepts manual form input (EC, pH, temp, SCC, yield, clotting, rumination, optional known 0/1 label for comparison) → returns RF probability + binary verdict + top features. Works via curl/Postman/any client. |
| `/api/predict/image` | POST (multipart/form-data) | Accepts teat image upload → returns CNN mastitis detected/not + confidence. Works via curl `-F "file=@teat.jpg"`. |
| `/api/predict/joint` | POST/internal | Computes/recomputes the 70/20/10 joint score for a cow once tabular and/or image and/or regional hotspot components are available; called internally after the above, but also exposed for direct testing via curl |
| `/api/cows/{cow_id}/history` | GET | Returns time-series of a cow's readings + all prediction components (RF, CNN, regional hotspot severity, joint) |
| `/api/cows/register` | POST | Registers a new cow/farm, captures farmer phone number for TextBee |
| `/api/map/hotspots` | GET | Geohash-binned regional mastitis rate + z-score severity per cell — powers both the map's hotspot layer AND the Section 6.3 anomaly score, so they're always the same underlying computation |
| `/api/alerts/recent` | GET | Recent High Risk events for live feed |
| `/api/sms/test` | POST | Manually trigger a test SMS via TextBee (for demo) |
| `/api/explain` | POST/internal | Calls Groq to generate the plain-language explanation from a joint score + top features; used by the alert/SMS pipeline and by the dashboard's explanation card |

**Design principle:** every prediction endpoint is stateless and self-contained — so it's trivially demoable live on stage with a raw `curl` command, exactly as you wanted ("open-ended, works from anywhere").

Example curl for judges:
```bash
curl -X POST https://your-api.onrender.com/api/predict/tabular \
  -H "Content-Type: application/json" \
  -d '{"ec": 6.8, "ph": 6.9, "milk_temp": 38.9, "scc": 450000, "yield_l": 12.4, "clotting": "slight", "rumination_rate": 38}'

curl -X POST https://your-api.onrender.com/api/predict/image \
  -F "file=@teat_sample.jpg" \
  -F "cow_id=COW_014"
```

---

## 9. Database & Storage (No AWS)

| Service | Use |
|---|---|
| **Supabase (Postgres)** | Core relational store: `cows`, `farms`, `sensor_readings`, `predictions`, `alerts` tables. Also gives free Auth (for vet/coop login) and Realtime (dashboard can subscribe to live inserts instead of polling). |
| **Supabase Storage** *or* **Cloudinary** | Teat image storage. Cloudinary preferred if you want on-the-fly transforms (thumbnailing for dashboard gallery) and easy CDN delivery; Supabase Storage is simpler if you want everything in one service. **Recommendation: Cloudinary**, since it's free-tier generous and purpose-built for image handling + has an easy upload widget for the frontend form. |
| **TextBee** | SMS gateway (self-hosted-friendly, Android-SIM-based) — triggered server-side from FastAPI when risk = High. |

### Suggested Supabase schema (core tables)
```sql
farms(id, name, lat, lng, geohash, region, farmer_phone, created_at)
cows(id, farm_id, breed, age, lactation_number, disease_history, created_at)
sensor_readings(id, cow_id, ec, ph, milk_temp, scc, yield_l, clotting, rumination_rate,
                 known_label int,  -- optional 0/1 submitted alongside, for live-validation demo
                 gps_lat, gps_lng, recorded_at)
tabular_predictions(id, cow_id, reading_id, rf_probability, rf_label, top_features jsonb, created_at)
image_predictions(id, cow_id, image_url, cnn_detected boolean, cnn_confidence, created_at)
geohash_stats(geohash text primary key, recent_mastitis_rate, cow_count,
              zscore, severity, last_computed_at)  -- recomputed rolling aggregate, not per-reading
joint_predictions(id, cow_id, geohash, rf_probability, cnn_score, regional_severity,
                   joint_score, risk_tier, created_at)
alerts(id, cow_id, joint_prediction_id, type, message, sms_sent boolean, created_at)
```

---

## 10. Frontend (Next.js) — What the Judges See

### 9.1 Overall Flow
```
Landing Page (/)
   │  [ Enter App → ] button
   ▼
Working App (/app) — single-page-app-style with in-page sections/tabs:
   ├── Section 1: Submit Data
   │      ├── Tabular submission card (milk sensor values + 0/1 label field for testing/labeling)
   │      └── Teat photo submission card (independent upload, own "Analyze" button)
   │           → both cards show their OWN result independently (RF verdict / CNN verdict)
   │           → phone number captured here (per farm/cow, asked once, reused after)
   ├── Section 2: Dashboard
   │      → herd table, per-cow detail, trend charts, RF + CNN + anomaly + joint score, GenAI explanation
   ├── Section 3: Live Map
   │      → MapLibre map with farm/cow markers, hotspot regions, live feed panel, all in one view
   └── (Alerts fire automatically in the background whenever joint score crosses High Risk,
        regardless of which section the user is on)
```

### 9.2 Landing Page (`/`)
- Problem statement (subclinical mastitis, economic impact, AMR angle), quick visual/stat strip, and a single prominent **"Enter MooSense →"** button routing to `/app` (Next.js route, new page — not a modal/scroll section, per your ask).
- Optional: small live counter pulled from DB ("X cows monitored, Y alerts today") to make the landing page feel connected to a real system rather than static marketing.

### 9.3 Working App (`/app`) — Section-by-Section

**Section 1 — Submit Data**
Two visually **independent** cards side-by-side (or stacked on mobile), each with its own submit button and own result panel — this is the audience-facing independence you asked for:

- *Card A: Milk/Sensor Submission*
  - Form fields: `cow_id` (select existing or create new), EC, pH, milk temp, SCC, yield, clotting, rumination rate, and a `known_label` field (0/1) — this lets a demo operator submit a "ground truth" test row and immediately see if the RF model agrees, which is a nice live-validation moment for judges.
  - On submit → hits `/api/predict/tabular` → shows RF probability + binary verdict + top features in this card only.
- *Card B: Teat Photo Submission*
  - `cow_id` selector + image upload (drag/drop or file picker) + optional GPS (auto-filled from farm record or manual pin).
  - On submit → hits `/api/predict/image` → shows CNN verdict + confidence + (optional) Grad-CAM overlay in this card only.
- *Phone number capture:* the first time a farm/cow is registered (or if missing), a small inline field asks for the **farmer's phone number**, stored against that farm/cow record in Supabase — this is what TextBee uses later. Not re-asked once saved.
- **Behind the scenes (not shown as a "joint score" here, but computed):** once both a tabular and/or image submission exist for that cow's current reading window, the backend computes the joint score (Section 6.4) and writes the unified risk record — this is what populates Dashboard/Map. If only one of the two (tabular or image) is submitted, the joint score still computes using available components with weight redistribution.

**Section 2 — Dashboard**
- Herd table: all cows, current joint risk badge (color-coded), last updated time, quick links to RF/CNN/anomaly sub-scores.
- Per-cow detail drawer/page: trend line chart (EC/pH/temp/rumination over days via Recharts), RF probability + top features, CNN result if available, anomaly flag + severity, joint score breakdown (showing the 70/20/10 weighting visually, e.g. a small stacked bar), and the **GenAI plain-language explanation** card.
- All data read live from Supabase (via Supabase JS client or through Next.js API routes proxying FastAPI/Supabase) — so anything submitted in Section 1, or streamed in from the simulated ESP32, appears here without manual refresh (Supabase Realtime subscription).

**Section 3 — Live Map**
Single unified view combining:
- **MapLibre GL JS map**: farm/cow markers colored by current joint risk level, clustering for dense areas, click → popup with cow ID, risk tier, last updated, link to full dashboard detail.
- **Hotspot layer**: heatmap or binned-circle layer over geohash cells, colored by the same `zscore`/`severity` value computed in Section 6.3 and stored in `geohash_stats` — served via `/api/map/hotspots`. This is the exact same number feeding the 10% regional term in every cow's joint score, so the map isn't a separate "pretty visualization" — it's a direct view into the anomaly model's live state.
- **Regional ranking panel** (side panel on the same page, not a separate route): "Top regions by mastitis incidence this week" ranked list (top geohash cells by `zscore`), next to or below the map.
- **Live feed panel**: real-time scrolling list of recent alerts (Supabase Realtime subscription on `alerts` table inserts) — shows cow ID, risk tier, timestamp, and whether SMS was sent, updating live as new joint-score computations cross the High Risk threshold.

**Background: Automatic SMS on Detection**
- Whenever a new joint score is computed (from Section 1 submission or simulated ESP32 ingest) and crosses the High Risk threshold, FastAPI automatically:
  1. Calls Groq to generate the farmer-facing explanation (Section 7).
  2. Sends that message via TextBee to the phone number stored for that cow/farm.
  3. Writes to `alerts` table (`sms_sent = true/false`, `message` = GenAI output).
  4. This alert immediately appears in the Section 3 live feed and updates the map marker — no page reload needed anywhere, since everything subscribes to the same Supabase Realtime channel.

**API Playground (optional, folds into Section 1 as a "Try via API" toggle)** — rather than a separate page, add a small collapsible panel in Section 1 showing the equivalent `curl` command for whatever was just submitted through the form, reinforcing that the same endpoint is open and callable from anywhere.

### 9.4 Map implementation notes (MapLibre GL JS)
- Free, no API key lock-in (unlike Google Maps) — use MapLibre + a free tile source (e.g., OpenFreeMap or MapTiler free tier).
- Data flow: Next.js page fetches `/api/map/hotspots` from FastAPI (or reads Supabase directly via Supabase JS client) → renders GeoJSON source → circle/symbol layer colored by joint risk.
- Real-time: subscribe to Supabase Realtime on `predictions`/`alerts` table insert → push new marker / feed item onto the page without refresh.

---

## 11. SMS Alerting (TextBee)

- When `/api/ingest/sensor` or `/api/predict/tabular` returns **High Risk**, FastAPI calls TextBee's API with the farmer's registered phone number (stored on `farms` or `cows` table) and a templated message.
- Message template (regional-language-ready, keep it simple for demo):
  > "ALERT: Cow [COW_ID] shows HIGH mastitis risk. Isolate milk, contact vet. — MooSense"
- Log every SMS attempt in `alerts` table (`sms_sent` boolean) so dashboard shows delivery status.
- For demo: trigger it live on stage via the `/api/sms/test` endpoint or by feeding a deliberately high-risk manual entry.

---

## 12. End-to-End Demo Flow (what you actually show judges)

1. **Landing page** — show the problem stat strip, click **"Enter MooSense →"** to move into the working app.
2. **Section 1 — Submit Data**: 
   - Submit a milk/sensor reading with a known 0/1 label for a test cow → Card A shows RF probability + verdict, comparing it live against the known label ("the model agrees/disagrees" moment).
   - Independently upload a teat photo from the Kaggle test set → Card B shows CNN verdict + confidence, entirely separate from Card A.
   - If this is a new cow/farm, capture the farmer's phone number inline.
3. **Open Wokwi simulation** — show ESP32 circuit with EC/pH/temp/gyro/GPS sensors, values scrolling on serial monitor/LCD, streaming into `/api/ingest/sensor`.
4. **Trigger a High Risk case** — two good options to show back-to-back: (a) submit a cow with genuinely bad sensor values, and (b) submit an otherwise-normal-looking cow into a **pre-seeded outbreak geohash cell** (2–3 other High Risk cows already in that cell) and watch her joint score tick up purely from the regional term → watch, live, without refreshing:
   - Backend computes joint score (70% RF + 20% CNN + 10% regional hotspot z-score severity).
   - Groq generates a plain-language farmer explanation.
   - Dashboard badge turns red, joint score breakdown bar shown.
   - LED/buzzer fires in Wokwi.
   - Alert appears in the Live Feed panel (Section 3) with the GenAI-written message.
   - SMS fires via TextBee to the captured phone number (show phone receiving it, live).
   - New red marker appears on the MapLibre map at that farm's GPS location.
5. **Section 2 — Dashboard**: click into the flagged cow, show trend chart, RF/CNN/anomaly sub-scores, joint score breakdown, and the GenAI explanation card.
6. **Section 3 — Live Map**: zoom out to show multiple simulated farms across a region, colored by joint risk, hotspot heatmap layer, and the "Top regions by incidence" ranked panel alongside it.
7. **Open API demo** — run a `curl` command from a terminal (not the app itself) hitting `/api/predict/tabular` and `/api/predict/image` live, showing valid JSON predictions — proving the system is a real open API, not just a closed app.
8. **Close on impact**: cost savings, AMR reduction, early detection window (7–14 days), how the joint-score fusion and GenAI layer make the system both more accurate and actually usable by a non-technical farmer, and how this scales to smallholder farms.

---

## 13. Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js (React), Tailwind CSS, MapLibre GL JS, Recharts/Chart.js for trend graphs |
| Backend (API/UI glue) | Next.js API routes / server actions |
| Backend (ML serving) | FastAPI (Python) |
| ML — tabular | scikit-learn `RandomForestClassifier`, joblib for persistence |
| ML — image | PyTorch, torchvision (MobileNetV2/ResNet18 transfer learning) |
| Anomaly detection | Geohash-binned regional z-score (custom, computed from `joint_predictions` aggregates) — shared logic powers both the joint score's 10% term and the map's hotspot layer |
| GenAI | Groq API (Llama-based fast inference) for plain-language farmer explanations |
| Database | Supabase (Postgres + Auth + Realtime) |
| Image storage | Cloudinary |
| SMS | TextBee |
| Hardware | ESP32 (simulated via Wokwi), MPU6050, DS18B20, analog EC/pH probes, NEO-6M GPS |
| Deployment | Vercel (Next.js) + Render/Railway/Fly.io (FastAPI) — no AWS |

---

## 14. Build Order (Suggested Timeline for Hackathon)

1. **Hour 0–2:** EDA on both Kaggle datasets, confirm feature distributions, finalize feature engineering plan, set up Supabase schema (including `joint_predictions`, `anomaly_scores`).
2. **Hour 2–5:** Train Model A (Random Forest on binary label), save artifact, wrap in FastAPI `/predict/tabular`. Test via curl.
3. **Hour 5–8:** Train Model B (CNN), wrap in FastAPI `/predict/image`. Test via curl with sample images.
4. **Hour 8–9:** Build Model C (geohash binning of farms, `geohash_stats` rolling aggregate + z-score computation), wire into `/api/map/hotspots` and `/predict/joint`.
5. **Hour 9–10:** Implement joint score computation (70/20/10 weighting + redistribution when a component is missing), confirm map hotspot layer and joint score pull from the same `geohash_stats` values.
6. **Hour 10–11:** Wire up Groq GenAI explanation call + fallback static template; test `/api/explain`.
7. **Hour 11–13:** Build Wokwi ESP32 sim, wire up `/ingest/sensor` endpoint end-to-end, confirm data lands in Supabase and triggers joint score + GenAI + SMS pipeline.
8. **Hour 13–14:** Landing page (`/`) with entry button into `/app`.
9. **Hour 14–18:** Section 1 (Submit Data — both independent cards + phone capture), Section 2 (Dashboard — table, detail view, trend charts, joint score breakdown, GenAI card).
10. **Hour 18–20:** Section 3 (Live Map — MapLibre, hotspot layer, regional ranking panel, live feed panel), Supabase Realtime wiring across all three sections.
11. **Hour 20–22:** TextBee SMS wiring end-to-end, test live delivery.
12. **Hour 22–23:** Polish UI, seed realistic demo data (multiple farms across a few distinct geohash cells, one cell deliberately seeded as an "outbreak zone" with several High Risk cows, a few pre-set "sick" cows), rehearse full demo flow.
13. **Hour 23–24:** Buffer, bug fixes, deployment, README/pitch deck.

---

## 15. Open Questions to Resolve During Build (not blocking the plan)

- Confirm exact class balance (0/1 split) in the Kaggle tabular dataset — if imbalanced, plan for `class_weight='balanced'` in the Random Forest or SMOTE.
- Whether TextBee requires a paired Android device to be online during the demo (confirm your TextBee setup works reliably on venue WiFi).
- Whether you want farmer-facing GenAI text in a regional language (e.g., Hindi/Odia given Jharkhand region) — easy to add via the Groq system prompt, not core-blocking for the first pass (English first, then add a language toggle).
- Geohash precision level (5 vs 6 vs 7) — tune based on how geographically spread out your simulated demo farms actually are, so cells aren't too coarse (everything in one cell) or too fine (every farm its own cell, defeating the point).
- Minimum cow count per geohash cell before it's included in z-score population (suggested 3) — confirm this is achievable within your seeded demo data timeline.
- Groq rate limits — confirm free-tier throughput is sufficient if you plan to fire multiple test submissions rapidly during the live demo.
