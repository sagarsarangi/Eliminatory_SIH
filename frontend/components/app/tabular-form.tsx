"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { predictTabular, type TabularPrediction } from "@/lib/api";
import {
  Activity,
  Zap,
  Thermometer,
  Droplets,
  FlaskConical,
  Gauge,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CLOTTING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "slight", label: "Slight" },
  { value: "clots", label: "Clots (Severe)" },
];

const RISK_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType; bar: string }
> = {
  "No Risk": {
    label: "No Risk",
    color: "text-emerald-400",
    bg: "bg-emerald-950/60",
    border: "border-emerald-800/60",
    icon: CheckCircle2,
    bar: "bg-emerald-500",
  },
  Low: {
    label: "Low Risk",
    color: "text-yellow-400",
    bg: "bg-yellow-950/60",
    border: "border-yellow-800/60",
    icon: AlertCircle,
    bar: "bg-yellow-500",
  },
  Moderate: {
    label: "Moderate Risk",
    color: "text-orange-400",
    bg: "bg-orange-950/60",
    border: "border-orange-800/60",
    icon: AlertTriangle,
    bar: "bg-orange-500",
  },
  High: {
    label: "High Risk",
    color: "text-red-400",
    bg: "bg-red-950/60",
    border: "border-red-800/60",
    icon: XCircle,
    bar: "bg-red-500",
  },
};

const SENSOR_FIELDS = [
  {
    key: "ec",
    label: "Electrical Conductivity",
    unit: "mS/cm",
    placeholder: "6.8",
    icon: Zap,
    step: "0.01",
    hint: "Normal: 4–6 mS/cm",
  },
  {
    key: "ph",
    label: "Milk pH",
    unit: "pH",
    placeholder: "6.9",
    icon: FlaskConical,
    step: "0.01",
    hint: "Normal: 6.5–6.8",
  },
  {
    key: "milkTemp",
    label: "Milk Temperature",
    unit: "°C",
    placeholder: "38.5",
    icon: Thermometer,
    step: "0.1",
    hint: "Normal: 37–39°C",
  },
  {
    key: "scc",
    label: "Somatic Cell Count",
    unit: "cells/mL",
    placeholder: "450000",
    icon: Droplets,
    step: "1000",
    hint: "Threshold: >200k",
  },
  {
    key: "yieldL",
    label: "Milk Yield",
    unit: "L/session",
    placeholder: "12.4",
    icon: Gauge,
    step: "0.1",
    hint: "Baseline varies by breed",
  },
  {
    key: "ruminationRate",
    label: "Rumination Rate",
    unit: "cycles/min",
    placeholder: "42",
    icon: Activity,
    step: "1",
    hint: "Normal: 40–60/min",
  },
];

function RiskGauge({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const stroke = circ * (1 - probability);

  let gaugeColor = "#10b981";
  if (pct >= 70) gaugeColor = "#ef4444";
  else if (pct >= 45) gaugeColor = "#f97316";
  else if (pct >= 20) gaugeColor = "#eab308";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="hsl(240 3.7% 15.9%)"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="10"
            strokeDasharray={circ}
            strokeDashoffset={stroke}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono tabular-nums" style={{ color: gaugeColor }}>
            {pct}%
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">RF Score</span>
        </div>
      </div>
    </div>
  );
}

