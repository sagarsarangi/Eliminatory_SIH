"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ingestSensorData, getLatestSensorReading, getLatestJointResult, type JointPrediction, type HardwareResult } from "@/lib/api";
import { SmsAlertModal, type SmsModalState } from "@/components/app/sms-alert-modal";
import {
  Activity,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Upload,
  X,
  ImageIcon,
  Wifi,
  WifiOff,
  MapPin,
  Zap,
  FlaskConical,
  Thermometer,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Sensor field config ───────────────────────────────────────────────────────
const SENSOR_FIELDS = [
  {
    key: "ec",
    label: "Electrical Conductivity",
    unit: "mS/cm",
    placeholder: "e.g. 6.8",
    step: "0.01",
    icon: Zap,
    hint: "Normal: 4–6 mS/cm",
  },
  {
    key: "ph",
    label: "Milk pH",
    unit: "pH",
    placeholder: "e.g. 6.9",
    step: "0.01",
    icon: FlaskConical,
    hint: "Normal: 6.5–6.8",
  },
  {
    key: "milk_temp",
    label: "Milk Temperature",
    unit: "°C",
    placeholder: "e.g. 38.9",
    step: "0.1",
    icon: Thermometer,
    hint: "Normal: 37–39°C",
  },
  {
    key: "ruminationRate",
    label: "Rumination Rate",
    unit: "/min",
    placeholder: "e.g. 42",
    step: "1",
    icon: RotateCcw,
    hint: "Normal: 40–60/min",
  },
];

// ─── Risk config ───────────────────────────────────────────────────────────────
const RISK_CONFIG = {
  "No Risk": { color: "text-emerald-400", border: "border-emerald-800/60", bg: "bg-emerald-950/40", icon: CheckCircle2, bar: "bg-emerald-500" },
  Low: { color: "text-yellow-400", border: "border-yellow-800/60", bg: "bg-yellow-950/40", icon: AlertCircle, bar: "bg-yellow-500" },
  Moderate: { color: "text-orange-400", border: "border-orange-800/60", bg: "bg-orange-950/40", icon: AlertTriangle, bar: "bg-orange-500" },
  High: { color: "text-red-400", border: "border-red-800/60", bg: "bg-red-950/40", icon: XCircle, bar: "bg-red-500" },
} as const;

// ─── Live indicator ───────────────────────────────────────────────────────────
function LiveDot({ active }: { active: boolean }) {
  return (
    <span className="flex h-2 w-2 relative">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={cn("relative inline-flex rounded-full h-2 w-2", active ? "bg-emerald-400" : "bg-zinc-600")} />
    </span>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score);
  const color = pct >= 70 ? "#ef4444" : pct >= 45 ? "#f97316" : pct >= 20 ? "#eab308" : "#10b981";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 90 90" className="w-full h-full -rotate-90">
          <circle cx="45" cy="45" r={r} fill="none" stroke="hsl(240 3.7% 15.9%)" strokeWidth="8" />
          <circle
            cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold font-mono tabular-nums" style={{ color }}>{pct}%</span>
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">{label}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function UnifiedForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<JointPrediction | null>(null);

  // ── Form state ──
  const [cowId, setCowId] = useState("COW_014");
  const [values, setValues] = useState<Record<string, string>>({
    ec: "", ph: "", milk_temp: "", ruminationRate: "",
  });

  // ── GPS / Location state (single field — auto-fills from hardware, editable manually) ──
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");

  // ── Hardware polling ──
  const [hwConnected, setHwConnected] = useState(false);
  const [lastHwReceived, setLastHwReceived] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Image state ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Hardware result state — tracks whether the displayed result came from an API/hardware POST ──
  const [resultFromHardware, setResultFromHardware] = useState(false);
  const [hwImageSubmitted, setHwImageSubmitted] = useState(false); // was an image sent in the hw POST?

  // ── SMS modal state ──
  const [smsState, setSmsState] = useState<SmsModalState>("idle");

  // ── Polling for hardware sensor data ──
  const pollLatest = useCallback(async () => {
    try {
      const reading = await getLatestSensorReading();
      if (reading) {
        // Auto-fill form fields
        setValues({
          ec: reading.ec?.toString() ?? "",
          ph: reading.ph?.toString() ?? "",
          milk_temp: reading.milk_temp?.toString() ?? "",
          ruminationRate: reading.rumination_rate?.toString() ?? "",
        });
        if (reading.cow_id) setCowId(reading.cow_id);
        // Auto-fill GPS directly (user can still override manually)
        if (reading.gps_lat !== null && reading.gps_lat !== undefined) {
          setGpsLat(reading.gps_lat.toString());
        }
        if (reading.gps_lng !== null && reading.gps_lng !== undefined) {
          setGpsLng(reading.gps_lng.toString());
        }
        setHwConnected(true);
        setLastHwReceived(new Date(reading.received_at).toLocaleTimeString());
        setAutoFilled(true);
        toast.success("Hardware data received — form auto-filled", { duration: 3000 });
        // Flash-clear the auto-fill indicator after 4s
        setTimeout(() => setAutoFilled(false), 4000);
      }
    } catch {
      // Silently fail — hardware not connected
      setHwConnected(false);
    }
  }, []);

  useEffect(() => {
    pollingRef.current = setInterval(pollLatest, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollLatest]);

  // ── Poll for full joint result from hardware/API POST ──
  useEffect(() => {
    const pollResult = async () => {
      try {
        const hwResult = await getLatestJointResult();
        if (hwResult) {
          // Show the full result panel — same as if the user submitted the form
          setResult(hwResult as JointPrediction);
          setResultFromHardware(true);
          setHwImageSubmitted(hwResult.image_was_submitted);
          
          if (hwResult.hw_image_base64) {
            setPreviewUrl(hwResult.hw_image_base64);
          }

          router.refresh();
          toast.success(`Hardware analysis complete — ${hwResult.risk_tier} risk`, { duration: 4000 });
          // Trigger SMS modal for moderate/high risk
          if (hwResult.risk_tier === "Moderate" || hwResult.risk_tier === "High") {
            setSmsState("sending");
            setTimeout(() => setSmsState("sent"), 2500);
          }
        }
      } catch {
        // Silently fail
      }
    };
    const id = setInterval(pollResult, 3000);
    return () => clearInterval(id);
  }, [router]);


  const handleFieldChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large. Max 5MB."); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cowId) { toast.error("Cow ID is required"); return; }
    if (!values.ec || !values.ph || !values.milk_temp) {
      toast.error("EC, pH, and Milk Temperature are required");
      return;
    }

    setIsLoading(true);
    setResult(null);
    setSmsState("idle");

    try {
      const lat = gpsLat ? parseFloat(gpsLat) : undefined;
      const lng = gpsLng ? parseFloat(gpsLng) : undefined;

      const res = await ingestSensorData({
        cow_id: cowId,
        ec: parseFloat(values.ec),
        ph: parseFloat(values.ph),
        milk_temp: parseFloat(values.milk_temp),
        rumination_rate: values.ruminationRate ? parseFloat(values.ruminationRate) : undefined,
        gps_lat: lat,
        gps_lng: lng,
        image: selectedFile,
      });

      setResult(res);
      setResultFromHardware(false); // this result came from the form, not hardware
      toast.success("Analysis complete — dashboard updating");

      // Trigger SMS modal for moderate/high risk
      if (res.risk_tier === "Moderate" || res.risk_tier === "High") {
        setSmsState("sending");
        // Give backend ~2s to process SMS, then mark sent
        setTimeout(() => setSmsState("sent"), 2500);
      }

      // Refresh dashboard and map simultaneously
      router.refresh();

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit data");
      if (smsState === "sending") setSmsState("failed");
    } finally {
      setIsLoading(false);
    }
  };

  const risk = result ? (RISK_CONFIG[result.risk_tier as keyof typeof RISK_CONFIG] ?? RISK_CONFIG["No Risk"]) : null;
  const RiskIcon = risk?.icon;

  return (
    <>
      {/* SMS Alert Modal (top-right fixed) */}
      <SmsAlertModal
        state={smsState}
        cowId={result?.cow_id}
        riskTier={result?.risk_tier}
        onClose={() => setSmsState("idle")}
      />

      <div className="flex flex-col gap-0 rounded-2xl border border-zinc-800 bg-black overflow-hidden shadow-xl backdrop-blur-xl w-full max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 shadow-inner">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">Unified Submission</h2>
            <p className="text-[13px] text-zinc-500 font-medium">Sensor Data · Teat Image · GPS</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Hardware connection status */}
            <div className={cn(
              "flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all",
              hwConnected
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            )}>
              <LiveDot active={hwConnected} />
              {hwConnected ? (
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> Hardware
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <WifiOff className="w-3 h-3" /> Awaiting Device
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Auto-fill notification strip ── */}
        {autoFilled && (
          <div className="flex items-center gap-3 px-6 py-2.5 bg-emerald-950/30 border-b border-emerald-800/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <p className="text-[12px] text-emerald-400 font-medium">
              Form auto-filled from hardware data
              {lastHwReceived && <span className="text-emerald-600 ml-1">— received at {lastHwReceived}</span>}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col">

          {/* ── Cow ID ── */}
          <div className="px-6 pt-6 pb-5 border-b border-zinc-800/80">
            <div className="flex flex-col gap-2 max-w-sm">
              <Label htmlFor="cow-id" className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                Cow Identifier
              </Label>
              <Input
                id="cow-id"
                placeholder="e.g. COW_014"
                value={cowId}
                onChange={(e) => setCowId(e.target.value)}
                className="h-11 bg-zinc-950 border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-white/20 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* ── Main grid: Sensor | Image ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800/80 bg-black">

            {/* LEFT: Sensor inputs */}
            <div className="flex flex-col">
              <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-800/40">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Sensor Readings</span>
                {hwConnected && (
                  <span className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">Live from Hardware</span>
                )}
              </div>
              <div className="divide-y divide-zinc-800/40 flex-1">
                {SENSOR_FIELDS.map((field) => {
                  const Icon = field.icon;
                  const isAutoFilled = autoFilled && values[field.key] !== "";
                  return (
                    <div
                      key={field.key}
                      className={cn(
                        "flex items-center gap-4 px-6 py-4 hover:bg-zinc-900/30 transition-colors group",
                        isAutoFilled && "bg-emerald-950/10"
                      )}
                    >
                      <Icon className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isAutoFilled ? "text-emerald-600" : "text-zinc-600 group-hover:text-zinc-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={`field-${field.key}`} className="text-[13px] font-medium text-zinc-300 cursor-pointer">
                          {field.label}
                        </Label>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{field.hint}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          id={`field-${field.key}`}
                          type="number"
                          step={field.step}
                          placeholder={field.placeholder}
                          value={values[field.key]}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          required={field.key !== "ruminationRate"}
                          className={cn(
                            "h-9 w-28 text-right bg-zinc-950 border-zinc-800 text-sm text-white font-mono placeholder:text-zinc-700",
                            "focus-visible:ring-1 focus-visible:ring-white/20 shadow-inner transition-all",
                            isAutoFilled && "border-emerald-800/60 ring-1 ring-emerald-800/30"
                          )}
                        />
                        <span className="text-xs text-zinc-500 w-14 text-right shrink-0">{field.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: Image upload */}
            <div className="flex flex-col px-6 py-5 gap-4">
              <Label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest block">
                Teat Image <span className="text-zinc-700 normal-case">(Optional)</span>
              </Label>

              {previewUrl ? (
                <div className="relative rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950 group flex-1 min-h-[200px] flex flex-col justify-between">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Teat preview" className="w-full flex-1 max-h-56 object-contain" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                    <button
                      type="button"
                      onClick={clearFile}
                      className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 text-xs font-semibold bg-white border border-zinc-200 rounded-full px-4 py-2 text-black hover:bg-zinc-200 shadow-lg"
                    >
                      <X className="w-3.5 h-3.5" /> Change
                    </button>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 border-t border-zinc-800 bg-zinc-950/80">
                    <ImageIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="text-xs text-zinc-400 truncate">{selectedFile?.name}</span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex-1 min-h-[200px] rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950",
                    "flex flex-col items-center justify-center gap-3 py-12 px-6",
                    "cursor-pointer transition-all duration-300 hover:border-zinc-600 hover:bg-zinc-900/50"
                  )}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800">
                    <Upload className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-white">Click to upload teat image</p>
                    <p className="text-[11px] text-zinc-500 mt-1">JPG, PNG, WEBP · max 5MB</p>
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          {/* ── GPS / Location section ── */}
          <div className="border-t border-zinc-800/80 bg-zinc-950/40">
            <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-800/40">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-zinc-500" />
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Location</span>
              </div>
              {/* No toggle — single lat/lng always visible; auto-filled by hardware, editable manually */}
              {hwConnected && (gpsLat || gpsLng) && (
                <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">
                  Auto-filled from hardware
                </span>
              )}
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="gps-lat" className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                    Latitude
                  </Label>
                  <Input
                    id="gps-lat"
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 22.8046"
                    value={gpsLat}
                    onChange={(e) => setGpsLat(e.target.value)}
                    className={cn(
                      "h-10 bg-zinc-950 border-zinc-800 text-sm text-white font-mono placeholder:text-zinc-600",
                      "focus-visible:ring-1 focus-visible:ring-white/20 shadow-inner",
                      autoFilled && gpsLat && "border-emerald-800/60 ring-1 ring-emerald-800/30"
                    )}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="gps-lng" className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                    Longitude
                  </Label>
                  <Input
                    id="gps-lng"
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 86.2029"
                    value={gpsLng}
                    onChange={(e) => setGpsLng(e.target.value)}
                    className={cn(
                      "h-10 bg-zinc-950 border-zinc-800 text-sm text-white font-mono placeholder:text-zinc-600",
                      "focus-visible:ring-1 focus-visible:ring-white/20 shadow-inner",
                      autoFilled && gpsLng && "border-emerald-800/60 ring-1 ring-emerald-800/30"
                    )}
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-600 mt-2">
                Leave blank to skip location. Auto-fills from ESP32 hardware when connected.
              </p>
            </div>
          </div>


          {/* ── Submit ── */}
          <div className="px-6 py-5 border-t border-zinc-800 bg-zinc-950/80">
            <Button
              type="submit"
              className="w-full h-11 bg-white text-black hover:bg-zinc-200 font-semibold text-[13px] tracking-wide shadow-lg group active:scale-[0.98] transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  Running Analysis...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Submit Analysis
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </Button>
            <p className="text-[11px] text-zinc-600 text-center mt-2">
              Results update dashboard & map in real-time · SMS sent on Moderate/High risk
            </p>
          </div>
        </form>

        {/* ── Results panel ── */}
        {result && risk && RiskIcon && (
          <div className="border-t border-zinc-800 bg-zinc-950/50">
            {/* Risk banner */}
            <div className={cn("flex items-center gap-4 px-6 py-5 border-b border-zinc-800/50", risk.bg)}>
              <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl border", risk.border)}>
                <RiskIcon className={cn("w-5 h-5", risk.color)} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Joint Risk Assessment</p>
                <p className={cn("text-lg font-bold", risk.color)}>
                  {result.risk_tier === "No Risk" ? "No Risk" : `${result.risk_tier} Risk`}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <ScoreRing score={result.joint_score} label="Joint" />
                <ScoreRing score={result.rf_probability} label="RF Model" />
                {result.cnn_score !== null && (
                  <ScoreRing score={result.cnn_score} label="CNN" />
                )}
              </div>
            </div>

            {/* Score breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-zinc-800/60 border-b border-zinc-800/60">
              {[
                { label: "Joint Score", value: `${(result.joint_score * 100).toFixed(1)}%` },
                { label: "RF Score", value: `${(result.rf_probability * 100).toFixed(1)}%` },
                { label: "CNN Score", value: result.cnn_score !== null ? `${(result.cnn_score * 100).toFixed(1)}%` : "—" },
                { label: "Regional Severity", value: result.anomaly_severity !== null ? `${(result.anomaly_severity * 100).toFixed(1)}%` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="px-6 py-4 flex flex-col gap-1">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">{label}</p>
                  <p className="text-base font-bold text-white font-mono">{value}</p>
                </div>
              ))}
            </div>

            {/* Weight breakdown */}
            <div className="px-6 py-3 flex items-center gap-6 border-b border-zinc-800/40">
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Weights</span>
              {[
                { label: "RF", w: result.rf_weight },
                { label: "CNN", w: result.cnn_weight },
                { label: "Regional", w: result.anomaly_weight },
              ].map(({ label, w }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-[11px] text-zinc-400 font-medium">{label}</span>
                  <span className="text-[11px] font-mono text-white">{Math.round(w * 100)}%</span>
                </div>
              ))}
            </div>

            {/* Teat image + CNN verdict */}
            {(previewUrl || (resultFromHardware && hwImageSubmitted)) && result.cnn_score !== null && (
              <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800/40">
                {/* Thumbnail: actual preview (from file upload OR base64 from API), fallback to icon */}
                <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Submitted teat" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="w-5 h-5 text-zinc-500" />
                      <span className="text-[8px] text-zinc-600 font-medium uppercase tracking-wide">API</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
                    Teat Image · CNN Analysis
                    {resultFromHardware && (
                      <span className="ml-2 text-blue-500 normal-case">via hardware POST</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    {result.cnn_score >= 0.5 ? (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span className={cn(
                      "text-sm font-semibold",
                      result.cnn_score >= 0.5 ? "text-red-400" : "text-emerald-400"
                    )}>
                      {result.cnn_score >= 0.5 ? "Mastitis Detected" : "Not Detected"}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      ({(result.cnn_score * 100).toFixed(1)}% confidence)
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 truncate">
                    {resultFromHardware ? "Image received and analyzed from API request" : selectedFile?.name}
                  </p>
                </div>
              </div>
            )}

            {/* Live update note */}
            <div className="flex items-center gap-2 px-6 py-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <p className="text-[11px] text-zinc-500">Dashboard &amp; Map updated with this prediction</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
