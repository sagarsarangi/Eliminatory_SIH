'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Sparkles, RefreshCw, Brain, Activity, FlaskConical } from 'lucide-react';
import { JointScoreBar } from './joint-score-bar';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Cow {
  cow_id: string;
  farm: string;
  breed: string;
  joint_score: number;
  risk_tier: string;
  rf_prob: number;
  cnn_score: number;
  anomaly_severity: number;
  last_updated: string;
  rf_label: number;
}

interface SensorReading {
  ec: number;
  ph: number;
  milk_temp: number;
  rumination_rate: number | null;
  recorded_at: string;
  tabular_predictions?: Array<{
    rf_probability: number;
    rf_label: number;
    top_features: Array<{ name: string; importance: number }>;
  }>;
  image_predictions?: Array<{ cnn_detected: boolean; cnn_confidence: number }>;
  joint_predictions?: Array<{
    joint_score: number;
    risk_tier: string;
    rf_probability: number;
    regional_severity: number;
  }>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function fetchCowHistory(cowId: string): Promise<SensorReading[]> {
  const res = await fetch(`${API_BASE}/api/cows/${cowId}/history`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function callExplainAPI(payload: object): Promise<string> {
  const res = await fetch('/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.explanation) throw new Error('Empty explanation returned');
  return data.explanation;
}

function buildPayload(cow: Cow, history: SensorReading[]) {
  const latest      = history[0] ?? {};
  const latestTab   = (latest as SensorReading).tabular_predictions?.[0];
  const latestImg   = (latest as SensorReading).image_predictions?.[0];
  const latestJoint = (latest as SensorReading).joint_predictions?.[0];

  return {
    cow_id:    cow.cow_id,
    risk_tier: latestJoint?.risk_tier    ?? cow.risk_tier,
    joint_score: latestJoint?.joint_score ?? cow.joint_score,
    sensor_data: {
      ec:              (latest as SensorReading).ec              ?? null,
      ph:              (latest as SensorReading).ph              ?? null,
      milk_temp:       (latest as SensorReading).milk_temp       ?? null,
      rumination_rate: (latest as SensorReading).rumination_rate ?? null,
      scc: null, yield_l: null, clotting: null,
    },
    rf_features:       latestTab?.top_features?.map((f) => f.name) ?? [],
    rf_prob:           latestTab?.rf_probability ?? cow.rf_prob,
    cnn_result:        latestImg
                         ? { detected: latestImg.cnn_detected, confidence: latestImg.cnn_confidence }
                         : null,
    regional_severity: latestJoint?.regional_severity ?? cow.anomaly_severity,
  };
}

const riskBg: Record<string, string> = {
  High:     'bg-red-950/40 border-red-900/60 text-red-400',
  Moderate: 'bg-orange-950/30 border-orange-900/50 text-orange-400',
  Low:      'bg-yellow-950/20 border-yellow-900/40 text-yellow-400',
  'No Risk':'bg-emerald-950/20 border-emerald-900/40 text-emerald-400',
};

const riskGradient: Record<string, string> = {
  High:     'from-red-500/15 via-transparent to-red-500/5',
  Moderate: 'from-orange-500/15 via-transparent to-orange-500/5',
  Low:      'from-yellow-500/10 via-transparent to-yellow-500/5',
  'No Risk':'from-emerald-500/10 via-transparent to-emerald-500/5',
};

// ─── Component ─────────────────────────────────────────────────────────────

export function CowDrawer({
  cow,
  isOpen,
  onClose,
}: {
  cow: Cow | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [history,        setHistory]        = useState<SensorReading[]>([]);
  const [explanation,    setExplanation]    = useState<string>('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainError,   setExplainError]   = useState<string | null>(null);
  const generatingFor = useRef<string | null>(null);

  const generateExplanation = useCallback(async (h: SensorReading[], forCow: Cow) => {
    setLoadingExplain(true);
    setExplainError(null);
    setExplanation('');
    try {
      const text = await callExplainAPI(buildPayload(forCow, h));
      setExplanation(text);
    } catch (e: unknown) {
      setExplainError(e instanceof Error ? e.message : 'Failed to generate explanation');
    } finally {
      setLoadingExplain(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !cow) {
      setHistory([]);
      setExplanation('');
      setExplainError(null);
      generatingFor.current = null;
      return;
    }
    if (generatingFor.current === cow.cow_id) return;
    generatingFor.current = cow.cow_id;

    // Fire explanation immediately with what we know
    generateExplanation([], cow);

    // Load history in parallel for sensor readings grid
    (async () => {
      setLoadingHistory(true);
      try {
        const h = await fetchCowHistory(cow.cow_id);
        setHistory(h);
      } catch {
        // history is optional — don't block the UI
      } finally {
        setLoadingHistory(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cow?.cow_id]);

  const tierClass    = riskBg[cow?.risk_tier ?? 'No Risk'] ?? riskBg['No Risk'];
  const gradientClass = riskGradient[cow?.risk_tier ?? 'No Risk'] ?? riskGradient['No Risk'];
  const latest       = history[0];

  return (
    <AnimatePresence>
      {isOpen && cow && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-full max-w-lg bg-[#060608] border-l border-t border-zinc-800/50 shadow-2xl z-50 flex flex-col overflow-y-auto"
          >
            {/* ── Header ── */}
            <div className="sticky top-0 bg-[#060608]/95 backdrop-blur-md z-10 border-b border-zinc-800/50 px-5 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-zinc-100 tracking-tight">{cow.cow_id}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{cow.breed} · {cow.farm}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="p-5 flex flex-col gap-5 pb-10">

              {/* Risk + timestamp row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex flex-col gap-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Risk Tier</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md w-fit border uppercase tracking-widest ${tierClass}`}>
                    {cow.risk_tier}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex flex-col gap-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Last Updated</span>
                  <span className="text-xs font-medium text-zinc-300 leading-snug">{cow.last_updated}</span>
                </div>
              </div>

              {/* Score Breakdown */}
              <section>
                <SectionHeader icon={<Activity className="w-3.5 h-3.5" />} label="Score Breakdown" />
                <div className="mt-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30">
                  <JointScoreBar
                    jointScore={cow.joint_score}
                    rfProb={cow.rf_prob}
                    cnnScore={cow.cnn_score}
                    anomalySeverity={cow.anomaly_severity}
                  />
                </div>
              </section>

              {/* ── AI Assessment — full width, dominant ── */}
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <SectionHeader icon={<Brain className="w-3.5 h-3.5" />} label="AI Assessment" />
                  {!loadingExplain && (
                    <button
                      onClick={() => generateExplanation(history, cow)}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  )}
                </div>

                {/* Card */}
                <div className={`relative p-[1px] rounded-2xl bg-gradient-to-br ${gradientClass}`}>
                  <div className="bg-[#09090b]/95 backdrop-blur-md rounded-2xl p-5 flex flex-col gap-4">

                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-[11px] font-semibold tracking-wider uppercase">
                          Groq · Qwen 3
                        </span>
                      </div>
                      {loadingExplain && (
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-[11px]">Analysing…</span>
                        </div>
                      )}
                    </div>

                    {/* Explanation text */}
                    {loadingExplain && (
                      <div className="space-y-2">
                        <div className="h-3 bg-zinc-800/60 rounded-full w-full animate-pulse" />
                        <div className="h-3 bg-zinc-800/60 rounded-full w-5/6 animate-pulse" />
                        <div className="h-3 bg-zinc-800/60 rounded-full w-4/6 animate-pulse" />
                      </div>
                    )}

                    {explainError && !loadingExplain && (
                      <p className="text-sm text-red-400">{explainError}</p>
                    )}

                    {explanation && !loadingExplain && (
                      <div className="flex flex-col gap-3">
                        {/* Split into sentences and render each as its own paragraph for breathing room */}
                        {explanation
                          .split(/(?<=[.!?])\s+/)
                          .filter(Boolean)
                          .map((sentence, i) => (
                            <p
                              key={i}
                              className={`text-sm leading-relaxed ${
                                i === 0
                                  ? 'text-zinc-100 font-medium'  // first sentence prominent
                                  : 'text-zinc-400'               // subsequent sentences softer
                              }`}
                            >
                              {sentence}
                            </p>
                          ))}
                      </div>
                    )}

                    {/* Context pill row — shown always, reflects live cow data */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-800/50">
                      <ContextPill label="Joint Score" value={`${(cow.joint_score * 100).toFixed(0)}%`} />
                      <ContextPill label="RF Prob" value={`${(cow.rf_prob * 100).toFixed(1)}%`} />
                      <ContextPill
                        label="Regional"
                        value={cow.anomaly_severity > 0.5 ? 'Hotspot' : 'Normal'}
                        highlight={cow.anomaly_severity > 0.5}
                      />
                      {cow.cnn_score > 0 && (
                        <ContextPill label="CNN" value={`${(cow.cnn_score * 100).toFixed(0)}%`} />
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Latest sensor readings — shown once history loads */}
              {!loadingHistory && latest && (
                <section>
                  <SectionHeader icon={<FlaskConical className="w-3.5 h-3.5" />} label="Latest Reading" />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      { label: 'EC',         value: latest.ec              != null ? `${latest.ec.toFixed(2)} mS/cm`       : '—' },
                      { label: 'pH',         value: latest.ph              != null ? latest.ph.toFixed(2)                  : '—' },
                      { label: 'Milk Temp',  value: latest.milk_temp       != null ? `${latest.milk_temp.toFixed(1)} °C`   : '—' },
                      { label: 'Rumination', value: latest.rumination_rate != null ? `${latest.rumination_rate}/min`       : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/30">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</p>
                        <p className="text-sm font-semibold text-zinc-200 mt-0.5 font-mono">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500">{icon}</span>
      <h3 className="text-sm font-semibold text-zinc-300">{label}</h3>
    </div>
  );
}

function ContextPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${
      highlight
        ? 'bg-red-950/40 border-red-900/50 text-red-400'
        : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-400'
    }`}>
      <span className="text-zinc-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}
