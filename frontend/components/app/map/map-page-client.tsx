"use client";

import dynamic from "next/dynamic";
import { RegionalRanking } from "./regional-ranking";
import { MapPin } from "lucide-react";

// Dynamically import MapLibre to completely avoid SSR DOM issues
const MapClient = dynamic(() => import("./map-client"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-950 border border-zinc-800/50 rounded-xl animate-pulse">
      <MapPin className="text-zinc-700 mb-3" size={32} />
      <span className="text-zinc-500 font-medium text-sm">Initializing Ethereal Glass Map...</span>
    </div>
  )
});

export function MapPageClient() {
  return (
    <div className="w-full flex flex-col lg:flex-row gap-4 lg:p-2 bg-black overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
      {/* 60% Map Left */}
      <div className="w-full lg:w-[60%] h-[50vh] lg:h-full relative z-0">
        {/* Double bezel for map */}
        <div className="h-full w-full p-1 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
          <div className="h-full w-full rounded-xl bg-zinc-950 border border-zinc-800/80 overflow-hidden relative">
            <MapClient />
          </div>
        </div>
      </div>

      {/* 40% Panels Right */}
      <div className="w-full lg:w-[40%] flex flex-col gap-4 h-[calc(100vh-theme(spacing.16)-2rem)] lg:h-full">
        <div className="h-full min-h-[600px] lg:min-h-0">
          <RegionalRanking />
        </div>
      </div>
    </div>
  );
}
