
import React from 'react';
import { GENIUS_IDEAS } from '../constants';

const StrategyGuide: React.FC = () => {
  return (
    <div className="animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Genius Ideas</h2>
          <p className="text-slate-400 text-sm">14 Core Strategies for Graphic Excellence and Market Success.</p>
        </div>
        <div className="flex gap-2">
          {['Core', 'Graphic', 'Success'].map(cat => (
            <span key={cat} className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-bold text-slate-500 uppercase">
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {GENIUS_IDEAS.map((idea) => (
          <div 
            key={idea.id} 
            className="group bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all duration-300 flex flex-col h-full"
          >
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                idea.category === 'Graphic' ? 'bg-indigo-900/30 text-indigo-400' :
                idea.category === 'Success' ? 'bg-green-900/30 text-green-400' :
                'bg-yellow-900/30 text-yellow-400'
              }`}>
                {idea.category}
              </span>
              {idea.impact === 'High' && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase">
                   <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span> Critical
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-400 transition-colors mb-2">
              {idea.id}. {idea.title}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-1">
              {idea.description}
            </p>
            <div className="pt-4 border-t border-slate-800/50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="text-[10px] font-bold text-indigo-400 uppercase hover:text-white transition-colors">
                Implementation Docs →
              </button>
              <div className="flex gap-1">
                <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                <div className="w-1 h-3 bg-slate-700 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-10 flex flex-col items-center text-center">
        <h3 className="text-2xl font-bold mb-4">Ready to Start Execution?</h3>
        <p className="text-slate-400 max-w-2xl mb-8">
          The roadmap dictates a 12-week MVP cycle starting with the Core Prototype. 
          The tech stack (shadcn, React, Python) is pre-optimized for this workflow.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
            Download MVP Document
          </button>
          <button className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl font-bold transition-all active:scale-95">
            View Live-Ops Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default StrategyGuide;
