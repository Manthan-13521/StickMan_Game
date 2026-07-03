import { PLAYER_CONFIG, COMBAT_CONFIG, ATTACK_CONFIG } from '../constants';
import { PlayerStance } from '../types';
import type { PlayerInput } from '../types';
import type { CombatState, AttackConfig, AttackType } from './types';

export function createCombatState(wins = 0): CombatState {
  return {
    health: PLAYER_CONFIG.MAX_HEALTH,
    maxHealth: PLAYER_CONFIG.MAX_HEALTH,
    combo: 0,
    ultimate: 0,
    wins,
    isBlocking: false,
    isGrounded: true,
    facingRight: true,
    attackType: null,
    attackTimer: 0,
    hitstopTimer: 0,
    knockbackTimer: 0,
    invincibilityTimer: 0,
    ultimateArmorTimer: 0,
    comboResetTimer: 0,
    knockdownTimer: 0,
    stance: PlayerStance.IDLE,
    alive: true,
    lastHitTime: 0,
  };
}

export function getAttackConfig(type: string | null): AttackConfig | null {
  switch (type) {
    case 'punch': return ATTACK_CONFIG.PUNCH as AttackConfig;
    case 'kick': return ATTACK_CONFIG.KICK as AttackConfig;
    case 'heavy': return ATTACK_CONFIG.HEAVY as AttackConfig;
    case 'ultimate': return ATTACK_CONFIG.ULTIMATE as AttackConfig;
    default: return null;
  }
}

export function getAttackTotalDuration(type: string | null): number {
  const cfg = getAttackConfig(type);
  if (!cfg) return 0;
  return cfg.startup + cfg.active + cfg.recovery;
}

export function getAttackPhase(state: CombatState): 'idle' | 'startup' | 'active' | 'recovery' {
  if (!state.attackType || state.attackTimer <= 0) return 'idle';
  const total = getAttackTotalDuration(state.attackType);
  if (total <= 0) return 'idle';
  const elapsed = total - state.attackTimer;
  const cfg = getAttackConfig(state.attackType)!;
  if (elapsed < cfg.startup) return 'startup';
  if (elapsed < cfg.startup + cfg.active) return 'active';
  return 'recovery';
}

export function updateCombatTimers(state: CombatState, dt: number): void {
  if (!state.alive) return;

  if (state.hitstopTimer > 0) {
    state.hitstopTimer = Math.max(0, state.hitstopTimer - dt);
  }

  if (state.ultimateArmorTimer > 0) {
    state.ultimateArmorTimer = Math.max(0, state.ultimateArmorTimer - dt);
  }

  if (state.comboResetTimer > 0) {
    state.comboResetTimer = Math.max(0, state.comboResetTimer - dt);
    if (state.comboResetTimer <= 0) {
      state.combo = 0;
    }
  }

  if (state.invincibilityTimer > 0) {
    state.invincibilityTimer = Math.max(0, state.invincibilityTimer - dt);
  }

  if (state.attackTimer > 0) {
    state.attackTimer = Math.max(0, state.attackTimer - dt);
    if (state.attackTimer <= 0) {
      state.attackType = null;
    }
  }
}

export function handleAttackInput(
  state: CombatState,
  input: PlayerInput,
): void {
  if (!state.alive) return;
  if (state.hitstopTimer > 0) return;
  if (state.knockbackTimer > 0) return;

  const both = input.punch && input.kick;

  if (both && state.ultimate >= COMBAT_CONFIG.ULTIMATE_COST) {
    startAttack(state, 'ultimate');
    return;
  }

  if (both) {
    startAttack(state, 'heavy');
    return;
  }

  if (state.attackType && state.attackTimer > 0) {
    const cfg = getAttackConfig(state.attackType);
    if (cfg && cfg.chainInto) {
      const total = getAttackTotalDuration(state.attackType);
      const elapsed = total - state.attackTimer;
      const cancelWindowEnd = cfg.startup + Math.floor(cfg.active * COMBAT_CONFIG.CANCEL_WINDOW_RATIO);
      if (elapsed <= cancelWindowEnd) {
        if (cfg.chainInto === 'kick' && input.kick) {
          startAttack(state, 'kick');
          return;
        }
      }
    }
  }

  if (input.punch) {
    startAttack(state, 'punch');
    return;
  }

  if (input.kick) {
    startAttack(state, 'kick');
    return;
  }
}

