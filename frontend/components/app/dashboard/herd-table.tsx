'use client';

import { useState } from 'react';
import { CowDrawer } from './cow-drawer';

export interface Cow {
  cow_id: string;
  farm: string;
  breed: string;
  joint_score: number;
  risk_tier: string;
  rf_prob: number;
  cnn_score: number;
  anomaly_severity: number;
  last_updated: string;
  rf_label: number;
}

const riskColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  High:     { bg: 'bg-red-950/40',     text: 'text-red-400',     border: 'border-red-900/60',     dot: 'bg-red-500' },
  Moderate: { bg: 'bg-orange-950/30',  text: 'text-orange-400',  border: 'border-orange-900/50',  dot: 'bg-orange-500' },
  Low:      { bg: 'bg-yellow-950/20',  text: 'text-yellow-400',  border: 'border-yellow-900/40',  dot: 'bg-yellow-500' },
  'No Risk':{ bg: 'bg-transparent',    text: 'text-emerald-400', border: 'border-zinc-800',        dot: 'bg-emerald-500' },
};

export function HerdTable({ cows }: { cows: Cow[] }) {
  const [selectedCow, setSelectedCow] = useState<Cow | null>(null);

  return (
    <>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 shadow-sm backdrop-blur-sm overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[13px] font-medium text-zinc-400 bg-zinc-900/30">
                <th className="p-5 pl-6 font-medium">Cow ID</th>
                <th className="p-5 font-medium">Farm &amp; Breed</th>
                <th className="p-5 font-medium">Risk Tier</th>
                <th className="p-5 font-medium">Joint Score</th>
                <th className="p-5 font-medium hidden md:table-cell">RF Prob</th>
                <th className="p-5 font-medium hidden lg:table-cell">Last Updated</th>
                <th className="p-5 pr-6 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 bg-transparent">
              {cows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-zinc-500 text-sm">
                    No cows found. Register a cow and run a prediction to see results here.
                  </td>
                </tr>
              )}
              {cows.map((cow) => {
                const tier = riskColors[cow.risk_tier] ?? riskColors['No Risk'];

                return (
                  <tr
                    key={cow.cow_id}
                    className="hover:bg-zinc-900/30 transition-colors group cursor-pointer"
                    onClick={() => setSelectedCow(cow)}
                  >
                    {/* Cow ID */}
                    <td className="p-5 pl-6">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tier.dot}`} />
                        <span className="font-semibold text-white tracking-tight">{cow.cow_id}</span>
                      </div>
                    </td>

                    {/* Farm & Breed */}
                    <td className="p-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-zinc-300">{cow.farm}</span>
                        <span className="text-[13px] text-zinc-500">{cow.breed}</span>
                      </div>
                    </td>

                    {/* Risk tier badge */}
                    <td className="p-5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${tier.bg} ${tier.text} ${tier.border}`}
                      >
                        {cow.risk_tier}
                      </span>
                    </td>

                    {/* Joint score bar */}
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-[13px] font-semibold w-10 ${tier.text}`}>
                          {(cow.joint_score * 100).toFixed(0)}%
                        </span>
                        <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${tier.dot}`}
                            style={{ width: `${Math.min(cow.joint_score * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* RF probability */}
                    <td className="p-5 text-[13px] text-zinc-400 font-mono hidden md:table-cell">
                      {(cow.rf_prob * 100).toFixed(1)}%
                    </td>

                    {/* Last updated */}
                    <td className="p-5 text-[13px] text-zinc-500 font-medium hidden lg:table-cell">
                      {cow.last_updated}
                    </td>

                    {/* Action */}
                    <td className="p-5 pr-6 text-right">
                      <button
                        className="text-[12px] font-medium text-zinc-500 hover:text-white transition-colors flex items-center justify-end gap-1 w-full group-hover:text-zinc-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCow(cow);
                        }}
                      >
                        Details <span className="text-zinc-600 group-hover:text-zinc-400">→</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CowDrawer
        cow={selectedCow}
        isOpen={!!selectedCow}
        onClose={() => setSelectedCow(null)}
      />
    </>
  );
}
