"use client";

import { motion } from "framer-motion";
import { TrendingDown, AlertTriangle, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const PROBLEM_STATS = [
  {
    icon: DollarSign,
    value: "$200–$400",
    label: "Lost per cow",
    description: "Subclinical mastitis is the most costly disease in dairy production.",
    colSpan: "md:col-span-2",
  },
  {
    icon: AlertTriangle,
    value: "80%",
    label: "Undetected",
    description: "Most infections reach clinical stage before farmers notice symptoms.",
    colSpan: "md:col-span-1",
  },
  {
    icon: TrendingDown,
    value: "60%",
    label: "Cost reduction",
    description: "Early detection slashes treatment costs and prevents antibiotic overuse.",
    colSpan: "md:col-span-3",
  },
];

export function StatBento() {
  return (
    <section id="problem" className="py-32 px-6 max-w-7xl mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        className="mb-16"
      >
        <h2 className="text-4xl md:text-6xl font-serif text-white mb-6">The Silent Threat</h2>
        <p className="text-xl text-zinc-400 max-w-2xl font-light">
          Subclinical mastitis shows no visible symptoms — yet it devastates milk quality and farm economics.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PROBLEM_STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: i * 0.1 }}
            className={cn(
              "group rounded-3xl p-1 bg-white/5 ring-1 ring-white/5 hover:ring-white/10 transition-all duration-500",
              stat.colSpan
            )}
          >
            <div className="h-full rounded-[22px] bg-[#060608]/50 p-8  backdrop-blur-md flex flex-col justify-between">
              <div className="mb-12">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                  <stat.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-6xl font-serif text-white mb-2">{stat.value}</h3>
                <p className="text-lg font-medium text-white">{stat.label}</p>
              </div>
              <p className="text-zinc-400 font-light">{stat.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
