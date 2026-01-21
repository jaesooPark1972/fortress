
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { WeaponType, Player, ShotResult, GameSessionStats } from '../types';

interface Point {
  x: number;
  y: number;
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

const playSynthSound = (type: 'fire' | 'hit' | 'miss' | 'move' | 'victory' | 'adjust' | 'explosion') => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;

  switch (type) {
    case 'fire':
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    case 'hit':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
    case 'adjust':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.02);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.02);
      osc.start(now);
      osc.stop(now + 0.02);
      break;
    case 'explosion':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.5);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      break;
    case 'victory':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.exponentialRampToValueAtTime(1046, now + 1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 1.2);
      osc.start(now);
      osc.stop(now + 1.2);
      break;
  }
};

const BallisticsPrototype: React.FC<BallisticsPrototypeProps> = ({ onShotRecorded, stats }) => {
  // --- Progression Engine ---
  const [matchLevel, setMatchLevel] = useState(1);
  const [selectedObjectId, setSelectedObjectId] = useState<number | string>(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // --- Game Config & Logic ---
  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(60);
  const [wind, setWind] = useState(2);
  const [weapon, setWeapon] = useState<WeaponType>('Standard');
  const [isFiring, setIsFiring] = useState(false);
  const [trajectory, setTrajectory] = useState<Point[]>([]);
  const [projectilePos, setProjectilePos] = useState<Point | null>(null);
  const [explosion, setExplosion] = useState<{x: number, y: number, color: string} | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  
  // Players State
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [victoryState, setVictoryState] = useState(false);

  const animationRef = useRef<number | null>(null);
  const activePlayer = players[currentPlayerIndex];

  // --- Terrain Generator ---
  // A simple function to generate a mountain height at x
  const terrainHeight = useCallback((x: number) => {
    // Large center mountain + some noise
    const center = 400;
    const peak = 180; // High mountain
    const width = 200;
    const mountain = Math.max(0, peak * Math.exp(-Math.pow(x - center, 2) / (2 * Math.pow(width, 2))));
    return 350 - mountain; // Ground starts at 350
  }, []);

  // --- Init Match Level ---
  const initLevel = useCallback((level: number) => {
    const newPlayers: Player[] = [
      { id: 1, name: 'Commander_Neo', x: 80, y: terrainHeight(80) - 10, hp: 100, maxHp: 100, color: '#3b82f6', isAI: false }
    ];
    // Add AIs based on level
    for (let i = 0; i < level; i++) {
      const xPos = 550 + (i * 60);
      newPlayers.push({
        id: i + 2,
        name: `Enemy_Drone_${i + 1}`,
        x: xPos,
        y: terrainHeight(xPos) - 10,
        hp: 50 + (level * 10),
        maxHp: 50 + (level * 10),
        color: '#f43f5e',
        isAI: true
      });
    }
    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setGameOver(false);
    setVictoryState(false);
    setWind(Math.floor(Math.random() * 11) - 5);
    addLog(`Engagement Level ${level} Started: 1 vs ${level}`, 'Info');
  }, [terrainHeight]);

  useEffect(() => {
    addLog("Unity Neo Engine initialized.", "Success");
    initLevel(1);
  }, []);

  const addLog = (message: string, type: LogEntry['type'] = 'Info') => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      message
    };
    setLogs(prev => [entry, ...prev].slice(0, 50));
  };

  // --- AI Shooting Logic ---
  const executeAITurn = useCallback(() => {
    if (!activePlayer || !activePlayer.isAI || gameOver) return;

    // Simulate "thinking"
    setTimeout(() => {
      // Aim at player (Index 0)
      const target = players[0];
      const dx = target.x - activePlayer.x;
      const dy = target.y - activePlayer.y;
      
      // Rough calculation for AI
      const dist = Math.abs(dx);
      let aiPower = 50 + (dist / 10) + (Math.random() * 10 - 5);
      let aiAngle = 45 + (Math.random() * 20 - 10);
      
      // Compensate for wind
      aiPower -= wind * 2;

      setAngle(Math.round(aiAngle));
      setPower(Math.round(aiPower));
      
      setTimeout(() => {
        fire();
      }, 1000);
    }, 1500);
  }, [activePlayer, players, wind, gameOver]);

  useEffect(() => {
    if (activePlayer?.isAI && isPlaying && !isFiring && !gameOver) {
      executeAITurn();
    }
  }, [currentPlayerIndex, activePlayer, isPlaying, isFiring, gameOver]);

  // --- Controls ---
  const movePlayer = useCallback((dir: 'left' | 'right') => {
    if (isFiring || gameOver || !isPlaying || activePlayer.isAI) return;
    const stepSize = 10;
    const newX = dir === 'left' ? activePlayer.x - stepSize : activePlayer.x + stepSize;
    if (newX < 20 || newX > 300) return; // Prevent crossing middle

    setPlayers(prev => {
      const next = [...prev];
      next[currentPlayerIndex] = { ...next[currentPlayerIndex], x: newX, y: terrainHeight(newX) - 10 };
      return next;
    });
  }, [activePlayer, currentPlayerIndex, isFiring, gameOver, isPlaying, terrainHeight]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isFiring || gameOver || activePlayer?.isAI) return;
      if (e.key === 'ArrowLeft') movePlayer('left');
      if (e.key === 'ArrowRight') movePlayer('right');
      if (e.key === 'ArrowUp') setAngle(prev => Math.min(90, prev + 1));
      if (e.key === 'ArrowDown') setAngle(prev => Math.max(0, prev - 1));
      if (e.key === ' ') fire();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, isFiring, gameOver, isPlaying, activePlayer]);

  // --- Physics ---
  const calculateTrajectory = useCallback(() => {
    if (!activePlayer) return [];
    const points: Point[] = [];
    const rad = (angle * Math.PI) / 180;
    const direction = activePlayer.x < 400 ? 1 : -1; 
    let vx = Math.cos(rad) * (power / 5) * direction;
    let vy = -Math.sin(rad) * (power / 5);
    let x = activePlayer.x;
    let y = activePlayer.y - 15;
    const g = 0.15;
    const w = wind * 0.05;

    for (let t = 0; t < 300; t++) {
      points.push({ x, y });
      vx += w; vy += g; x += vx; y += vy;
      // Terrain Collision Check
      if (y > terrainHeight(x)) {
        points.push({ x, y: terrainHeight(x) });
        break;
      }
      if (x > 800 || x < 0 || y > 450) break;
    }
    return points;
  }, [angle, power, wind, activePlayer, terrainHeight]);

  useEffect(() => {
    if (gameOver || !activePlayer) return;
    setTrajectory(calculateTrajectory());
  }, [angle, power, wind, calculateTrajectory, activePlayer?.x, gameOver]);

  const fire = () => {
    if (isFiring || gameOver || !activePlayer) return;
    setIsFiring(true);
    playSynthSound('fire');
    addLog(`Unit ${activePlayer.name} initiated payload delivery.`, "Info");

    let currentStep = 0;
    const points = calculateTrajectory();
    const animate = () => {
      if (currentStep < points.length - 1) {
        currentStep += 2;
        const currentPos = points[Math.min(currentStep, points.length - 1)];
        setProjectilePos(currentPos);

        // Check against ALL other players
        let hitIdx = -1;
        players.forEach((p, idx) => {
          if (idx === currentPlayerIndex || p.hp <= 0) return;
          const dist = Math.hypot(p.x - currentPos.x, (p.y - 15) - currentPos.y);
          if (dist < 25) hitIdx = idx;
        });

        if (hitIdx !== -1) {
          handleHit(currentPos, hitIdx);
          cancelAnimationFrame(animationRef.current!);
          return;
        }

        // Terrain hit check at end of path
        if (currentStep >= points.length - 2 && currentPos.y >= terrainHeight(currentPos.x) - 5) {
          handleMiss(currentPos);
          cancelAnimationFrame(animationRef.current!);
          return;
        }

        animationRef.current = requestAnimationFrame(animate);
      } else {
        handleMiss(points[points.length - 1]);
      }
    };
    animate();
  };

  const handleHit = (pos: Point, targetIndex: number) => {
    setIsFiring(false);
    setProjectilePos(null);
    setExplosion({ x: pos.x, y: pos.y, color: '#f43f5e' });
    setIsShaking(true);
    playSynthSound('explosion');
    
    const target = players[targetIndex];
    addLog(`Critical Impact on ${target.name}!`, "Success");

    setPlayers(prev => {
      const next = [...prev];
      next[targetIndex] = { ...next[targetIndex], hp: Math.max(0, next[targetIndex].hp - 40) };
      return next;
    });

    setTimeout(() => {
      setExplosion(null);
      setIsShaking(false);
      checkMatchOver();
    }, 800);
  };

  const handleMiss = (pos: Point) => {
    setIsFiring(false);
    setProjectilePos(null);
    setExplosion({ x: pos.x, y: pos.y, color: '#94a3b8' });
    playSynthSound('explosion');
    addLog(`Impact at [${Math.round(pos.x)}, ${Math.round(pos.y)}]. No structural damage.`, "Warning");
    setTimeout(() => {
      setExplosion(null);
      nextTurn();
    }, 800);
  };

  const checkMatchOver = () => {
    setPlayers(currentPlayers => {
      const playerAlive = currentPlayers[0].hp > 0;
      const enemiesAlive = currentPlayers.slice(1).some(p => p.hp > 0);

      if (!playerAlive) {
        setGameOver(true);
        setVictoryState(false);
        addLog("Mission Failure: Commander Lost.", "Error");
      } else if (!enemiesAlive) {
        setGameOver(true);
        setVictoryState(true);
        playSynthSound('victory');
        addLog(`Victory! Area Cleared. Progression Initiated.`, "Success");
      } else {
        nextTurn();
      }
      return currentPlayers;
    });
  };

  const nextTurn = () => {
    setPlayers(currentPlayers => {
      let nextIdx = (currentPlayerIndex + 1) % currentPlayers.length;
      // Skip dead players
      while (currentPlayers[nextIdx].hp <= 0) {
        nextIdx = (nextIdx + 1) % currentPlayers.length;
      }
      setCurrentPlayerIndex(nextIdx);
      setWind(Math.floor(Math.random() * 11) - 5);
      return currentPlayers;
    });
  };

  const handleNextLevel = () => {
    const nextLevel = matchLevel + 1;
    setMatchLevel(nextLevel);
    initLevel(nextLevel);
  };

  const handleRestart = () => {
    setMatchLevel(1);
    initLevel(1);
  };

  // Terrain Path Data
  const terrainPath = useMemo(() => {
    let path = "M 0 450 L 0 350";
    for (let x = 0; x <= 800; x += 10) {
      path += ` L ${x} ${terrainHeight(x)}`;
    }
    path += " L 800 450 Z";
    return path;
  }, [terrainHeight]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#1c1c1c] overflow-hidden font-sans text-[#d4d4d4]">
      {/* Unity Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#121212] select-none">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#3b82f6] rounded flex items-center justify-center font-black text-xs">U</div>
            <span className="text-[11px] font-bold opacity-80 uppercase">Fortress Neo Project</span>
          </div>
          <div className="flex items-center gap-4 ml-4">
             <div className="bg-[#1a1a1a] px-3 py-1 rounded text-[10px] font-bold text-indigo-400 border border-white/5 uppercase">Level: {matchLevel}</div>
             <div className="bg-[#1a1a1a] px-3 py-1 rounded text-[10px] font-bold text-rose-400 border border-white/5 uppercase">Enemies: {players.filter((p, i) => i > 0 && p.hp > 0).length}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[#1a1a1a] p-0.5 rounded-lg border border-white/5">
          <button onClick={() => setIsPlaying(!isPlaying)} className={`p-1.5 rounded transition-colors ${isPlaying ? 'text-indigo-400 bg-white/5' : 'text-slate-500'}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button onClick={handleRestart} className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          </button>
        </div>
        <div className="text-[10px] font-bold opacity-30 uppercase">Authoritative Physics Active</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Hierarchy */}
        <div className="w-64 bg-[#232323] border-r border-[#121212] flex flex-col select-none">
          <div className="px-3 py-2 border-b border-[#121212] flex justify-between">
            <span className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Hierarchy</span>
          </div>
          <div className="p-2 space-y-0.5 overflow-y-auto">
            <div className="px-2 py-1.5 rounded text-[11px] font-medium opacity-40">MainScene</div>
            <div className="px-4 py-1.5 rounded text-[11px] font-medium opacity-80 flex items-center gap-2">
              <span className="text-emerald-500">🏔️</span> ProceduralMountain
            </div>
            {players.map((p, i) => (
              <div 
                key={p.id} 
                onClick={() => setSelectedObjectId(p.id)}
                className={`px-4 py-1.5 rounded text-[11px] font-medium cursor-pointer flex items-center justify-between ${selectedObjectId === p.id ? 'bg-[#3b82f6] text-white' : 'hover:bg-white/5 opacity-80'}`}
              >
                <div className="flex items-center gap-2">
                  <span>{i === 0 ? '🚜' : '🚛'}</span>
                  <span className={p.hp <= 0 ? 'line-through opacity-40' : ''}>{p.name}</span>
                </div>
                {p.isAI && <span className="text-[8px] opacity-40 uppercase">AI</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Scene Viewport */}
        <div className="flex-1 bg-[#1a1a1a] flex flex-col relative group">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className={`w-full aspect-video max-h-[70vh] bg-[#050505] border border-[#2d2d2d] shadow-2xl relative overflow-hidden ${isShaking ? 'animate-bounce' : ''}`}>
              <svg width="100%" height="100%" viewBox="0 0 800 450" className="select-none cursor-default">
                {/* Background Grid */}
                <g opacity="0.05">
                  {Array.from({length: 10}).map((_, i) => <line key={`v-${i}`} x1={i * 80} y1="0" x2={i * 80} y2="450" stroke="white" />)}
                  {Array.from({length: 10}).map((_, i) => <line key={`h-${i}`} x1="0" y1={i * 45} x2="800" y2={i * 45} stroke="white" />)}
                </g>

                {/* Terrain */}
                <path d={terrainPath} fill="#121212" stroke="#2d2d2d" strokeWidth="2" />

                {/* Wind Particles */}
                {Math.abs(wind) > 0 && Array.from({length: 10}).map((_, i) => (
                  <rect key={i} x={(Date.now() / 10 * Math.abs(wind) + i * 100) % 800} y={50 + i * 30} width="20" height="1" fill="white" opacity="0.1" />
                ))}

                {/* Players */}
                {players.map((p, i) => {
                  const isTurn = currentPlayerIndex === i && !gameOver;
                  const isSelected = selectedObjectId === p.id;
                  if (p.hp <= 0) return null;
                  return (
                    <g key={p.id} transform={`translate(${p.x}, ${p.y})`} className="cursor-pointer" onClick={() => setSelectedObjectId(p.id)}>
                      {isSelected && <circle r="40" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 4" className="animate-spin" style={{ animationDuration: '5s' }} />}
                      <text x="0" y="5" textAnchor="middle" dominantBaseline="middle" fontSize="32" className={isTurn ? 'animate-pulse' : ''}>
                        {i === 0 ? '🚜' : '🚛'}
                      </text>
                      <g transform="translate(0, -50)">
                        <rect x="-25" y="-12" width="50" height="4" fill="#000" rx="2" />
                        <rect x="-25" y="-12" width={(p.hp / p.maxHp) * 50} height="4" fill={p.hp < 30 ? '#ef4444' : p.color} rx="2" />
                      </g>
                    </g>
                  );
                })}

                {/* Trajectory */}
                {!isFiring && !gameOver && isPlaying && <path d={`M ${trajectory.map(p => `${p.x} ${p.y}`).join(' L ')}`} fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="5 5" opacity="0.3" />}

                {/* Shell */}
                {isFiring && projectilePos && (
                  <g transform={`translate(${projectilePos.x}, ${projectilePos.y})`}>
                    <circle r="4" fill="#fbbf24" filter="blur(1px)" />
                    <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fontSize="20">💣</text>
                  </g>
                )}

                {/* FX */}
                {explosion && <g transform={`translate(${explosion.x}, ${explosion.y})`}><circle r="40" fill={explosion.color} opacity="0.2" className="animate-ping" /><circle r="10" fill="white" filter="blur(4px)" /></g>}
              </svg>

              {/* Game Over Overlays */}
              {gameOver && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm z-50">
                  <div className="text-center p-12 border border-white/10 rounded-3xl bg-[#121212] shadow-2xl">
                    <h2 className={`text-4xl font-black mb-4 uppercase ${victoryState ? 'text-indigo-400' : 'text-rose-500'}`}>
                      {victoryState ? 'Strategic Success' : 'Critical Failure'}
                    </h2>
                    <p className="text-slate-400 mb-8 font-bold">
                      {victoryState ? `Target Sector Clear. Area Level ${matchLevel} Complete.` : "Sector Lost. Command Unit Destroyed."}
                    </p>
                    <div className="flex gap-4 justify-center">
                       {victoryState ? (
                         <button onClick={handleNextLevel} className="px-8 py-3 bg-indigo-600 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/30">Next Mission (Level {matchLevel + 1})</button>
                       ) : (
                         <button onClick={handleRestart} className="px-8 py-3 bg-rose-600 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-rose-600/30">Retry Level 1</button>
                       )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick Status Bar */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-12 bg-black/60 backdrop-blur px-8 py-3 rounded-full border border-white/5 shadow-2xl pointer-events-none">
                <div className="flex flex-col items-center">
                   <span className="text-[8px] font-black opacity-30 uppercase">Wind Vector</span>
                   <span className="text-xs font-black text-indigo-400">{wind > 0 ? '→' : wind < 0 ? '←' : '•'} {Math.abs(wind)}m/s</span>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-[8px] font-black opacity-30 uppercase">Trajectory Angle</span>
                   <span className="text-xs font-black text-white">{angle}°</span>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-[8px] font-black opacity-30 uppercase">Active Turn</span>
                   <span className={`text-xs font-black uppercase ${activePlayer?.isAI ? 'text-rose-500' : 'text-indigo-500'}`}>
                     {activePlayer?.name} {activePlayer?.isAI ? '(AI)' : '(You)'}
                   </span>
                </div>
            </div>
          </div>

          {/* Console */}
          <div className="h-40 bg-[#232323] border-t border-[#121212] flex flex-col">
            <div className="px-3 py-1.5 border-b border-[#121212] flex items-center justify-between text-[10px] font-bold uppercase tracking-widest opacity-60">
              <span>Output Console</span>
              <button onClick={() => setLogs([])} className="opacity-40 hover:opacity-100">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-mono text-[9px] space-y-1">
              {logs.map(log => (
                <div key={log.id} className={`flex gap-3 px-2 py-0.5 rounded ${log.type === 'Warning' ? 'text-yellow-500' : log.type === 'Error' ? 'text-rose-500' : log.type === 'Success' ? 'text-indigo-400' : 'opacity-80'}`}>
                  <span className="opacity-30">[{log.timestamp}]</span>
                  <span className="font-bold">[{log.type.toUpperCase()}]</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inspector */}
        <div className="w-80 bg-[#232323] border-l border-[#121212] flex flex-col select-none overflow-y-auto">
          <div className="px-3 py-2 border-b border-[#121212] flex items-center gap-2">
            <span className="text-[10px] font-black uppercase opacity-60">Inspector</span>
          </div>
          
          <div className="p-4 space-y-6">
            {typeof selectedObjectId === 'number' && players.find(p => p.id === selectedObjectId) ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black border border-white/5 rounded-xl flex items-center justify-center text-2xl">
                    {selectedObjectId === 1 ? '🚜' : '🚛'}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{players.find(p => p.id === selectedObjectId)?.name}</h3>
                    <p className="text-[9px] opacity-40 uppercase">Instance Component</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">Transform Data</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                       <div className="bg-black/20 p-2 rounded border border-white/5 flex justify-between">
                         <span className="text-rose-500">X</span>
                         <span>{Math.round(players.find(p => p.id === selectedObjectId)!.x)}</span>
                       </div>
                       <div className="bg-black/20 p-2 rounded border border-white/5 flex justify-between">
                         <span className="text-emerald-500">Y</span>
                         <span>{Math.round(players.find(p => p.id === selectedObjectId)!.y)}</span>
                       </div>
                    </div>
                  </div>

                  {!players.find(p => p.id === selectedObjectId)!.isAI && (
                    <div className="space-y-6 pt-4 border-t border-white/5">
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-bold uppercase opacity-40">
                          <span>Barrel Elevation</span>
                          <span>{angle}°</span>
                        </div>
                        <input type="range" min="0" max="90" value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="w-full h-1 bg-black rounded appearance-none cursor-pointer accent-indigo-500" />
                        <div className="flex justify-center gap-2 opacity-40">
                           <span className="text-[8px] border border-white/20 px-1 rounded">↑</span>
                           <span className="text-[8px] border border-white/20 px-1 rounded">↓</span>
                           <span className="text-[8px] uppercase font-bold tracking-tighter">to adjust</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-bold uppercase opacity-40">
                          <span>Payload Force</span>
                          <span>{power}u</span>
                        </div>
                        <input type="range" min="10" max="150" value={power} onChange={(e) => setPower(Number(e.target.value))} className="w-full h-1 bg-black rounded appearance-none cursor-pointer accent-indigo-500" />
                      </div>

                      <button 
                        onClick={fire}
                        disabled={isFiring || gameOver || activePlayer?.isAI}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
                      >
                        Engage Shell (Space)
                      </button>
                    </div>
                  )}
                  
                  {players.find(p => p.id === selectedObjectId)!.isAI && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center">
                       <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-2">AI Routine Active</span>
                       <p className="text-[9px] opacity-60 leading-tight italic">Analyzing atmospheric turbulence and target vector...</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center opacity-20">
                <span className="text-3xl mb-4">🔍</span>
                <p className="text-[10px] font-black uppercase tracking-widest">Select entity to view properties</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BallisticsPrototype;
