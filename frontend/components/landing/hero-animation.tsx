"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";

export function HeroAnimation() {
  return (
    <section className="relative w-full px-6 flex flex-col items-center justify-center text-center max-w-4xl mx-auto min-h-screen">
      <div className="space-y-6 flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-tight">
          MooSense: AI-Enabled <br className="hidden md:block" />
          Bovine Mastitis Forecasting
        </h1>

        <p className="max-w-2xl text-base md:text-lg text-zinc-400 leading-relaxed font-normal">
          IoT + AI system that predicts subclinical mastitis 7-14 days before clinical symptoms appear, using milk sensor data, cow behavior, and a teat-image CNN classifier.
        </p>

        <div className="pt-8 flex flex-col items-center space-y-12">
          <Link 
            href="/app/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#f4f4f5] px-8 text-sm font-medium text-black hover:bg-white transition-colors"
          >
            Open Live Dashboard 
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>

          <button className="text-xs text-zinc-500 flex items-center gap-1 hover:text-zinc-300 transition-colors">
            Explore System Architecture <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    </section>
  );
}
