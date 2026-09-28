"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, MapPin } from "lucide-react";

export function RegionalRanking() {
  const [hotspots, setHotspots] = useState<any[]>([]);

  useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/map/hotspots`);
        const data = await res.json();
        if (data.features) {
          const formatted = data.features.map((f: any) => ({
            geohash: f.properties.geohash,
            zscore: f.properties.zscore,
            severity: f.properties.severity,
            recent_mastitis_rate: f.properties.recent_mastitis_rate,
            cow_count: f.properties.cow_count,
            region_name: f.properties.region_name || "Unknown Region"
          }));
          setHotspots(formatted);
        }
      } catch (e) {
        console.error("Error fetching hotspots", e);
      }
    };
    
    fetchHotspots();
    const interval = setInterval(fetchHotspots, 5000); // Polling for live updates
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col p-1 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
      <div className="h-full flex flex-col rounded-xl bg-zinc-950 border border-zinc-800/80 overflow-hidden relative p-4 lg:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
            <MapPin size={16} className="text-zinc-500" />
            Regional Hotspots
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800 shadow-inner">
            Live
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {hotspots.sort((a,b) => b.zscore - a.zscore).map((region) => (
            <div key={region.geohash} className="group relative p-3 rounded-lg border border-zinc-800/50 bg-zinc-900/20 hover:bg-zinc-900/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-sm font-medium text-zinc-200">{region.region_name}</h3>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">{region.geohash} • {region.cow_count} cows</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                    region.zscore > 2 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    region.zscore > 1 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    'bg-zinc-800/50 text-zinc-400 border border-zinc-700'
                }`}>
                  {region.zscore > 1 && <AlertTriangle size={10} />}
                  Z: {region.zscore > 0 ? '+' : ''}{region.zscore.toFixed(1)}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5 font-medium uppercase tracking-wide">
                  <span>Incidence Rate</span>
                  <span className={region.recent_mastitis_rate > 0.5 ? 'text-red-400/80' : ''}>
                    {(region.recent_mastitis_rate * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                        region.severity > 0.8 ? 'bg-red-500' :
                        region.severity > 0.5 ? 'bg-orange-500' :
                        'bg-zinc-500'
                    }`}
                    style={{ width: `${Math.max(region.severity * 100, 2)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
