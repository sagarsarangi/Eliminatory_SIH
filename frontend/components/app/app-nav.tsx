"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/app/submit", label: "Submit Data" },
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/map", label: "Map" },
];

export function AppNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isApiOnline, setIsApiOnline] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:8000/health");
        setIsApiOnline(res.ok);
      } catch {
        setIsApiOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-auto">
        <div className="backdrop-blur-xl bg-black border border-white/10 rounded-full px-3 py-2 shadow-2xl flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 pl-2">
            <span className="font-semibold text-sm text-white tracking-tight">MooSense</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium tracking-wider uppercase rounded-full transition-all duration-300",
                    isActive
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/10"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-4 pr-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {/* Removed ping animation */}
                <span className={cn("relative inline-flex rounded-full h-2 w-2", isApiOnline ? "bg-white" : "bg-red-500")}></span>
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden relative w-5 h-5 flex flex-col justify-center items-center gap-1.5 ml-2 mr-1"
          >
            <span className={cn("w-full h-0.5 bg-zinc-400 transition-all duration-300 origin-center", isOpen ? "translate-y-2 rotate-45" : "")} />
            <span className={cn("w-full h-0.5 bg-zinc-400 transition-all duration-300", isOpen ? "opacity-0" : "")} />
            <span className={cn("w-full h-0.5 bg-zinc-400 transition-all duration-300 origin-center", isOpen ? "-translate-y-2 -rotate-45" : "")} />
          </button>
        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-40 backdrop-blur-3xl bg-black/80 md:hidden flex flex-col items-center justify-center">
          <nav className="flex flex-col items-center gap-8">
            {NAV_LINKS.map((link, i) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "text-2xl font-medium tracking-wider uppercase transition-colors duration-300",
                    isActive ? "text-white" : "text-zinc-500"
                  )}
                >
                  <div 
                    className="animate-in slide-in-from-bottom-4 fade-in duration-500 fill-mode-forwards"
                    style={{ animationDelay: `${75 * (i + 1)}ms` }}
                  >
                    {link.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
