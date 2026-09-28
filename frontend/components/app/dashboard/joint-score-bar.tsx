export function JointScoreBar({ jointScore, rfProb, cnnScore, anomalySeverity }: {
  jointScore: number;
  rfProb: number;
  cnnScore: number;
  anomalySeverity: number;
}) {
  // RF: 70%, CNN: 20%, Anomaly: 10%
  const rfContrib = 0.70 * rfProb;
  const cnnContrib = 0.20 * cnnScore;
  const anomalyContrib = 0.10 * anomalySeverity;
  const total = rfContrib + cnnContrib + anomalyContrib;
  
  const rfPct = total > 0 ? (rfContrib / total) * 100 : 0;
  const cnnPct = total > 0 ? (cnnContrib / total) * 100 : 0;
  const anomalyPct = total > 0 ? (anomalyContrib / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 w-full mt-4">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>Joint Score Breakdown</span>
        <span className="font-mono text-zinc-100">{(jointScore * 100).toFixed(0)}%</span>
      </div>
      <div className="h-3 w-full bg-zinc-900 rounded-full flex overflow-hidden ring-1 ring-zinc-800">
        <div style={{ width: `${rfPct}%` }} className="bg-emerald-500 transition-all duration-500" title={`RF: ${(rfContrib * 100).toFixed(1)}%`} />
        <div style={{ width: `${cnnPct}%` }} className="bg-blue-500 transition-all duration-500" title={`CNN: ${(cnnContrib * 100).toFixed(1)}%`} />
        <div style={{ width: `${anomalyPct}%` }} className="bg-amber-500 transition-all duration-500" title={`Anomaly: ${(anomalyContrib * 100).toFixed(1)}%`} />
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500">
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>RF (70%)</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>CNN (20%)</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Anomaly (10%)</span>
      </div>
    </div>
  );
}
