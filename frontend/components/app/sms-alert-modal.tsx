"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SmsModalState = "idle" | "sending" | "sent" | "failed";

interface SmsAlertModalProps {
  state: SmsModalState;
  cowId?: string;
  riskTier?: string;
  onClose: () => void;
}

const STATE_CONFIG = {
  sending: {
    icon: Loader2,
    iconClass: "animate-spin text-yellow-400",
    title: "Sending SMS Alert",
    body: "Notifying the farmer via TextBee...",
    border: "border-yellow-800/50",
    bg: "bg-yellow-950/30",
    dot: "bg-yellow-400",
  },
  sent: {
    icon: CheckCircle2,
    iconClass: "text-emerald-400",
    title: "SMS Alert Sent",
    body: "Farmer has been notified successfully.",
    border: "border-emerald-800/50",
    bg: "bg-emerald-950/30",
    dot: "bg-emerald-400",
  },
  failed: {
    icon: AlertTriangle,
    iconClass: "text-orange-400",
    title: "SMS Not Configured",
    body: "TextBee credentials missing — alert not sent.",
    border: "border-orange-800/50",
    bg: "bg-orange-950/30",
    dot: "bg-orange-400",
  },
  idle: {
    icon: MessageSquare,
    iconClass: "text-zinc-400",
    title: "",
    body: "",
    border: "border-zinc-800/50",
    bg: "bg-zinc-950",
    dot: "bg-zinc-400",
  },
};

export function SmsAlertModal({ state, cowId, riskTier, onClose }: SmsAlertModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state !== "idle") {
      setVisible(true);
      // Auto-dismiss "sent" and "failed" after 5 seconds
      if (state === "sent" || state === "failed") {
        const t = setTimeout(() => {
          setVisible(false);
          setTimeout(onClose, 400);
        }, 5000);
        return () => clearTimeout(t);
      }
    } else {
      setVisible(false);
    }
  }, [state, onClose]);

  const cfg = STATE_CONFIG[state];
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      {visible && state !== "idle" && (
        <motion.div
          key="sms-modal"
          initial={{ opacity: 0, x: 60, y: -20, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className={cn(
            "fixed top-5 right-5 z-[9999] w-[320px] rounded-2xl border shadow-2xl shadow-black/60 overflow-hidden",
            "backdrop-blur-xl bg-black/90",
            cfg.border
          )}
        >
          {/* Ambient tint strip */}
          <div className={cn("h-[2px] w-full", cfg.dot)} />

          <div className="p-4 flex flex-col gap-3">
            {/* Header row */}
            <div className="flex items-start gap-3">
              <div className={cn("flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border", cfg.bg, cfg.border)}>
                <Icon className={cn("w-4 h-4", cfg.iconClass)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">{cfg.title}</p>
                <p className="text-[12px] text-zinc-400 mt-0.5">{cfg.body}</p>
              </div>
              <button
                onClick={() => { setVisible(false); setTimeout(onClose, 400); }}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cow / risk tag */}
            {(cowId || riskTier) && (
              <div className="flex items-center gap-2 pl-12">
                {cowId && (
                  <span className="text-[11px] font-mono font-semibold text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                    {cowId}
                  </span>
                )}
                {riskTier && (
                  <span className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                    riskTier === "High"
                      ? "bg-red-950/50 text-red-400 border-red-800/50"
                      : "bg-orange-950/50 text-orange-400 border-orange-800/50"
                  )}>
                    {riskTier} Risk
                  </span>
                )}
              </div>
            )}

            {/* Sending pulse bar */}
            {state === "sending" && (
              <div className="pl-12">
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full animate-[pulse_1.2s_ease-in-out_infinite] w-2/3" />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
