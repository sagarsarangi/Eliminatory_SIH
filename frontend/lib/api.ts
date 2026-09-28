const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// --- Types ---

export interface LatestSensorReading {
  cow_id: string;
  ec: number;
  ph: number;
  milk_temp: number;
  rumination_rate: number | null;
  gps_lat: number | null;
  gps_lng: number | null;
  received_at: string;
}

export interface TabularInput {
  ec: number;
  ph: number;
  milk_temp: number;
  scc: number;
  yield_l: number;
  clotting: 'none' | 'slight' | 'clots';
  rumination_rate?: number;
  known_label?: number;
}

export interface TopFeature {
  name: string;
  value: number;
  importance: number;
}

export interface TabularPrediction {
  rf_probability: number;
  rf_label: number;
  top_features: TopFeature[];
  risk_tier: string;
}

export interface ImagePrediction {
  detected: boolean;
  confidence: number;
  cnn_score: number;
}

export interface JointScoreInput {
  cow_id: string;
  rf_probability: number;
  cnn_score?: number;
  anomaly_severity?: number;
}

export interface JointPrediction {
  cow_id: string;
  joint_score: number;
  risk_tier: string;
  rf_probability: number;
  cnn_score: number | null;
  anomaly_severity: number | null;
  rf_weight: number;
  cnn_weight: number;
  anomaly_weight: number;
}

export interface CowRegisterInput {
  cow_id: string;
  farm_name: string;
  breed?: string;
  age?: number;
  lactation_number?: number;
  disease_history?: string;
  farmer_phone?: string;
  lat?: number;
  lng?: number;
}

// --- API Functions ---

export async function predictTabular(data: TabularInput): Promise<TabularPrediction> {
  const res = await fetch(`${API_BASE}/api/predict/tabular`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function predictImage(file: File, cowId?: string): Promise<ImagePrediction> {
  const formData = new FormData();
  formData.append('file', file);
  if (cowId) formData.append('cow_id', cowId);

  const res = await fetch(`${API_BASE}/api/predict/image`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function predictJoint(data: JointScoreInput): Promise<JointPrediction> {
  const res = await fetch(`${API_BASE}/api/predict/joint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getCowHistory(cowId: string) {
  const res = await fetch(`${API_BASE}/api/cows/${cowId}/history`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function registerCow(data: CowRegisterInput) {
  const res = await fetch(`${API_BASE}/api/cows/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getHotspots() {
  const res = await fetch(`${API_BASE}/api/map/hotspots`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getRecentAlerts(limit = 20) {
  const res = await fetch(`${API_BASE}/api/alerts/recent?limit=${limit}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getAllCows() {
  const res = await fetch(`${API_BASE}/api/cows`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}



export async function ingestSensorData(data: {
  cow_id: string;
  ec: number;
  ph: number;
  milk_temp: number;
  rumination_rate?: number;
  gps_lat?: number;
  gps_lng?: number;
  image?: File | null;
}): Promise<JointPrediction> {
  const formData = new FormData();
  formData.append('cow_id', data.cow_id);
  formData.append('ec', data.ec.toString());
  formData.append('ph', data.ph.toString());
  formData.append('milk_temp', data.milk_temp.toString());
  
  if (data.rumination_rate !== undefined) formData.append('rumination_rate', data.rumination_rate.toString());
  if (data.gps_lat !== undefined) formData.append('gps_lat', data.gps_lat.toString());
  if (data.gps_lng !== undefined) formData.append('gps_lng', data.gps_lng.toString());
  if (data.image) formData.append('image', data.image);

  const res = await fetch(`${API_BASE}/api/ingest/sensor`, {
    method: 'POST',
    body: formData,
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getLatestSensorReading(): Promise<LatestSensorReading | null> {
  const res = await fetch(`${API_BASE}/api/ingest/latest`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.reading ?? null;
}

export interface HardwareResult extends JointPrediction {
  cnn_detected: boolean;
  cnn_confidence: number | null;
  image_was_submitted: boolean;
  hw_image_base64?: string;
  source: string;
}

export async function getLatestJointResult(): Promise<HardwareResult | null> {
  const res = await fetch(`${API_BASE}/api/ingest/latest-result`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}
