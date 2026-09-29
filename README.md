# MooSense - AI-Enabled Bovine Mastitis Forecasting System

<p align="center">
  <!-- Frontend -->
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <!-- Backend -->
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <!-- ML -->
  <img src="https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" />
  <img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" />
  <!-- AI -->
  <img src="https://img.shields.io/badge/Groq-FF6C37?style=for-the-badge&logo=groq&logoColor=white" />
  <!-- Database -->
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <!-- IoT -->
  <img src="https://img.shields.io/badge/ESP32-E7352C?style=for-the-badge&logo=espressif&logoColor=white" />
  <!-- Maps -->
  <img src="https://img.shields.io/badge/MapLibre_GL-396CB2?style=for-the-badge&logo=maplibre&logoColor=white" />
  <!-- Deployment -->
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  <img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" />
</p>


## Overview

MooSense is an IoT + AI system that predicts subclinical mastitis in dairy cattle **7-14 days before clinical symptoms appear**. It fuses multiple data streams -- milk sensor data, cow behaviour, teat-image classification, and time-series anomaly detection -- into a single joint risk score.

The system leverages a Generative AI layer to explain complex predictions in simple language to farmers, surfacing this through a web app with a dashboard, a live disease map, an open API, and real-time SMS alerts.

## Core ML Pillars

The prediction engine relies on **three independent models** combining to form a unified Joint Risk Score:

1. **Tabular Risk Classifier (Random Forest):** Analyzes EC, pH, milk temp, SCC, yield, coagulation, and rumination-derived activity score. Contributes **70%** of the joint score.
2. **Image-Based Detector (CNN):** PyTorch MobileNetV2 transfer-learning model that classifies teat images for visual symptoms. Contributes **20%** (redistributed to RF if no image submitted).
3. **Anomaly Detector (Z-Score):** Computes geohash-binned regional mastitis rates to identify geographical outbreaks. Contributes **10%** -- allowing a healthy-looking cow in an outbreak zone to receive an elevated risk nudge.

---

## System Architecture

```mermaid
flowchart TD
    subgraph IOT ["IoT Edge - ESP32 (Wokwi Simulation)"]
        direction TB
        EC["EC Probe\nmS/cm"] --> MCU
        PH["pH Probe"] --> MCU
        TEMP["DS18B20\nTemp Sensor"] --> MCU
        GYRO["MPU6050\nGyroscope/Accel"] --> MCU
        GPS["NEO-6M\nGPS Module"] --> MCU
        MCU["ESP32 MCU\nPeak-detection -> rumination_rate\nPackages JSON every 10s\nLCD + RGB LED feedback"]
    end

    subgraph NEXT ["Next.js Full-Stack App (Vercel)"]
        direction LR
        UI["React UI\nDashboard\nLive Map (MapLibre)\nImage Upload\nAlert Feed"]
        SRV["API Routes /\nServer Actions\nAuth proxy\nDB reads\nWebSocket relay"]
        UI <--> SRV
    end

    subgraph FAST ["FastAPI ML Backend (Render / Railway)"]
        direction TB
        INGEST["/api/ingest/sensor\nValidate -> store -> predict"]
        TAB["/api/predict/tabular\nRandom Forest\njoblib in-memory"]
        IMG["/api/predict/image\nMobileNetV2 CNN\nPyTorch in-memory"]
        JOINT["/api/predict/joint\n0.70 x RF + 0.20 x CNN\n+ 0.10 x Z-Score"]
        EXPLAIN["/api/explain\nGroq Llama\nPrompt builder"]
        MAP["/api/map/hotspots\nGeohash Z-Score\naggregation"]
        INGEST --> TAB & IMG --> JOINT --> EXPLAIN
        JOINT --> MAP
    end

    subgraph STORE ["Supabase"]
        PG[("PostgreSQL\nfarms, cows\nsensor_readings\npredictions, alerts\ngeohash_stats")]
        STOR[("Storage\nTeat images")]
        RT["Realtime\nWebSocket push\nto dashboard"]
        PG --> RT
    end

    SMS["TextBee\nSMS Gateway"]

    MCU -- "POST JSON\n/api/ingest/sensor" --> INGEST
    SRV -- "REST" --> FAST
    FAST -- "INSERT / SELECT" --> PG
    FAST -- "Store teat image" --> STOR
    JOINT -- "High Risk?" --> SMS
    EXPLAIN -- "Explanation text" --> JOINT
    RT -- "Realtime subscription" --> UI
```

---

## Data & Prediction Flow

