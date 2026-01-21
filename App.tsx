
import React, { useState } from 'react';
import { TabType, GameSessionStats, ShotResult } from './types';
import Dashboard from './components/Dashboard';
import BallisticsPrototype from './components/BallisticsPrototype';
import StrategyGuide from './components/StrategyGuide';
import Analytics from './components/Analytics';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.DASHBOARD);
  const [sessionStats, setSessionStats] = useState<GameSessionStats>({
    shots: [],
    hits: 0,
    misses: 0
  });

  const recordShot = (result: ShotResult) => {
    setSessionStats(prev => ({
      ...prev,
      shots: [...prev.shots, result],
      hits: result.hit ? prev.hits + 1 : prev.hits,
      misses: !result.hit ? prev.misses + 1 : prev.misses
    }));
  };

  const getContent = () => {
    if (activeTab === TabType.DASHBOARD) return <Dashboard />;
    if (activeTab === TabType.PROTOTYPE) return <BallisticsPrototype onShotRecorded={recordShot} stats={sessionStats} />;
    if (activeTab === TabType.STRATEGY) return <StrategyGuide />;
    if (activeTab === TabType.ANALYTICS) return <Analytics stats={sessionStats} />;
    return <Dashboard />;
  };

  const isPrototype = activeTab === TabType.PROTOTYPE;

  return (
    <div className="flex flex-col h-screen bg-[#1c1c1c] text-[#d4d4d4] selection:bg-indigo-500/30 overflow-hidden">
      {/* Unity Engine Header */}
      <header className="z-50 bg-[#2d2d2d] border-b border-[#121212] px-6 py-3 flex justify-between items-center select-none">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-[#3b82f6] rounded shadow-lg flex items-center justify-center">
             <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div>
            <h1 className="font-black text-sm tracking-widest uppercase text-white/90">Unity Neo <span className="text-indigo-400">Editor</span></h1>
            <p className="text-[9px] text-slate-500 font-bold tracking-tighter uppercase leading-none mt-0.5">Project: Fortress_Reborn_V2.5</p>
          </div>
        </div>

        <nav className="flex gap-1 p-1 bg-[#1a1a1a] rounded-lg border border-white/5">
          {[
            { id: TabType.DASHBOARD, label: 'Overview' },
            { id: TabType.PROTOTYPE, label: 'Scene View' },
            { id: TabType.STRATEGY, label: 'Asset Store' },
            { id: TabType.ANALYTICS, label: 'Profiler' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black transition-all uppercase tracking-wider ${
                activeTab === tab.id 
                  ? 'bg-[#3b82f6] text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
             <span className="text-[8px] font-black opacity-30 uppercase tracking-[0.2em]">Build Target</span>
             <span className="text-[10px] font-bold text-green-400 uppercase">WebGL_Stable</span>
           </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <div className={`h-full ${isPrototype ? 'w-full' : 'max-w-7xl mx-auto px-6 py-8 overflow-y-auto'}`}>
          {getContent()}
        </div>
      </main>

      {/* Editor Status Bar */}
      <footer className="bg-[#2d2d2d] border-t border-[#121212] px-4 py-1 flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-widest font-black select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-indigo-400"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div> Scripting: C# Hybrid</span>
          <span className="opacity-20">|</span>
          <span>Project Data: Synced</span>
        </div>
        <div className="flex gap-4">
          <span className="text-slate-600">v3.1.2025.A</span>
          <span className="text-indigo-500/50">Unity Hub Active</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
