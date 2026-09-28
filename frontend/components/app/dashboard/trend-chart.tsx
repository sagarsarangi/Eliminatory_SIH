'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendDataPoint {
  day: string;
  ec: number;
  ph: number;
  milk_temp: number;
  rumination: number;
}

export function TrendChart({ data }: { data: TrendDataPoint[] }) {
  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" vertical={false} />
          <XAxis dataKey="day" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
            itemStyle={{ fontSize: '12px' }}
            labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Line yAxisId="left" type="monotone" dataKey="ec" name="EC (mS/cm)" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
          <Line yAxisId="left" type="monotone" dataKey="ph" name="pH" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
          <Line yAxisId="left" type="monotone" dataKey="milk_temp" name="Temp (°C)" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3, fill: '#f43f5e' }} activeDot={{ r: 5 }} />
          <Line yAxisId="right" type="monotone" dataKey="rumination" name="Rumination/min" stroke="#eab308" strokeWidth={2} dot={{ r: 3, fill: '#eab308' }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
