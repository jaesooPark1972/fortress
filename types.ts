
export type WeaponType = 'Standard' | 'Drill' | 'Split' | 'Laser';

export interface Player {
  id: number;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  color: string;
  isAI?: boolean;
}

export interface Target {
  id: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
}

export interface ShotResult {
  playerId: number;
  weapon: WeaponType;
  hit: boolean;
  angle: number;
  power: number;
  wind: number;
  errorType?: 'Power' | 'Angle' | 'Wind';
}

export interface GameSessionStats {
  shots: ShotResult[];
  hits: number;
  misses: number;
}

export interface Idea {
  id: number;
  title: string;
  description: string;
  category: 'Graphic' | 'Success' | 'Core';
  impact: 'High' | 'Medium';
}

export enum TabType {
  DASHBOARD = 'DASHBOARD',
  PROTOTYPE = 'PROTOTYPE',
  STRATEGY = 'STRATEGY',
  ANALYTICS = 'ANALYTICS'
}
