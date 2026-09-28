import { AppNav } from "@/components/app/app-nav";
import { StatusBar } from "@/components/app/status-bar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#060608] text-zinc-400 font-sans">
      <div className="fixed inset-0 bg-noise z-0 opacity-[0.015] pointer-events-none"></div>
      
      <AppNav />
      
      <main className="relative z-10 min-h-screen overflow-x-hidden pt-16 pb-12">
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <StatusBar />
    </div>
  );
}
