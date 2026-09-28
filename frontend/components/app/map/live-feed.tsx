"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface Alert {
  id: string;
  cow_id: string;
  risk_tier: string;
  message: string;
  sms_sent: boolean;
  created_at: string;
}

export function LiveFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Initial fetch using dynamic import to avoid static analyzer issues
    import("@/lib/api").then(({ getRecentAlerts }) => {
      getRecentAlerts(20).then(data => {
        if (data && data.length > 0) setAlerts(data as Alert[]);
      }).catch(console.error);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any;
    import("@/lib/supabase").then(({ supabase }) => {
      // Use random channel name to avoid Next.js hot-reload conflicts
      const channelName = `alerts-${Math.random()}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'alerts' },
          (payload: { new: Alert }) => setAlerts(prev => [payload.new, ...prev].slice(0, 20))
        )
        .subscribe();
    });
      
    return () => { 
      if (channel) {
        import("@/lib/supabase").then(({ supabase }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase.removeChannel(channel as any);
        });
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col p-1 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
      <div className="h-full flex flex-col rounded-xl bg-zinc-950 border border-zinc-800/80 overflow-hidden relative">
        <div className="p-4 lg:p-5 border-b border-zinc-800/80 flex items-center justify-between z-10 bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
            <ShieldAlert size={16} className="text-zinc-500" />
            Live Alert Feed
          </h2>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-md border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] uppercase tracking-wider text-green-400 font-bold">Listening</span>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-3 scrollbar-hide relative z-0"
          style={{ 
            maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', 
            WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' 
          }}
        >
          <AnimatePresence initial={false}>
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto', marginBottom: 12 }}
                className="group border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm rounded-lg p-3.5 hover:bg-zinc-900/80 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                        alert.risk_tier === 'High' ? 'bg-red-500' :
                        alert.risk_tier === 'Moderate' ? 'bg-orange-500' :
                        'bg-yellow-400'
                    }`} />
                    <span className="text-xs font-bold text-zinc-200 font-mono">{alert.cow_id}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">{alert.created_at}</span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed mb-3 pr-2">
                  {alert.message}
                </p>

                <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/50">
                  <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ${
                    alert.risk_tier === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    alert.risk_tier === 'Moderate' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    'bg-zinc-800/50 text-zinc-400 border border-zinc-700'
                  }`}>
                    {alert.risk_tier} Risk
                  </span>

                  {alert.sms_sent ? (
                    <div className="flex items-center gap-1 text-[10px] text-green-400/80 font-medium">
                      <CheckCircle2 size={12} />
                      <span>SMS Delivered</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                      <AlertCircle size={12} />
                      <span>No SMS</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