```mermaid
sequenceDiagram
    participant ESP as ESP32 (Wokwi)
    participant API as FastAPI Backend
    participant RF as Random Forest
    participant CNN as MobileNetV2 CNN
    participant GH as Geohash Z-Score
    participant GROQ as Groq (Llama)
    participant DB as Supabase
    participant SMS as TextBee
    participant UI as Next.js Dashboard

    ESP->>API: POST /api/ingest/sensor {ec, ph, milk_temp, rumination_rate, gps}
    API->>DB: INSERT sensor_readings

    par Parallel inference
        API->>RF: predict_proba(ec, ph, temp, scc, yield, clotting, rumination)
        RF-->>API: {rf_probability, rf_label, top_features[]}
    and
        API->>GH: SELECT geohash_stats WHERE geohash = cow.geohash
        GH-->>API: {z_score, severity, mastitis_rate}
    end

    API->>API: joint_score = 0.70 x RF + 0.10 x Z-Score\n(CNN weight redistributed to RF if no image)
    API->>DB: INSERT joint_predictions {joint_score, risk_tier}

    alt risk_tier = Moderate or High
        API->>GROQ: Prompt {cow_id, readings, rf_output,\nregional_context, joint_score}
        GROQ-->>API: Plain-language explanation (40 words max)
        API->>DB: INSERT alerts {message, sms_sent}
    end

    alt risk_tier = High
        API->>SMS: Send farmer SMS via TextBee webhook
    end

    DB-->>UI: Realtime subscription push
    UI->>UI: Update dashboard, map hotspot layer, alert feed

    Note over UI: Farmer uploads teat photo separately
    UI->>API: POST /api/predict/image (multipart)
    API->>CNN: torchvision.transforms -> MobileNetV2.forward()
    CNN-->>API: {cnn_detected, cnn_confidence}
    API->>API: Recompute joint_score with CNN 20% weight
    API->>DB: UPDATE joint_predictions
    API-->>UI: {cnn_detected, confidence, updated_joint_score}
```

---

## Joint Risk Score - Fusion Logic

```mermaid
flowchart TD
    subgraph INPUTS ["Model Inputs"]
        A["Milk Chemistry\nEC, pH, Temp, SCC\nYield, Clotting"]
        B["Teat Image\n224x224 RGB\n(optional)"]
        C["Regional Data\nGeohash cell mastitis rate\nvs. all-region average"]
    end

    subgraph MODELS ["Independent ML Models"]
        RF["Random Forest\nscikit-learn\npredict_proba() -> 0 to 1\ntop_features via\nfeature_importances_"]
        CNN["MobileNetV2\nPyTorch transfer learning\nFrozen base + fine-tuned head\nbinary: detected / not"]
        ZSCORE["Z-Score Anomaly\n(cell_rate - mean) / std\nclip z in range [-1, 3]\nnormalise -> 0 to 1 severity"]
    end

    subgraph FUSION ["Weighted Fusion"]
        W1["x 0.70"]
        W2["x 0.20\n(-> 0.90 RF if no image)"]
        W3["x 0.10"]
        ADD(["Sum = Joint Score\n0 to 1"])
    end

    subgraph BANDS ["Risk Banding"]
        B1["No Risk\nScore < 0.20"]
        B2["Low\n0.20 - 0.45"]
        B3["Moderate\n0.45 - 0.70"]
        B4["High\n> 0.70"]
    end

    subgraph OUTPUTS ["Downstream Actions"]
        GEN["Groq GenAI\nExplanation card\nand SMS body"]
        MAP["Live Hotspot Map\nGeohash tile color"]
        ALERT["Alert Feed\nSMS (High only)"]
    end

    A --> RF --> W1 --> ADD
    B --> CNN --> W2 --> ADD
    C --> ZSCORE --> W3 --> ADD
    ADD --> B1 & B2 & B3 & B4
    B3 & B4 --> GEN --> ALERT
    ADD --> MAP
```

---

## Regional Anomaly Detection - Z-Score Pipeline

