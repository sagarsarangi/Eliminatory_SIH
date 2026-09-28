"use client";

import { useEffect, useRef } from "react";
import { Map, Popup, Marker, setWorkerUrl } from "maplibre-gl";
import { Layers, Plus, Minus } from "lucide-react";

setWorkerUrl("https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl-worker.mjs");



export default function MapClient() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [85.3, 23.35],
      zoom: 8,
      attributionControl: false
    });

    const currentMap = map.current;

    currentMap.on('load', async () => {
      if (!map.current) return; // Prevent crash if unmounted before load
      
      try {
        const [hotspotsRes, farmsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/map/hotspots`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/map/farms`)
        ]);
        const hotspotsData = await hotspotsRes.json();
        const farmsData = await farmsRes.json();

        // 1. GeoJSON Source for Hotspots
        currentMap.addSource('hotspots', {
          type: 'geojson',
          data: hotspotsData
        });

        // 2. Hotspot Circle Layer
        currentMap.addLayer({
          id: 'hotspot-circles',
          type: 'circle',
          source: 'hotspots',
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['get', 'severity'],
              0, 20,
              1, 70
            ],
            'circle-color': [
              'interpolate', ['linear'], ['get', 'severity'],
              0, 'rgba(34, 197, 94, 0.1)',    // green
              0.5, 'rgba(234, 179, 8, 0.25)', // yellow
              1, 'rgba(239, 68, 68, 0.35)'    // red
            ],
            'circle-blur': 0.6,
            'circle-stroke-width': 0
          }
        });

        // 3. Add Farm Markers via Custom HTML
        farmsData.forEach((farm: any) => {
          const el = document.createElement('div');
          el.className = 'w-4 h-4 rounded-full border-[1.5px] border-black/80 shadow-lg cursor-pointer flex items-center justify-center relative';

          let bgColor = 'bg-zinc-500';
          
          if (farm.risk === 'High') { bgColor = 'bg-red-500'; }
          else if (farm.risk === 'Moderate') { bgColor = 'bg-orange-500'; }
          else if (farm.risk === 'Low') { bgColor = 'bg-yellow-400'; }
          else if (farm.risk === 'No Risk') { bgColor = 'bg-green-500'; }

          el.classList.add(bgColor);

          // Popup HTML
          const popupHTML = `
            <div class="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 min-w-[200px] font-sans shadow-2xl backdrop-blur-xl">
              <h3 class="font-semibold text-sm mb-1">${farm.name}</h3>
              <div class="flex items-center gap-2 mb-3">
                <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold text-black ${bgColor.replace('bg-', 'bg-')}">${farm.risk}</span>
                <span class="text-xs text-zinc-400">Score: ${(farm.joint_score * 100).toFixed(0)}%</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs border-t border-zinc-800/80 pt-2">
                <div class="flex flex-col">
                  <span class="text-zinc-500">Total Cows</span>
                  <span class="font-medium">${farm.cows}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-zinc-500">Flagged</span>
                  <span class="font-medium ${farm.high_risk_count > 0 ? 'text-red-400' : 'text-zinc-300'}">${farm.high_risk_count}</span>
                </div>
              </div>
              <a href="/app/dashboard" class="mt-3 block w-full text-center py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium rounded-lg text-zinc-300 transition-colors">
                View Farm Details
              </a>
            </div>
          `;

          const popup = new Popup({ offset: 15, closeButton: false, className: 'glass-popup' })
            .setHTML(popupHTML);

          new Marker({ element: el })
            .setLngLat([farm.lng, farm.lat])
            .setPopup(popup)
            .addTo(currentMap);
        });
      } catch(e) {
        console.error("Failed to fetch map data", e);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const zoomIn = () => map.current?.zoomIn();
  const zoomOut = () => map.current?.zoomOut();

  return (
    <div className="relative w-full h-full min-h-[400px] flex-1 bg-black rounded-xl overflow-hidden">
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />

      {/* Floating Glass Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <div className="p-1 rounded-xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-md shadow-xl">
          <div className="flex flex-col rounded-lg bg-zinc-950/80 border border-zinc-800/80 overflow-hidden divide-y divide-zinc-800/80">
            <button onClick={zoomIn} className="p-2 hover:bg-zinc-800 transition-colors text-zinc-300">
              <Plus size={18} />
            </button>
            <button onClick={zoomOut} className="p-2 hover:bg-zinc-800 transition-colors text-zinc-300">
              <Minus size={18} />
            </button>
          </div>
        </div>

        <div className="p-1 rounded-xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-md mt-2 shadow-xl">
          <button className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 hover:bg-zinc-800 transition-colors text-zinc-300">
            <Layers size={18} />
          </button>
        </div>
      </div>

      {/* Global CSS overrides for MapLibre Popups to match OLED theme */}
      <style dangerouslySetInnerHTML={{__html: `
        .glass-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .glass-popup .maplibregl-popup-tip {
          display: none;
        }
        .maplibregl-ctrl-bottom-right, .maplibregl-ctrl-bottom-left {
          display: none !important; /* Hide default attributions for clean look */
        }
      `}} />
    </div>
  );
}
