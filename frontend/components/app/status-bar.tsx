"use client";

import { useState, useEffect } from "react";

export function StatusBar() {
  const [time, setTime] = useState<string>("");
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:8000/health");
        setIsBackendOnline(res.ok);
      } catch {
        setIsBackendOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-6 bg-black/80 backdrop-blur-sm border-t border-white/5 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isBackendOnline ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
          </span>
          Backend: {isBackendOnline ? 'Online' : 'Offline'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
          </span>
          ESP32 Sim: Active
        </span>
      </div>
      <div className="text-[10px] font-mono text-zinc-400 tabular-nums tracking-widest">
        {time}
      </div>
    </div>
  );
}
