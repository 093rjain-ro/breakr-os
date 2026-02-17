
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, 
  PolarAngleAxis, Radar, Cell, ComposedChart
} from 'recharts';
import { StockData, Recommendation } from '../types';

interface ChartProps {
  stock: StockData;
  recommendation: Recommendation;
}

export const ConvictionRadar: React.FC<ChartProps> = ({ recommendation }) => {
  const data = useMemo(() => [
    { subject: 'Intraday', A: recommendation.reasoning.intradayStrength, fullMark: 35 },
    { subject: 'Vol Accel', A: recommendation.reasoning.volumeAcceleration, fullMark: 30 },
    { subject: 'Sector', A: recommendation.reasoning.sectorAlignment, fullMark: 20 },
    { subject: 'Market', A: recommendation.reasoning.marketCondition, fullMark: 15 },
  ], [recommendation.reasoning]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
          <Radar
            name="Score"
            dataKey="A"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CombinedPriceVolumeChart: React.FC<ChartProps> = ({ stock }) => {
  const data = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const isToday = i === 19;
      const basePrice = stock.price * (0.98 + (i * 0.001));
      const vol = isToday ? stock.volume : stock.avgVolume20d * (0.8 + Math.random() * 0.4);
      return {
        name: i,
        price: isToday ? stock.price : basePrice,
        volume: vol,
        vwap: stock.vwap * (0.99 + (i * 0.0005)),
        isSpike: vol > stock.avgVolume20d * 1.5
      };
    });
  }, [stock.symbol, stock.price, stock.vwap]);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false} />
          <XAxis dataKey="name" hide />
          <YAxis yAxisId="left" domain={['auto', 'auto']} tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" hide />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
            itemStyle={{ color: '#f8fafc' }}
          />
          <Area yAxisId="left" type="monotone" dataKey="price" fill="url(#colorPrice)" stroke="#3b82f6" strokeWidth={2} isAnimationActive={false} />
          <Bar yAxisId="right" dataKey="volume" isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.isSpike ? '#f59e0b' : '#1e293b'} />
            ))}
          </Bar>
          <Line yAxisId="left" type="monotone" dataKey="vwap" stroke="#22c55e" strokeWidth={1} dot={false} strokeDasharray="3 3" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const InstitutionalFlowChart: React.FC<ChartProps> = ({ stock }) => {
  const data = useMemo(() => [
    { name: 'FII Net', val: stock.fiiFlow },
    { name: 'DII Net', val: stock.diiFlow },
  ], [stock.fiiFlow, stock.diiFlow]);

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, left: -20, right: 10, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
          <Bar dataKey="val" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.val > 0 ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
