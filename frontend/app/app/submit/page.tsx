import { Suspense } from "react";
import { UnifiedForm } from "@/components/app/unified-form";
import { Activity, FlaskConical } from "lucide-react";

function FormSkeleton({ lines = 8 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 animate-pulse w-full max-w-2xl mx-auto">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-800 bg-zinc-900/30">
        <div className="w-9 h-9 rounded-lg bg-zinc-800" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-36 rounded bg-zinc-800" />
          <div className="h-3 w-48 rounded bg-zinc-800/60" />
        </div>
      </div>
      {/* Row skeletons */}
      <div className="divide-y divide-zinc-800/60">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-3.5">
            <div className="w-4 h-4 rounded bg-zinc-800 shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3.5 w-32 rounded bg-zinc-800" />
              <div className="h-2.5 w-24 rounded bg-zinc-800/50" />
            </div>
            <div className="h-8 w-28 rounded-md bg-zinc-800 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pt-6 text-white font-sans">
      {/* Page hero minimal */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <h1 className="text-xl font-medium tracking-tight text-white flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-zinc-500" />
          Diagnostic Input
        </h1>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400 bg-black border border-white/10 px-3 py-1 rounded-full shadow-sm">
            <Activity className="w-3 h-3 text-zinc-500" />
            <span>Joint Fusion (100%)</span>
          </div>
        </div>
      </div>

      <div className="w-full">
        <Suspense fallback={<FormSkeleton lines={10} />}>
          <UnifiedForm />
        </Suspense>
      </div>
    </div>
  );
}