function FeatureTable({ features }: { features: { name: string; value: number; importance: number }[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium pl-0">
            Feature
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium text-right">
            Value
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium text-right pr-0">
            Weight
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {features.slice(0, 5).map((f) => {
          const pct = Math.round(f.importance * 100);
          return (
            <TableRow key={f.name} className="border-border/50">
              <TableCell className="pl-0 py-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-foreground font-medium capitalize">
                    {f.name.replace(/_/g, " ")}
                  </span>
                  <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full"
                      style={{
                        width: `${pct}%`,
                        transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                      }}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right py-2.5">
                <span className="text-xs font-mono text-muted-foreground">
                  {typeof f.value === "number" ? f.value.toFixed(2) : f.value}
                </span>
              </TableCell>
              <TableCell className="text-right py-2.5 pr-0">
                <span className="text-xs font-mono font-semibold text-foreground tabular-nums">
                  {pct}%
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function TabularForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TabularPrediction | null>(null);

  const [cowId, setCowId] = useState("");
  const [ec, setEc] = useState("");
  const [ph, setPh] = useState("");
  const [milkTemp, setMilkTemp] = useState("");
  const [scc, setScc] = useState("");
  const [yieldL, setYieldL] = useState("");
  const [clotting, setClotting] = useState("none");
  const [ruminationRate, setRuminationRate] = useState("");

  const values: Record<string, string> = {
    ec, ph, milkTemp, scc, yieldL, ruminationRate,
  };
  const setters: Record<string, (v: string) => void> = {
    ec: setEc, ph: setPh, milkTemp: setMilkTemp, scc: setScc, yieldL: setYieldL, ruminationRate: setRuminationRate,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const data = await predictTabular({
        ec: parseFloat(ec),
        ph: parseFloat(ph),
        milk_temp: parseFloat(milkTemp),
        scc: parseFloat(scc),
        yield_l: parseFloat(yieldL),
        clotting: clotting as "none" | "slight" | "clots",
        rumination_rate: ruminationRate ? parseFloat(ruminationRate) : undefined,
      });
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run analysis");
    } finally {
      setIsLoading(false);
    }
  }

  const risk = result ? (RISK_CONFIG[result.risk_tier] ?? RISK_CONFIG["No Risk"]) : null;
  const RiskIcon = risk?.icon;

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-zinc-800 bg-black overflow-hidden shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-zinc-800 bg-zinc-950/80">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 shadow-inner">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white tracking-wide">Milk Chemistry</h2>
          <p className="text-[13px] text-zinc-500 font-medium">Sensor & Lab Data</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-500"></span>
          </span>
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Model A</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Cow ID row */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cow-id-tabular" className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
              Cow Identifier
            </Label>
            <Input
              id="cow-id-tabular"
              placeholder="e.g. COW_014"
              value={cowId}
              onChange={(e) => setCowId(e.target.value)}
              className="h-11 bg-zinc-950 border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-white/20 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Sensor inputs as structured table */}
        <div className="border-t border-zinc-800/80 bg-black">
          <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-800/40">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Sensor Readings</span>
            <span className="text-xs text-zinc-600 font-medium tracking-wide">6 parameters</span>
          </div>
          <div className="divide-y divide-zinc-800/40">
            {SENSOR_FIELDS.map((field) => {
              const Icon = field.icon;
              return (
                <div
                  key={field.key}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-900/30 transition-colors group"
                >
                  <Icon className="w-4 h-4 text-zinc-600 shrink-0 group-hover:text-zinc-400 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={`field-${field.key}`}
                      className="text-[13px] font-medium text-zinc-300 cursor-pointer"
                    >
                      {field.label}
                    </Label>
                    <p className="text-[11px] text-zinc-500 mt-1">{field.hint}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      id={`field-${field.key}`}
                      type="number"
                      step={field.step}
                      placeholder={field.placeholder}
                      value={values[field.key]}
                      onChange={(e) => setters[field.key](e.target.value)}
                      required={field.key !== "ruminationRate"}
                      className="h-9 w-28 text-right bg-zinc-950 border-zinc-800 text-sm text-white font-mono placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-white/20 shadow-inner"
                    />
                    <span className="text-xs text-zinc-500 w-16 text-right shrink-0">
                      {field.unit}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Clotting row */}
            <div className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-900/30 transition-colors group">
              <Droplets className="w-4 h-4 text-zinc-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <Label className="text-[13px] font-medium text-zinc-300">Clotting Status</Label>
                <p className="text-[11px] text-zinc-500 mt-1">Visual milk quality indicator</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select value={clotting} onValueChange={(val) => setClotting(val || "none")}>
                  <SelectTrigger className="h-9 w-36 bg-zinc-950 border-zinc-800 text-sm text-white focus:ring-1 focus:ring-white/20 shadow-inner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    {CLOTTING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="focus:bg-zinc-900 focus:text-white">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="w-16" />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="px-6 py-5 border-t border-zinc-800 bg-zinc-950/80">
          <Button
            type="submit"
            className="w-full h-11 bg-white text-black hover:bg-zinc-200 font-semibold text-[13px] tracking-wide shadow-lg group active:scale-[0.98] transition-all"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                Processing Analysis...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Run Tabular Analysis
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Results panel */}
      {result && risk && RiskIcon && (
        <div className="border-t border-border bg-secondary/10">
          {/* Risk tier banner */}
          <div className={cn("flex items-center gap-3 px-6 py-4 border-b border-border/50", risk.bg)}>
            <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg border", risk.border)}>
              <RiskIcon className={cn("w-4 h-4", risk.color)} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Prediction Result</p>
              <p className={cn("text-base font-bold", risk.color)}>{risk.label}</p>
            </div>
            <RiskGauge probability={result.rf_probability} />
          </div>

          {/* Details table */}
          {result.top_features.length > 0 && (
            <div className="px-6 py-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Primary Risk Drivers
              </p>
              <FeatureTable features={result.top_features} />
            </div>
          )}

          {/* Binary verdict */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-border/30 bg-secondary/20">
            <span className="text-xs text-muted-foreground">Model verdict</span>
            <span className={cn("text-xs font-semibold font-mono", result.rf_label === 1 ? "text-red-400" : "text-emerald-400")}>
              {result.rf_label === 1 ? "MASTITIS POSITIVE" : "MASTITIS NEGATIVE"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
