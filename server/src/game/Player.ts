import { PLAYER_CONFIG } from 'shared';
import type { PlayerInput } from 'shared';
import { PlayerStance } from 'shared';
import type { CombatState } from 'shared';
import { createCombatState, getAttackConfig, handleAttackInput, updateCombatTimers, applyHit, updateStance, startAttack } from 'shared';

const TICK_MS = 20;

export class ServerPlayer {
  id: string;
  playerIndex: number;
  x: number;
  y: number;
  velocityX: number = 0;
  velocityY: number = 0;
  facingRight: boolean;
  combat: CombatState;
  input: PlayerInput | null = null;
  lastProcessedSeq: number = -1;
  wasHitDuringAttack: boolean = false;

  constructor(id: string, playerIndex: number, x: number, y: number, wins: number) {
    this.id = id;
    this.playerIndex = playerIndex;
    this.x = x;
    this.y = y;
    this.facingRight = playerIndex === 0;
    this.combat = createCombatState(wins);
    this.combat.facingRight = this.facingRight;
    this.combat.isGrounded = true;
  }

  get health(): number { return this.combat.health; }
  set health(v: number) { this.combat.health = v; }
  get maxHealth(): number { return this.combat.maxHealth; }
  get stance(): PlayerStance { return this.combat.stance; }
  set stance(v: PlayerStance) { this.combat.stance = v; }
  get combo(): number { return this.combat.combo; }
  set combo(v: number) { this.combat.combo = v; }
  get ultimate(): number { return this.combat.ultimate; }
  set ultimate(v: number) { this.combat.ultimate = v; }
  get wins(): number { return this.combat.wins; }
  set wins(v: number) { this.combat.wins = v; }
  get isBlocking(): boolean { return this.combat.isBlocking; }
  set isBlocking(v: boolean) { this.combat.isBlocking = v; }
  get isGrounded(): boolean { return this.combat.isGrounded; }
  set isGrounded(v: boolean) { this.combat.isGrounded = v; }
  get attackTimer(): number { return this.combat.attackTimer; }
  set attackTimer(v: number) { this.combat.attackTimer = v; }
  get attackType(): string | null { return this.combat.attackType; }
  set attackType(v: string | null) { this.combat.attackType = v as any; }
  get hitstopTimer(): number { return this.combat.hitstopTimer; }
  set hitstopTimer(v: number) { this.combat.hitstopTimer = v; }
  get knockbackTimer(): number { return this.combat.knockbackTimer; }
  set knockbackTimer(v: number) { this.combat.knockbackTimer = v; }
  get invincibilityTimer(): number { return this.combat.invincibilityTimer; }
  set invincibilityTimer(v: number) { this.combat.invincibilityTimer = v; }
  get ultimateArmorTimer(): number { return this.combat.ultimateArmorTimer; }
  set ultimateArmorTimer(v: number) { this.combat.ultimateArmorTimer = v; }
  get comboResetTimer(): number { return this.combat.comboResetTimer; }
  set comboResetTimer(v: number) { this.combat.comboResetTimer = v; }
  get ultimateReady(): boolean { return this.combat.ultimate >= 100; }

  setInput(input: PlayerInput): void {
    if (input.sequence <= this.lastProcessedSeq) return;
    this.input = input;
    this.lastProcessedSeq = input.sequence;
  }

  getLastProcessedSeq(): number {
    return this.lastProcessedSeq;
  }

  getCurrentAttackConfig() {
    return getAttackConfig(this.combat.attackType);
  }

  getAttackConfig(type: string | null) {
    return getAttackConfig(type);
  }

  takeDamage(damage: number, knockbackX: number, knockbackY: number, hitStop: number, isJuggle = false): void {
    if (this.combat.invincibilityTimer > 0) return;
    if (this.combat.ultimateArmorTimer > 0) return;

    if (this.combat.isBlocking) {
      damage = Math.floor(damage * PLAYER_CONFIG.BLOCK_DAMAGE_MULTIPLIER);
      knockbackX *= 0.3;
      knockbackY *= 0.3;
    }

    this.combat.health = Math.max(0, this.combat.health - damage);
    this.velocityX = knockbackX;
    this.velocityY = knockbackY;
    this.combat.hitstopTimer = hitStop;
    this.combat.knockbackTimer = PLAYER_CONFIG.KNOCKBACK_DURATION;
    this.combat.stance = PlayerStance.HIT;
    this.combat.invincibilityTimer = PLAYER_CONFIG.INVINCIBILITY_DURATION;
    this.combat.combo = isJuggle ? this.combat.combo : 0;
    this.combat.lastHitTime = Date.now();
  }

  applyGroundBounce(): void {
    this.velocityY = -400;
    this.combat.knockbackTimer = PLAYER_CONFIG.KNOCKBACK_DURATION;
  }

  startCombo(): void {
    this.combat.combo++;
    this.combat.comboResetTimer = 2000;
  }

  addUltimate(amount: number): void {
    this.combat.ultimate = Math.min(100, this.combat.ultimate + amount);
  }

  update(): void {
    if (this.combat.health <= 0) {
      this.combat.stance = PlayerStance.DEAD;
      return;
    }

    updateCombatTimers(this.combat, TICK_MS);

    if (this.combat.hitstopTimer > 0) return;
    if (this.combat.knockbackTimer > 0) return;

    if (this.combat.stance === PlayerStance.GETTING_UP) {
      this.combat.stance = PlayerStance.IDLE;
    }

    if (this.combat.stance === PlayerStance.HIT) {
      this.combat.stance = PlayerStance.IDLE;
      return;
    }

    if (this.combat.attackTimer > 0) return;

    if (!this.input) return;
    const input = this.input;

    this.combat.isBlocking = input.block && this.combat.isGrounded;

    handleAttackInput(this.combat, input);

    if (this.combat.attackType) return;

    if (input.left && input.right) {
      this.velocityX = 0;
    } else if (input.left) {
      this.velocityX = -PLAYER_CONFIG.SPEED;
      this.facingRight = false;
      this.combat.facingRight = false;
    } else if (input.right) {
      this.velocityX = PLAYER_CONFIG.SPEED;
      this.facingRight = true;
      this.combat.facingRight = true;
    } else {
      this.velocityX *= PLAYER_CONFIG.GROUND_FRICTION;
    }

    if (input.up && this.combat.isGrounded) {
      this.velocityY = PLAYER_CONFIG.JUMP_FORCE;
      this.combat.isGrounded = false;
    }

    if (Math.abs(this.velocityX) > 10) {
      this.combat.stance = PlayerStance.WALKING;
    } else {
      this.combat.stance = PlayerStance.IDLE;
    }
  }

  postUpdate(): void {
    this.input = null;
  }
}
