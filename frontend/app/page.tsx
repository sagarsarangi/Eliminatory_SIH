import { HeroAnimation } from "@/components/landing/hero-animation";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-white/30 selection:text-white flex flex-col justify-center items-center font-sans bg-grid">
      <main className="relative z-10 w-full flex flex-col items-center justify-center">
        <HeroAnimation />
      </main>
    </div>
  );
}
