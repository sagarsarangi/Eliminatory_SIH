"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { predictImage, type ImagePrediction } from "@/lib/api";
import {
  Camera,
  Upload,
  ImageIcon,
  ChevronRight,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ConfidenceArc({ confidence, detected }: { confidence: number; detected: boolean }) {
  const pct = Math.round(confidence * 100);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * confidence;
  const accentColor = detected ? "#ef4444" : "#10b981";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="hsl(240 3.7% 15.9%)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={accentColor}
            strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl font-bold font-mono tabular-nums"
            style={{ color: accentColor }}
          >
            {pct}%
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
            conf.
          </span>
        </div>
      </div>
    </div>
  );
}

export function ImageForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImagePrediction | null>(null);
  const [cowId, setCowId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  function clearFile() {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a teat image");
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const data = await predictImage(selectedFile, cowId || undefined);
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to analyze image");
    } finally {
      setIsLoading(false);
    }
  }

  const sizeKb = selectedFile ? Math.round(selectedFile.size / 1024) : null;

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-zinc-800 bg-black overflow-hidden shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-zinc-800 bg-zinc-950/80">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 shadow-inner">
          <Camera className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white tracking-wide">Teat Image Analysis</h2>
          <p className="text-[13px] text-zinc-500 font-medium">Visual Mastitis Detection</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-500"></span>
          </span>
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Model B</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Cow ID */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="cow-id-image"
              className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest"
            >
              Cow Identifier <span className="normal-case text-zinc-600">(optional)</span>
            </Label>
            <Input
              id="cow-id-image"
              placeholder="e.g. COW_014"
              value={cowId}
              onChange={(e) => setCowId(e.target.value)}
              className="h-11 bg-zinc-950 border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-white/20 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Upload zone */}
        <div className="border-t border-zinc-800/80 px-6 py-5 bg-black">
          <Label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest block mb-4">
            Teat Image Upload
          </Label>

          {previewUrl ? (
            <div className="relative rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Selected teat image preview"
                className="w-full max-h-64 object-contain"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                <button
                  type="button"
                  onClick={clearFile}
                  className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 text-xs font-semibold bg-white border border-zinc-200 rounded-full px-4 py-2 text-black hover:bg-zinc-200 shadow-lg"
                >
                  <X className="w-3.5 h-3.5" />
                  Change Image
                </button>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-950/80">
                <div className="flex items-center gap-2 min-w-0">
                  <ImageIcon className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="text-xs text-zinc-400 font-medium truncate">{selectedFile?.name}</span>
                </div>
                {sizeKb && (
                  <span className="text-[11px] text-zinc-500 font-mono shrink-0 ml-2">
                    {sizeKb} KB
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950",
                "flex flex-col items-center justify-center gap-4 py-14 px-6",
                "cursor-pointer transition-all duration-300",
                "hover:border-zinc-600 hover:bg-zinc-900/50"
              )}
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 shadow-sm">
                <Upload className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-white">Click to upload image</p>
                <p className="text-[11px] text-zinc-500 mt-1">JPG, PNG, WEBP accepted (max 5MB)</p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Submit */}
        <div className="px-6 py-5 border-t border-zinc-800 bg-zinc-950/80">
          <Button
            type="submit"
            className="w-full h-11 bg-white text-black hover:bg-zinc-200 font-semibold text-[13px] tracking-wide shadow-lg group active:scale-[0.98] transition-all"
            disabled={isLoading || !selectedFile}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                Analyzing Image...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Run Visual Analysis
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Results panel */}
      {result && (
        <div className="border-t border-border">
          <div
            className={cn(
              "flex items-center gap-4 px-6 py-4",
              result.detected
                ? "bg-red-950/40 border-b border-red-900/40"
                : "bg-emerald-950/40 border-b border-emerald-900/40"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-lg border",
                result.detected
                  ? "border-red-800/60 bg-red-950/60"
                  : "border-emerald-800/60 bg-emerald-950/60"
              )}
            >
              {result.detected ? (
                <XCircle className="w-4 h-4 text-red-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                CNN Verdict
              </p>
              <p
                className={cn(
                  "text-base font-bold",
                  result.detected ? "text-red-400" : "text-emerald-400"
                )}
              >
                {result.detected ? "Mastitis Detected" : "No Mastitis Detected"}
              </p>
            </div>
            <ConfidenceArc confidence={result.confidence} detected={result.detected} />
          </div>

          {/* CNN score breakdown */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">CNN Score</p>
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {(result.cnn_score * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground/60">mastitis probability</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {(result.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground/60">model certainty</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-3 border-t border-border/30 bg-secondary/20">
            <span className="text-xs text-muted-foreground">
              Visual symptom signal will contribute 20% to the joint risk score
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
