
import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-[#d4d4d4]">
      <section className="bg-[#2d2d2d] border border-white/5 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l7.9 13.55H4.1L12 5.45z"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest">Project Configuration</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Engine Parameters & Design Intent</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Architectural Redefinition (PR)</h3>
            <p className="text-sm text-slate-400 leading-relaxed italic">
              "We are not merely rendering an artillery simulation. We are compiling a competitive ecosystem where high-fidelity feedback loops drive retention metrics."
            </p>
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5">
              <span className="text-[9px] font-black text-slate-600 uppercase block mb-1">Active Build Goal</span>
              <p className="text-sm font-bold text-white">Visual Readability + Dopamine Triggers</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             {[
               { label: 'Latency Tol.', val: '98%', col: 'bg-green-500' },
               { label: 'UX Fidelity', val: 'High', col: 'bg-indigo-500' },
               { label: 'Meta Cycle', val: 'Weekly', col: 'bg-rose-500' },
               { label: 'Target FPS', val: '60.0', col: 'bg-cyan-500' }
             ].map(stat => (
               <div key={stat.label} className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                 <span className="text-[8px] font-black text-slate-600 uppercase mb-1">{stat.label}</span>
                 <span className="text-lg font-black text-white">{stat.val}</span>
                 <div className={`h-0.5 w-8 ${stat.col} mt-2 rounded-full`}></div>
               </div>
             ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Scene Hierarchy', desc: 'Component-based architecture for game objects.', icon: '🌳' },
          { title: 'Particle Engine', desc: 'SVG-based shell and explosion FX.', icon: '✨' },
          { title: 'Profiler AI', desc: 'Predictive churn analysis using Python.', icon: '🧠' },
        ].map((card, i) => (
          <div key={i} className="bg-[#2d2d2d] border border-white/5 p-6 rounded-2xl hover:bg-[#333] transition-all cursor-pointer group">
            <div className="text-2xl mb-4 group-hover:scale-110 transition-transform inline-block">{card.icon}</div>
            <h4 className="font-black text-xs uppercase tracking-widest text-white mb-2">{card.title}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Dashboard;