```mermaid
flowchart LR
    subgraph COWS ["All Active Cows (last 7-14 days)"]
        C1["COW_001\ngeohash: tezpq"]
        C2["COW_002\ngeohash: tezpq"]
        C3["COW_003\ngeohash: tezpr"]
        CN["COW_N\ngeohash: tezps"]
    end

    subgraph BINS ["Geohash Cell Aggregation"]
        G1["Cell tezpq\nrate = 3/3 = 1.00"]
        G2["Cell tezpr\nrate = 1/4 = 0.25"]
        G3["Cell tezps\nrate = 0/5 = 0.00"]
    end

    STATS["mean = avg of all cell rates\nstd = std-dev of all cell rates\nMin cell count threshold = 3"]

    subgraph ZSCORE_CALC ["Z-Score per Cell"]
        Z1["tezpq: z = (1.00 - mean) / std -> HIGH"]
        Z2["tezpr: z = (0.25 - mean) / std -> NORMAL"]
        Z3["tezps: z = (0.00 - mean) / std -> LOW"]
    end

    NORM["Clip z in [-1, 3]\nMin-Max -> severity 0 to 1\nStored in geohash_stats"]

    NEW["New Cow in tezpq\n(otherwise healthy)"]
    BUMP["Joint score += 0.10 x severity\nEven if RF prob is low!\nNearby outbreak detected"]

    C1 & C2 --> G1
    C3 --> G2
    CN --> G3
    G1 & G2 & G3 --> STATS --> ZSCORE_CALC --> NORM
    NORM --> NEW --> BUMP
```

---

## GenAI Explanation Pipeline

```mermaid
sequenceDiagram
    participant JOINT as Joint Score Engine
    participant BUILDER as Prompt Builder
    participant GROQ as Groq API (Llama-3.1-8b-instant)
    participant DB as Supabase alerts
    participant SMS as TextBee
    participant UI as Dashboard Card

    JOINT->>BUILDER: {cow_id, ec, ph, milk_temp, scc, yield, clotting,\nrumination_rate, rf_probability, top_features,\ncnn_result, region_severity, joint_score, risk_tier}

    BUILDER->>GROQ: System: Dairy health assistant, max 40 words, plain language\nUser: Structured context with all above fields

    alt Groq responds OK
        GROQ-->>BUILDER: Cow EC is elevated and rumination dropped,\nearly mastitis signs. Separate her and call your vet today.
    else Groq timeout / error
        BUILDER-->>BUILDER: Fallback static template:\nRisk: High. EC={ec}, pH={ph}. Contact vet immediately.
    end

    BUILDER->>DB: INSERT alerts {message, sms_sent=false}

    alt risk_tier = High
        BUILDER->>SMS: POST TextBee webhook\n{phone: farmer_phone, body: message}
        SMS-->>BUILDER: 200 OK
        BUILDER->>DB: UPDATE alerts SET sms_sent=true
    end

    BUILDER-->>UI: Explanation card + risk badge
```

---

## Database Schema

```mermaid
erDiagram
    FARMS {
        uuid id PK
        text name
        float lat
        float lng
        text geohash
        text region
        text farmer_phone
        timestamptz created_at
    }
    COWS {
        uuid id PK
        uuid farm_id FK
        text breed
        int age
        int lactation_number
        text disease_history
        timestamptz created_at
    }
    SENSOR_READINGS {
        uuid id PK
        uuid cow_id FK
        float ec
        float ph
        float milk_temp
        int scc
        float yield_l
        text clotting
        int rumination_rate
        int known_label
        float gps_lat
        float gps_lng
        timestamptz recorded_at
    }
    TABULAR_PREDICTIONS {
        uuid id PK
        uuid cow_id FK
        uuid reading_id FK
        float rf_probability
        int rf_label
        jsonb top_features
        timestamptz created_at
    }
    IMAGE_PREDICTIONS {
        uuid id PK
        uuid cow_id FK
        text image_url
        boolean cnn_detected
        float cnn_confidence
        timestamptz created_at
    }
    GEOHASH_STATS {
        text geohash PK
        float recent_mastitis_rate
        int cow_count
        float zscore
        float severity
        timestamptz last_computed_at
    }
    JOINT_PREDICTIONS {
        uuid id PK
        uuid cow_id FK
        text geohash
        float rf_probability
        float cnn_score
        float regional_severity
        float joint_score
        text risk_tier
        timestamptz created_at
    }
    ALERTS {
        uuid id PK
        uuid cow_id FK
        uuid joint_prediction_id FK
        text type
        text message
        boolean sms_sent
        timestamptz created_at
    }

    FARMS ||--o{ COWS : "has"
    COWS ||--o{ SENSOR_READINGS : "produces"
    COWS ||--o{ TABULAR_PREDICTIONS : "has"
    COWS ||--o{ IMAGE_PREDICTIONS : "has"
    COWS ||--o{ JOINT_PREDICTIONS : "has"
    COWS ||--o{ ALERTS : "triggers"
    SENSOR_READINGS ||--o| TABULAR_PREDICTIONS : "generates"
    JOINT_PREDICTIONS ||--o| ALERTS : "creates"
```

