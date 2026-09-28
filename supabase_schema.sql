-- MooSense Database Schema

-- Enable PostGIS for future geographic querying (optional but good practice for geospatial)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Farms Table
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    geohash TEXT,
    region TEXT,
    farmer_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Cows Table
CREATE TABLE cows (
    id TEXT PRIMARY KEY, -- Using TEXT to support formats like 'COW_014'
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    breed TEXT,
    age INTEGER,
    lactation_number INTEGER,
    disease_history TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Sensor Readings (Raw Data)
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cow_id TEXT REFERENCES cows(id) ON DELETE CASCADE,
    ec DOUBLE PRECISION NOT NULL,
    ph DOUBLE PRECISION NOT NULL,
    milk_temp DOUBLE PRECISION NOT NULL,
    scc DOUBLE PRECISION,
    yield_l DOUBLE PRECISION,
    clotting TEXT DEFAULT 'none',
    rumination_rate DOUBLE PRECISION,
    known_label INTEGER,
    gps_lat DOUBLE PRECISION,
    gps_lng DOUBLE PRECISION,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabular Predictions (RF Output)
CREATE TABLE tabular_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cow_id TEXT REFERENCES cows(id) ON DELETE CASCADE,
    reading_id UUID REFERENCES sensor_readings(id) ON DELETE SET NULL,
    rf_probability DOUBLE PRECISION NOT NULL,
    rf_label INTEGER NOT NULL,
    top_features JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Image Predictions (CNN Output)
CREATE TABLE image_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cow_id TEXT REFERENCES cows(id) ON DELETE CASCADE,
    image_url TEXT,
    cnn_detected BOOLEAN NOT NULL,
    cnn_confidence DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Geohash Stats (Rolling Regional Anomaly)
CREATE TABLE geohash_stats (
    geohash TEXT PRIMARY KEY,
    recent_mastitis_rate DOUBLE PRECISION NOT NULL,
    cow_count INTEGER NOT NULL,
    zscore DOUBLE PRECISION NOT NULL,
    severity DOUBLE PRECISION NOT NULL,
    last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Joint Predictions (Final Fused Score)
CREATE TABLE joint_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cow_id TEXT REFERENCES cows(id) ON DELETE CASCADE,
    geohash TEXT,
    rf_probability DOUBLE PRECISION NOT NULL,
    cnn_score DOUBLE PRECISION,
    regional_severity DOUBLE PRECISION,
    joint_score DOUBLE PRECISION NOT NULL,
    risk_tier TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Alerts (SMS Tracking)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cow_id TEXT REFERENCES cows(id) ON DELETE CASCADE,
    joint_prediction_id UUID REFERENCES joint_predictions(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'high_risk',
    message TEXT NOT NULL,
    sms_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) setup (optional for Phase 2, but good to have)
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE cows ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabular_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE geohash_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Anonymous users (Dashboard readers) can read everything
CREATE POLICY anon_read_farms ON farms FOR SELECT USING (true);
CREATE POLICY anon_read_cows ON cows FOR SELECT USING (true);
CREATE POLICY anon_read_readings ON sensor_readings FOR SELECT USING (true);
CREATE POLICY anon_read_tabular ON tabular_predictions FOR SELECT USING (true);
CREATE POLICY anon_read_image ON image_predictions FOR SELECT USING (true);
CREATE POLICY anon_read_geohash ON geohash_stats FOR SELECT USING (true);
CREATE POLICY anon_read_joint ON joint_predictions FOR SELECT USING (true);
CREATE POLICY anon_read_alerts ON alerts FOR SELECT USING (true);

-- Backend service role (FastAPI) will bypass RLS anyway because of the service_role key
