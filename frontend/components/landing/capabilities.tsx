"use client";

import { motion } from "framer-motion";
import { Activity, Camera, MapPin, Bell } from "lucide-react";

const CAPABILITIES = [
  { icon: Activity, title: "Real-time Monitoring", description: "Continuous sensor telemetry from ESP32 devices streamed to the dashboard." },
  { icon: Camera, title: "Image Analysis", description: "CNN-based teat image classifier detects visual mastitis indicators." },
  { icon: MapPin, title: "Regional Hotspot", description: "Geohash-based anomaly detection flags outbreak zones early." },
  { icon: Bell, title: "SMS Alerts", description: "AI-generated plain-language alerts sent directly to the farmer." },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="py-32 px-6 max-w-7xl mx-auto relative z-10 border-t border-white/5">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        className="mb-16"
      >
        <h2 className="text-4xl md:text-6xl font-serif text-white mb-6">System Capabilities</h2>
        <p className="text-xl text-zinc-400 max-w-2xl font-light">
          Five independent pillars, one joint risk score.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {CAPABILITIES.map((cap, i) => (
          <motion.div
            key={cap.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: i * 0.1 }}
          >
            <div className="rounded-3xl p-1 bg-white/5 ring-1 ring-white/5 h-full">
              <div className="h-full rounded-[22px] bg-[#060608]/50 p-8  backdrop-blur-md">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                  <cap.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">{cap.title}</h3>
                <p className="text-zinc-400 font-light text-sm leading-relaxed">{cap.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
