"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function FloatingNav() {
  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
      className="fixed top-4 left-0 right-0 z-40 mx-auto max-w-fit rounded-full backdrop-blur-xl bg-black/50 border border-white/10 px-6 py-3 flex items-center justify-between gap-8"
    >
      <Link href="/" className="font-semibold text-sm text-white tracking-wide">
        MooSense
      </Link>
      
      <div className="hidden md:flex items-center gap-6">
        <Link href="/app/dashboard" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          Dashboard
        </Link>
        <Link href="/app/map" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          Live Map
        </Link>
        <Link href="/app/submit" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          Submit Reading
        </Link>
      </div>

      <Link
        href="/app/dashboard"
        className="hidden md:inline-flex items-center justify-center rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black hover:bg-zinc-200 transition-colors"
      >
        Open App
      </Link>
    </motion.nav>
  );
}
