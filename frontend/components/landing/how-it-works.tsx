"use client";

import { motion } from "framer-motion";

const HOW_IT_WORKS_STEPS = [
  { step: "01", title: "Sensor Data", description: "ESP32 reads milk EC, pH, temperature, and cow rumination patterns in real time" },
  { step: "02", title: "AI Analysis", description: "Random Forest and CNN models analyze milk chemistry and teat images independently" },
  { step: "03", title: "Risk Score", description: "A joint weighted score fuses both signals with regional outbreak data for a final risk tier" },
  { step: "04", title: "Instant Alert", description: "High-risk cows trigger an SMS alert with a plain-language explanation and recommended action" },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 px-6 max-w-7xl mx-auto relative z-10 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        className="mb-24 text-center"
      >
        <h2 className="text-4xl md:text-6xl font-serif text-white mb-6">How It Works</h2>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-light">
          Four stages from sensor to action
        </p>
      </motion.div>

      <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-4 relative perspective-1000">
        {HOW_IT_WORKS_STEPS.map((step, i) => (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, y: 100, rotateY: 20, z: -100 }}
            whileInView={{ opacity: 1, y: 0, rotateY: 0, z: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.32, 0.72, 0, 1], delay: i * 0.15 }}
            className="w-full md:w-1/4"
          >
            <div className="group rounded-3xl p-1 bg-white/5 ring-1 ring-white/5 hover:ring-white/10 transition-all duration-500 transform hover:-translate-y-4 hover:scale-105">
              <div className="h-full rounded-[22px] bg-[#060608]/80 p-8  backdrop-blur-xl flex flex-col justify-between min-h-[320px]">
                <div>
                  <span className="text-6xl font-serif text-white/10 group-hover:text-emerald-500/20 transition-colors duration-500 block mb-6">{step.step}</span>
                  <h3 className="text-2xl font-serif text-white mb-4">{step.title}</h3>
                </div>
                <p className="text-zinc-400 font-light leading-relaxed">{step.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
