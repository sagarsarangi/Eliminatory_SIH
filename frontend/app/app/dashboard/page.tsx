import { HerdTable } from '@/components/app/dashboard/herd-table';
import { Activity, AlertTriangle, CheckCircle2, Factory, Minus, TrendingUp } from 'lucide-react';
import { getAllCows } from '@/lib/api';
import { RealtimeRefresher } from '@/components/app/dashboard/realtime-refresher';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let cowsData = [];
  try {
    cowsData = await getAllCows();
  } catch (error) {
    console.error('Failed to fetch cows:', error);
  }

  interface RawJointPrediction {
    joint_score: number;
    risk_tier: string;
    rf_probability: number;
    cnn_score?: number;
    regional_severity?: number;
    created_at: string;
  }

  interface RawCow {
    id: string;
    breed?: string;
    joint_predictions?: RawJointPrediction[];
    farms?: { name: string };
  }

  const formattedCows = (cowsData as RawCow[]).map((cow) => {
    // Sort by created_at descending, take the latest prediction
    const predictions = cow.joint_predictions ?? [];
    const sorted = [...predictions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const jp = sorted.length > 0 ? sorted[0] : null;
    const farmName = cow.farms ? cow.farms.name : 'Unknown Farm';

    return {
      cow_id: cow.id,
      farm: farmName,
      breed: cow.breed || 'Unknown',
      joint_score: jp ? jp.joint_score : 0,
      risk_tier: jp ? jp.risk_tier : 'No Risk',
      rf_prob: jp ? jp.rf_probability : 0,
      cnn_score: jp && jp.cnn_score ? jp.cnn_score : 0,
      anomaly_severity: jp ? (jp.regional_severity ?? 0) : 0,
      last_updated: jp ? new Date(jp.created_at).toLocaleString() : new Date().toLocaleString(),
      rf_label: jp && jp.rf_probability > 0.5 ? 1 : 0,
    };
  }).sort((a, b) => b.joint_score - a.joint_score);

  const highRiskCount     = formattedCows.filter((c) => c.risk_tier === 'High').length;
  const moderateRiskCount = formattedCows.filter((c) => c.risk_tier === 'Moderate').length;
  const lowRiskCount      = formattedCows.filter((c) => c.risk_tier === 'Low').length;
  const noRiskCount       = formattedCows.filter((c) => c.risk_tier === 'No Risk').length;

  return (
    <div className="w-full text-white font-sans relative overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">

        {/* Header */}
        <div className="flex flex-col gap-1 pb-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
              <Activity className="w-5 h-5 text-zinc-400" />
              Herd Surveillance
            </h1>
            <div className="flex items-center gap-2 border border-white/10 rounded-full px-3 py-1 bg-black">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium tracking-widest uppercase">System Online</span>
            </div>
          </div>
          <p className="text-sm text-zinc-500 font-normal">Live mastitis risk monitoring across all active regions.</p>
        </div>

        {/* Stats Row — 5 cards: total + 4 tiers */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Total Monitored"
            value={formattedCows.length.toString()}
            icon={<Factory className="w-4 h-4 text-zinc-500" />}
          />
          <StatCard
            title="High Risk"
            value={highRiskCount.toString()}
            icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
            accent="red"
          />
          <StatCard
            title="Moderate Risk"
            value={moderateRiskCount.toString()}
            icon={<TrendingUp className="w-4 h-4 text-orange-500" />}
            accent="orange"
          />
          <StatCard
            title="Low Risk"
            value={lowRiskCount.toString()}
            icon={<Minus className="w-4 h-4 text-yellow-500" />}
            accent="yellow"
          />
          <StatCard
            title="No Risk"
            value={noRiskCount.toString()}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            accent="green"
          />
        </div>

        {/* Table */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-white">Active Herd Status</h2>
          <HerdTable cows={formattedCows} />
        </div>
      </div>
      <RealtimeRefresher />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent?: 'red' | 'orange' | 'yellow' | 'green';
}) {
  const accentBorder = {
    red:    'hover:border-red-900/60',
    orange: 'hover:border-orange-900/60',
    yellow: 'hover:border-yellow-900/60',
    green:  'hover:border-emerald-900/60',
  };
  const accentText = {
    red:    'text-red-400',
    orange: 'text-orange-400',
    yellow: 'text-yellow-400',
    green:  'text-emerald-400',
  };

  return (
    <div
      className={`rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6 flex flex-col gap-4 shadow-sm backdrop-blur-sm relative overflow-hidden group transition-colors ${accent ? accentBorder[accent] : 'hover:border-zinc-700'}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex justify-between items-start relative z-10">
        <span className="text-[13px] font-medium text-zinc-400 tracking-wide">{title}</span>
        <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">{icon}</div>
      </div>
      <div className="relative z-10 mt-2">
        <span className={`text-4xl font-semibold tracking-tight ${accent ? accentText[accent] : 'text-white'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
