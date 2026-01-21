
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { WeaponType, Player, ShotResult, GameSessionStats } from '../types';

interface Point {
  x: number;
  y: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  owner: 'player' | 'enemy';
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'Info' | 'Warning' | 'Error' | 'Success';
  message: string;
}

interface BallisticsPrototypeProps {
  onShotRecorded: (result: ShotResult) => void;
  stats: GameSessionStats;
}

const playSynthSound = (type: 'fire' | 'hit' | 'explosion' | 'victory' | 'adjust') => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;

  switch (type) {
    case 'fire':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    case 'hit':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.15);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    case 'explosion':
      osc.type = 'square';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.exponentialRampToValueAtTime(1, now + 0.4);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
  }
};

const BallisticsPrototype: React.FC<BallisticsPrototypeProps> = ({ onShotRecorded, stats }) => {
  // --- Global Constants ---
  const PLAYER_Y = 310; // Significantly higher to ensure zero HUD interference

  // --- Engine States ---
  const [matchLevel, setMatchLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [selectedObjectId, setSelectedObjectId] = useState<number | string>(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // --- Game Entities ---
  const [playerX, setPlayerX] = useState(400);
  const [playerAngle, setPlayerAngle] = useState(0); 
  const [playerHp, setPlayerHp] = useState(100);
  const [enemies, setEnemies] = useState<Player[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [obstacles, setObstacles] = useState<{id: number, x: number, y: number, r: number}[]>([]);
  
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);

  const requestRef = useRef<number | null>(null);
  const lastFireTime = useRef(0);
  const enemyMoveTick = useRef(0);
  const keysPressed = useRef<Set<string>>(new Set());

  const addLog = (message: string, type: LogEntry['type'] = 'Info') => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      message
    };
    setLogs(prev => [entry, ...prev].slice(0, 50));
  };

  const initMission = useCallback((level: number) => {
    const newEnemies: Player[] = [];
    const cols = Math.min(level + 2, 8);
    const count = level * 3;
    for (let i = 0; i < count; i++) {
      newEnemies.push({
        id: i + 2,
        name: `Invader_${i+1}`,
        x: 150 + (i % cols) * (500 / cols),
        y: 60 + Math.floor(i / cols) * 45,
        hp: 20 + (level * 5),
        maxHp: 20 + (level * 5),
        color: '#f43f5e'
      });
    }

    const newObstacles = [];
    if (level > 2) {
      for (let i = 0; i < Math.min(level, 3); i++) {
        newObstacles.push({ id: i, x: 250 + i * 150, y: 180 + (Math.sin(i) * 30), r: 15 });
      }
    }

    setEnemies(newEnemies);
    setObstacles(newObstacles);
    setBullets([]);
    setPlayerHp(100);
    setPlayerX(400);
    setPlayerAngle(0);
    setGameOver(false);
    setVictory(false);
    addLog(`Red Interceptor Ignition Level ${level}. Simulation clear.`, "Success");
  }, []);

  useEffect(() => {
    initMission(1);
  }, [initMission]);

  const update = useCallback(() => {
    if (!isPlaying || gameOver) return;

    // Movement
    if (keysPressed.current.has('ArrowLeft')) setPlayerX(prev => Math.max(50, prev - 8));
    if (keysPressed.current.has('ArrowRight')) setPlayerX(prev => Math.min(750, prev + 8));
    if (keysPressed.current.has('ArrowUp')) setPlayerAngle(prev => Math.max(-50, prev - 3));
    if (keysPressed.current.has('ArrowDown')) setPlayerAngle(prev => Math.min(50, prev + 3));

    // Shooting
    if (keysPressed.current.has(' ')) {
      const now = Date.now();
      if (now - lastFireTime.current > 140) {
        const rad = ((playerAngle - 90) * Math.PI) / 180;
        setBullets(prev => [...prev, {
          id: now,
          x: playerX + Math.cos(rad) * 25,
          y: PLAYER_Y + Math.sin(rad) * 25,
          vx: Math.cos(rad) * 14,
          vy: Math.sin(rad) * 14,
          angle: playerAngle,
          owner: 'player'
        }]);
        playSynthSound('fire');
        lastFireTime.current = now;
      }
    }

    // Physics
    setBullets(prev => {
      const next: Bullet[] = [];
      prev.forEach(b => {
        const nx = b.x + b.vx;
        const ny = b.y + b.vy;
        if (ny > -50 && ny < 450 && nx > -50 && nx < 850) {
          next.push({ ...b, x: nx, y: ny });
        }
      });
      return next;
    });

    enemyMoveTick.current += 0.025;
    setEnemies(prev => prev.map(e => ({
      ...e,
      x: e.x + Math.sin(enemyMoveTick.current) * 2.5,
    })));

    if (Math.random() < 0.012 + (matchLevel * 0.005)) {
      const livingEnemies = enemies.filter(e => e.hp > 0);
      if (livingEnemies.length > 0) {
        const shooter = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
        const dx = playerX - shooter.x;
        const dy = PLAYER_Y - shooter.y;
        const dist = Math.hypot(dx, dy);
        setBullets(prev => [...prev, {
          id: Date.now() + Math.random(),
          x: shooter.x,
          y: shooter.y + 20,
          vx: (dx / dist) * 4.5,
          vy: (dy / dist) * 4.5,
          angle: 180,
          owner: 'enemy'
        }]);
      }
    }

    requestRef.current = requestAnimationFrame(update);
  }, [isPlaying, gameOver, enemies, playerX, playerAngle, matchLevel]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    bullets.forEach(b => {
      obstacles.forEach(obs => {
        if (Math.hypot(b.x - obs.x, b.y - obs.y) < obs.r) {
          setBullets(prev => prev.filter(bullet => bullet.id !== b.id));
        }
      });

      if (b.owner === 'player') {
        enemies.forEach(e => {
          if (e.hp > 0 && Math.abs(b.x - e.x) < 30 && Math.abs(b.y - e.y) < 30) {
            setEnemies(prev => prev.map(enemy => enemy.id === e.id ? { ...enemy, hp: Math.max(0, enemy.hp - 10) } : enemy));
            setBullets(prev => prev.filter(bullet => bullet.id !== b.id));
            setScore(s => s + 250);
            playSynthSound('hit');
            addLog(`Impact confirmed on ${e.name}. Vector cleared.`, "Success");
          }
        });
      } else {
        if (Math.abs(b.x - playerX) < 28 && Math.abs(b.y - PLAYER_Y) < 28) {
          setPlayerHp(h => Math.max(0, h - 20));
          setBullets(prev => prev.filter(bullet => bullet.id !== b.id));
          playSynthSound('hit');
          addLog("DANGER: Fighter hull breach detected!", "Error");
        }
      }
    });

    if (playerHp <= 0) {
      setGameOver(true);
      setVictory(false);
      playSynthSound('explosion');
      addLog("MISSION FAILED: Pilot signal lost.", "Error");
    } else if (enemies.length > 0 && enemies.every(e => e.hp <= 0)) {
      setGameOver(true);
      setVictory(true);
      addLog("Simulation Success: Sector purged.", "Success");
    }
  }, [bullets, enemies, playerX, playerHp, obstacles, isPlaying, gameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.key);
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#0d0d0d] overflow-hidden font-sans text-[#d4d4d4]">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-white/5 select-none">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-rose-600 rounded flex items-center justify-center font-black text-[10px]">R</div>
            <span className="text-[11px] font-black opacity-80 uppercase tracking-widest">Red Interceptor Engine</span>
          </div>
          <div className="bg-[#0a0a0a] px-3 py-1 rounded text-[10px] font-bold text-rose-500 border border-white/5 uppercase tracking-tighter">Combat Level: {matchLevel}</div>
          <div className="bg-[#0a0a0a] px-3 py-1 rounded text-[10px] font-bold text-white border border-white/5 uppercase tracking-widest">Score: {score}</div>
        </div>
        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
          <button onClick={() => setIsPlaying(!isPlaying)} className={`p-1.5 rounded ${isPlaying ? 'text-rose-500' : 'text-slate-600'}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button onClick={() => { setMatchLevel(1); setScore(0); initMission(1); }} className="p-1.5 text-slate-600 hover:text-white">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Hierarchy */}
        <div className="w-60 bg-[#121212] border-r border-white/5 flex flex-col select-none">
          <div className="px-4 py-2 border-b border-white/5 text-[9px] font-black uppercase opacity-40">Scene Hierarchy</div>
          <div className="p-2 space-y-0.5 overflow-y-auto">
            <div onClick={() => setSelectedObjectId(1)} className={`px-4 py-2 rounded text-[11px] font-bold cursor-pointer flex items-center gap-2 ${selectedObjectId === 1 ? 'bg-rose-950 text-rose-400 border border-rose-900' : 'opacity-60 hover:bg-white/5'}`}>
              <span className="text-rose-500">🚀</span> RED_INTERCEPTOR
            </div>
            {enemies.map(e => e.hp > 0 && (
              <div key={e.id} onClick={() => setSelectedObjectId(e.id)} className={`px-4 py-1.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${selectedObjectId === e.id ? 'text-rose-400 bg-white/5' : 'opacity-30 hover:opacity-100'}`}>
                ● {e.name}
              </div>
            ))}
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 bg-[#050505] flex flex-col relative overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full aspect-video bg-black rounded border border-white/5 shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden">
              <svg width="100%" height="100%" viewBox="0 0 800 450" className="select-none cursor-default">
                {/* Space Parallax */}
                {Array.from({length: 60}).map((_, i) => (
                  <circle key={i} cx={(i * 37) % 800} cy={(Date.now() / (80 - (i % 4 * 15)) + i * 40) % 450} r={i % 5 === 0 ? 1.5 : 0.7} fill="white" opacity={0.1 + (i % 9) / 10} />
                ))}

                {/* Shield Units */}
                {obstacles.map(obs => (
                  <g key={obs.id} transform={`translate(${obs.x}, ${obs.y})`}>
                    <circle r={obs.r} fill="none" stroke="#4f46e5" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                    <text x="0" y="4" textAnchor="middle" dominantBaseline="middle" fontSize="18" opacity="0.5">💠</text>
                  </g>
                ))}

                {/* Projectiles */}
                {bullets.map(b => (
                  <g key={b.id}>
                    <line x1={b.x} y1={b.y} x2={b.x - b.vx * 1.2} y2={b.y - b.vy * 1.2} stroke={b.owner === 'player' ? '#f43f5e' : '#6366f1'} strokeWidth="3" opacity="0.6" strokeLinecap="round" />
                    <circle cx={b.x} cy={b.y} r="2.5" fill={b.owner === 'player' ? '#ff7e7e' : '#818cf8'} style={{ filter: 'drop-shadow(0 0 4px currentColor)' }} />
                  </g>
                ))}

                {/* Invaders */}
                {enemies.map((e, i) => e.hp > 0 && (
                  <g key={e.id} transform={`translate(${e.x}, ${e.y})`}>
                    <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fontSize="26" className="drop-shadow-lg opacity-80">
                      {i % 2 === 0 ? '👾' : '🛸'}
                    </text>
                    <rect x="-15" y="-22" width="30" height="2" fill="#000" rx="1" />
                    <rect x="-15" y="-22" width={(e.hp / (20 + matchLevel * 5)) * 30} height="2" fill="#4f46e5" rx="1" />
                  </g>
                ))}

                {/* RED FIGHTER (High Visibility) */}
                {playerHp > 0 && (
                  <g transform={`translate(${playerX}, ${PLAYER_Y})`}>
                    {/* Aiming Gizmo - Red Laser */}
                    <line x1="0" y1="0" x2={Math.cos(((playerAngle - 90) * Math.PI) / 180) * 120} y2={Math.sin(((playerAngle - 90) * Math.PI) / 180) * 120} stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.4" />
                    
                    {/* Red Glow Aura */}
                    <circle r="30" fill="url(#redGlow)" opacity="0.4" className="animate-pulse" />
                    
                    <g transform={`rotate(${playerAngle})`}>
                      <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fontSize="60" className="drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]">🚀</text>
                    </g>
                    {selectedObjectId === 1 && <circle r="42" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="8 8" className="animate-spin" style={{ animationDuration: '10s' }} />}
                  </g>
                )}

                <defs>
                  <radialGradient id="redGlow">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>

              {/* Game Over UI Overlay */}
              {gameOver && (
                <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 animate-in fade-in duration-500">
                  <div className="text-center p-14 border border-white/5 rounded-[50px] bg-[#0a0a0a] shadow-3xl">
                    <h2 className={`text-6xl font-black mb-4 uppercase italic tracking-tighter ${victory ? 'text-emerald-400' : 'text-rose-600'}`}>
                      {victory ? 'Mission Complete' : 'System Defeat'}
                    </h2>
                    <p className="text-slate-500 mb-10 font-black uppercase tracking-[0.4em] text-xs">Total Points: <span className="text-white">{score}</span></p>
                    <div className="flex gap-6 justify-center">
                       {victory ? (
                         <button onClick={() => { setMatchLevel(l => l + 1); initMission(matchLevel + 1); }} className="px-12 py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl transition-all">Next Quadrant</button>
                       ) : (
                         <button onClick={() => { setScore(0); initMission(1); }} className="px-12 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl transition-all">Restart Loop</button>
                       )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ghost HUD (Low Alpha, Higher Position) */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-14 bg-black/10 backdrop-blur-sm px-14 py-6 rounded-[50px] border border-white/5 shadow-2xl pointer-events-none">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-2">Armor Plate</span>
                <div className="w-40 h-1.5 bg-black/50 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${playerHp < 40 ? 'bg-rose-600' : 'bg-rose-500'}`} style={{ width: `${playerHp}%` }} />
                </div>
              </div>
              <div className="h-10 w-px bg-white/5" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1 text-rose-500">Target Arc</span>
                <span className="text-xl font-black text-white italic tracking-tighter">{playerAngle}°</span>
              </div>
              <div className="h-10 w-px bg-white/5" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">Drones</span>
                <span className="text-xl font-black text-rose-400">{enemies.filter(e=>e.hp>0).length}</span>
              </div>
            </div>
          </div>

          {/* Minimal Console */}
          <div className="h-32 bg-[#0a0a0a] border-t border-white/5 flex flex-col font-mono">
            <div className="px-4 py-1.5 border-b border-white/5 text-[9px] font-black opacity-20 flex justify-between uppercase">
              <span>Simulation Vector Stream</span>
              <button onClick={() => setLogs([])}>Reset_Logs</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 text-[10px] space-y-0.5">
              {logs.map(log => (
                <div key={log.id} className={`flex gap-4 ${log.type === 'Error' ? 'text-rose-500' : log.type === 'Success' ? 'text-rose-400' : 'opacity-40'}`}>
                  <span className="opacity-20 flex-shrink-0">[{log.timestamp}]</span>
                  <span className="font-bold">[{log.type}]</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inspector */}
        <div className="w-80 bg-[#121212] border-l border-white/5 flex flex-col select-none overflow-y-auto">
          <div className="px-4 py-3 border-b border-white/5 bg-[#181818] flex items-center justify-between">
            <span className="text-[10px] font-black uppercase opacity-60">Property Inspector</span>
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
          </div>
          
          <div className="p-6 space-y-8">
            {selectedObjectId === 1 ? (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-black border border-rose-500/20 rounded-[35px] flex items-center justify-center text-4xl shadow-2xl">🚀</div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tighter">F9_INTERCEPTOR</h3>
                    <p className="text-[9px] text-rose-500 font-black uppercase opacity-60 tracking-widest">Active_GameObject</p>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-white/5">
                  <div className="bg-black/40 p-5 rounded-3xl border border-white/5 space-y-4">
                    <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">Transform Matrix</span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                       <div className="bg-black p-2 rounded-xl flex justify-between border border-white/5"><span className="text-rose-500">X</span><span>{Math.round(playerX)}</span></div>
                       <div className="bg-black p-2 rounded-xl flex justify-between border border-white/5"><span className="text-indigo-400">R</span><span>{playerAngle}°</span></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">Ballistic Config</span>
                    <div className="bg-black/40 p-5 rounded-3xl border border-white/5 space-y-4">
                       <div className="flex justify-between text-[10px] font-bold opacity-60 uppercase tracking-tighter"><span>Recoil Stabilizer</span><span>88%</span></div>
                       <div className="w-full h-1 bg-black rounded-full overflow-hidden"><div className="h-full bg-rose-600 w-[88%]" /></div>
                    </div>
                  </div>

                  <div className="bg-rose-600/5 rounded-3xl p-6 border border-rose-600/20 space-y-4">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Input Overlays</span>
                    <div className="space-y-3 opacity-60">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter"><span>Vector Slide</span><span className="px-2 py-1 bg-black rounded border border-white/10">← →</span></div>
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter"><span>Pitch Control</span><span className="px-2 py-1 bg-black rounded border border-white/10">↑ ↓</span></div>
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter"><span>Engagement</span><span className="px-2 py-1 bg-black rounded border border-white/10">SPACE</span></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-10 space-y-4 pt-40">
                <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l7.9 13.55H4.1L12 5.45z"/></svg>
                <p className="text-[11px] font-black uppercase tracking-[0.4em]">Select Object<br/>to Analyze</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BallisticsPrototype;