export function startAttack(state: CombatState, type: AttackType): void {
  const cfg = getAttackConfig(type);
  if (!cfg) return;

  state.attackType = type;
  state.attackTimer = cfg.startup + cfg.active + cfg.recovery;

  if (type === 'ultimate') {
    state.ultimate = 0;
    state.ultimateArmorTimer = COMBAT_CONFIG.ULTIMATE_ARMOR_DURATION;
  }

  state.stance = type === 'kick' ? PlayerStance.KICKING : PlayerStance.PUNCHING;
}

export function checkHit(
  attacker: CombatState,
  defender: CombatState,
  attackConfig: AttackConfig,
  dist: number,
  yDist: number,
): boolean {
  if (defender.health <= 0) return false;
  if (defender.invincibilityTimer > 0) return false;
  if (defender.ultimateArmorTimer > 0) return false;
  if (!attacker.attackType || attacker.attackTimer <= 0) return false;

  const phase = getAttackPhase(attacker);
  if (phase !== 'active') return false;

  if (dist >= attackConfig.range) return false;
  if (Math.abs(yDist) > 80) return false;

  return true;
}

export interface HitResult {
  damage: number;
  actualDamage: number;
  wasBlocking: boolean;
}

export function applyHit(
  attacker: CombatState,
  defender: CombatState,
  attackConfig: AttackConfig,
  direction: number,
): HitResult {
  let damage: number = attackConfig.damage;

  if (attacker.combo > 0) {
    damage = Math.max(1, Math.floor(damage * Math.pow(COMBAT_CONFIG.COMBO_SCALING, attacker.combo)));
  }

  const wasBlocking = defender.isBlocking;
  if (wasBlocking) {
    damage = Math.floor(damage * PLAYER_CONFIG.BLOCK_DAMAGE_MULTIPLIER);
  }

  const actualDamage = Math.min(defender.health, damage);
  defender.health = Math.max(0, defender.health - damage);

  const hitStop = wasBlocking
    ? Math.floor(attackConfig.hitstop * 0.5)
    : attackConfig.hitstop;

  defender.hitstopTimer = hitStop;
  defender.knockbackTimer = PLAYER_CONFIG.KNOCKBACK_DURATION;
  defender.invincibilityTimer = PLAYER_CONFIG.INVINCIBILITY_DURATION;
  defender.stance = PlayerStance.HIT;

  attacker.hitstopTimer = Math.max(attacker.hitstopTimer, hitStop);
  attacker.combo++;
  attacker.comboResetTimer = COMBAT_CONFIG.COMBO_TIMER_MS;

  attacker.ultimate = Math.min(
    PLAYER_CONFIG.ULTIMATE_MAX,
    attacker.ultimate + PLAYER_CONFIG.ULTIMATE_PER_HIT,
  );
  defender.ultimate = Math.min(
    PLAYER_CONFIG.ULTIMATE_MAX,
    defender.ultimate + PLAYER_CONFIG.ULTIMATE_PER_TAKE_HIT,
  );

  defender.lastHitTime = Date.now();

  const knockbackX = direction * attackConfig.knockback;
  const knockbackY = wasBlocking ? attackConfig.knockbackY * 0.3 : attackConfig.knockbackY;

  if (!defender.isGrounded && attackConfig.groundBounce) {
    defender.knockbackTimer = PLAYER_CONFIG.KNOCKBACK_DURATION;
  }

  return {
    damage,
    actualDamage,
    wasBlocking,
  };
}

export function updateStance(state: CombatState, vx: number): void {
  if (state.health <= 0) {
    state.stance = PlayerStance.DEAD;
    return;
  }
  if (state.hitstopTimer > 0 || state.knockbackTimer > 0) {
    if (state.stance === PlayerStance.IDLE) {
      state.stance = PlayerStance.HIT;
    }
    return;
  }
  if (state.attackTimer > 0 && state.attackType) {
    return;
  }
  if (state.isBlocking) {
    state.stance = PlayerStance.BLOCKING;
    return;
  }
  if (!state.isGrounded) {
    state.stance = state.stance === PlayerStance.JUMPING
      ? PlayerStance.JUMPING
      : PlayerStance.FALLING;
    return;
  }
  if (Math.abs(vx) > 50) {
    state.stance = PlayerStance.WALKING;
    return;
  }
  state.stance = PlayerStance.IDLE;
}
