
import React, { useMemo } from 'react';
import { ResponsiveContainer, Cell, PieChart, Pie, Tooltip } from 'recharts';
import { GameSessionStats } from '../types';

interface AnalyticsProps {
  stats: GameSessionStats;
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

const Analytics: React.FC<AnalyticsProps> = ({ stats }) => {
  const chartData = useMemo(() => {
    const powerErrors = stats.shots.filter(s => s.errorType === 'Power').length;
    const angleErrors = stats.shots.filter(s => s.errorType === 'Angle').length;
    const windErrors = stats.shots.filter(s => s.errorType === 'Wind').length;
    const hits = stats.hits;

    return [
      { name: 'Power Over/Under', value: powerErrors || (stats.shots.length === 0 ? 1 : 0) },
      { name: 'Angle Error', value: angleErrors },
      { name: 'Wind Miscale', value: windErrors },
      { name: 'Successful Hits', value: hits },
    ];
  }, [stats]);

  const coachAdvice = useMemo(() => {
    if (stats.shots.length === 0) return "Start firing to receive AI-driven performance coaching.";
    
    const powerErrors = stats.shots.filter(s => s.errorType === 'Power').length;
    const windErrors = stats.shots.filter(s => s.errorType === 'Wind').length;
    
    if (powerErrors > windErrors && powerErrors > 2) {
      return "You're consistently overshooting or undershooting. Focus on the Velocity slider and use the trajectory dot as a guide.";
    }
    if (windErrors > 2) {
      return "Wind is your biggest obstacle. Pay closer attention to the Wind Vector HUD; arrows indicate force direction.";
    }
    if (stats.hits > 0 && stats.hits >= stats.misses) {
      return "Excellent mastery of ballistics. Consider switching to more complex payloads like the 'Split' shot to maximize AOE.";
    }
    return "Keep calibrating. Ballistics is an art of patience and pixel-perfect adjustment.";
  }, [stats]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-3">
              <span className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center font-mono text-base border border-indigo-500/20 shadow-lg shadow-indigo-500/10">Py</span>
              Neural Analytics Engine
            </h2>
            <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.3em] font-black">Behavioral Churn Prevention System</p>
          </div>
          <div className="bg-indigo-900/20 border border-indigo-500/30 px-4 py-1.5 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
            Live Data Sync Active
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30"></div>
            <h3 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-widest">Session Error Distribution</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              {chartData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase">{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 flex-1 relative group">
              <h3 className="text-xs font-black text-indigo-400 mb-6 uppercase tracking-widest">AI Performance Coach</h3>
              <div className="space-y-6">
                <div className="bg-slate-900 border-l-4 border-indigo-500 p-6 rounded-r-2xl shadow-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-black mb-2 tracking-tighter">Current Session Profile</p>
                  <p className="text-sm text-slate-200 font-medium italic leading-relaxed">
                    "{coachAdvice}"
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center">
                    <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Miss Correction</p>
                    <p className="text-xl font-black text-rose-400">-{stats.misses * 2}% <span className="text-[10px] text-slate-600">Avg</span></p>
                  </div>
                  <div className="bg-indigo-600/10 border border-indigo-500/20 p-5 rounded-2xl text-center">
                    <p className="text-[9px] text-indigo-400 font-black uppercase mb-1">Learning Rate</p>
                    <p className="text-xl font-black text-white">{(stats.hits * 15).toFixed(0)}bps</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-500/20 group hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden">
               <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white opacity-5 rounded-full"></div>
               <div className="relative z-10">
                 <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Predicted Retention</h4>
                 <div className="flex items-baseline gap-2">
                   <p className="text-4xl font-black">92.4%</p>
                   <span className="text-xs font-bold opacity-70">Optimal</span>
                 </div>
                 <p className="text-[10px] mt-4 font-bold opacity-60 leading-tight">Player flow state achieved. Mechanical feedback is within target dopamine range.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
