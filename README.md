# MooSense - AI-Enabled Bovine Mastitis Forecasting System

## Overview

MooSense is an IoT + AI system that predicts subclinical mastitis in dairy cattle **7-14 days before clinical symptoms appear**. It fuses multiple data streams: milk sensor data, cow behavior, teat-image classification, and time-series anomaly detection into a single joint risk score. 

The system leverages a Generative AI layer to explain complex predictions in simple language to farmers, surfacing this through a web app with a dashboard, a live disease map, an open API, and real-time SMS alerts.

## System Architecture

The project is built on a highly decoupled architecture separating the UI, Machine Learning serving layer, and the Database/IoT integration.

```mermaid
flowchart TD
    subgraph IoT Edge [IoT Hardware Sim]
        ESP[ESP32 Wokwi Sim]
        S1(EC Probe) --> ESP
        S2(pH Probe) --> ESP
        S3(DS18B20 Temp) --> ESP
        S4(MPU6050 Gyro) --> ESP
        S5(GPS) --> ESP
    end

    subgraph Frontend [Next.js Full-Stack App]
        UI[React Dashboard & MapLibre]
        API_Routes[Next.js API Routes / Server Actions]
        UI <--> API_Routes
    end

    subgraph Backend [FastAPI ML Backend]
        RF[Tabular Classifier \n Random Forest]
        CNN[Image CNN \n PyTorch]
        Hotspot[Anomaly Detector \n Z-Score]
        GenAI[GenAI Explainer \n Groq API]
    end

    subgraph Data & Comms [Services]
        Supa[(Supabase PostgreSQL)]
        Storage[(Supabase Storage)]
        SMS[TextBee SMS]
    end

    ESP -- JSON over WiFi --> Backend
    API_Routes -- REST API --> Backend
    Backend --> Supa
    Backend --> Storage
    Backend --> SMS
    Backend -- Prompt --> GenAI
    GenAI -- Explanation --> Backend
    Supa -- Realtime Subscription --> UI
```

## Core ML Pillars & Joint Score Computation

The prediction engine relies on **three models** combining to form a unified Joint Risk Score:

1. **Tabular Risk Classifier (Random Forest):** Analyzes EC, pH, milk temp, SCC, yield, coagulation, and rumination-derived activity score.
2. **Image-Based Detector (CNN):** PyTorch-based model (MobileNetV2/ResNet18) that classifies teat images for visual symptoms.
3. **Anomaly Detector (Z-Score):** Computes geohash-binned regional mastitis rates to identify geographical outbreaks.

### Joint Score Logic

The backend fuses these models into a final score:
```mermaid
flowchart LR
    RF[Random Forest Probability] -- 70% Weight --> Fusion((Joint Score Engine))
    CNN[CNN Confidence Score] -- 20% Weight --> Fusion
    ANOM[Regional Hotspot Z-Score] -- 10% Weight --> Fusion
    
    Fusion -- "< 20%" --> L1[No Risk]
    Fusion -- "20-45%" --> L2[Low Risk]
    Fusion -- "45-70%" --> L3[Moderate Risk]
    Fusion -- "> 70%" --> L4[High Risk]
    
    L4 -- Triggers --> SMS[SMS Alert & Groq Explanation]
```

## Technology Stack

| Component | Technology |
|---|---|
| **Frontend UI** | Next.js (React), Tailwind CSS, MapLibre GL JS, Recharts |
| **Backend API (ML)** | FastAPI (Python) |
| **Machine Learning** | scikit-learn (RandomForest), PyTorch & torchvision (CNN) |
| **Generative AI** | Groq API (Llama models) for farmer-friendly explanations |
| **Database** | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| **Hardware / IoT** | Simulated ESP32 via Wokwi, MPU6050, DS18B20, Probes, NEO-6M |
| **Alerts** | TextBee (SMS Gateway) |
| **Deployment** | Vercel (Next.js), Render/Railway/Fly.io (FastAPI) |
