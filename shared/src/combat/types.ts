import { PlayerStance } from '../types';

export interface AttackConfig {
  damage: number;
  range: number;
  startup: number;
  active: number;
  recovery: number;
  knockback: number;
  knockbackY: number;
  hitstop: number;
  comboWindow: number;
  chainInto: string | null;
  groundBounce: boolean;
}

export interface CombatState {
  health: number;
  maxHealth: number;
  combo: number;
  ultimate: number;
  wins: number;
  isBlocking: boolean;
  isGrounded: boolean;
  facingRight: boolean;
  attackType: string | null;
  attackTimer: number;
  hitstopTimer: number;
  knockbackTimer: number;
  invincibilityTimer: number;
  ultimateArmorTimer: number;
  comboResetTimer: number;
  stance: PlayerStance;
  alive: boolean;
  lastHitTime: number;
}

export type AttackType = 'punch' | 'kick' | 'heavy' | 'ultimate';
