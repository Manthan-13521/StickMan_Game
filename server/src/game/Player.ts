import { PLAYER_CONFIG } from 'shared';
import type { PlayerInput } from 'shared';
import { PlayerStance } from 'shared';
import type { CombatState, PhysicalState } from 'shared';
import { createCombatState, getAttackConfig, handleAttackInput, updateCombatTimers, createPhysicalState } from 'shared';

const TICK_MS = 20;

export class ServerPlayer {
  id: string;
  playerIndex: number;
  phys: PhysicalState;
  combat: CombatState;
  input: PlayerInput | null = null;
  lastProcessedSeq: number = -1;
  wasHitDuringAttack: boolean = false;
  getupTimer = 0;

  constructor(id: string, playerIndex: number, x: number, y: number, wins: number) {
    this.id = id;
    this.playerIndex = playerIndex;
    this.phys = createPhysicalState(x, y, playerIndex === 0);
    this.phys.grounded = true;
    this.combat = createCombatState(wins);
    this.combat.facingRight = playerIndex === 0;
    this.combat.isGrounded = true;
  }

  get x(): number { return this.phys.x; }
  set x(v: number) { this.phys.x = v; }
  get y(): number { return this.phys.y; }
  set y(v: number) { this.phys.y = v; }
  get velocityX(): number { return this.phys.vx; }
  set velocityX(v: number) { this.phys.vx = v; }
  get velocityY(): number { return this.phys.vy; }
  set velocityY(v: number) { this.phys.vy = v; }
  get facingRight(): boolean { return this.phys.facingRight; }
  set facingRight(v: boolean) { this.phys.facingRight = v; }

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
    this.phys.vx = knockbackX;
    this.phys.vy = knockbackY;
    this.combat.hitstopTimer = hitStop;
    this.combat.knockbackTimer = PLAYER_CONFIG.KNOCKBACK_DURATION;
    this.combat.stance = PlayerStance.HIT;
    this.combat.invincibilityTimer = PLAYER_CONFIG.INVINCIBILITY_DURATION;
    this.combat.combo = isJuggle ? this.combat.combo : 0;
    this.combat.lastHitTime = Date.now();
  }

  applyGroundBounce(): void {
    this.phys.vy = -400;
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

    if (this.combat.knockdownTimer > 0) {
      this.combat.knockdownTimer = Math.max(0, this.combat.knockdownTimer - TICK_MS);
      if (this.combat.knockdownTimer <= 0) {
        this.combat.stance = PlayerStance.GETTING_UP;
        this.getupTimer = 400;
      }
      return;
    }

    if (this.getupTimer > 0) {
      this.getupTimer = Math.max(0, this.getupTimer - TICK_MS);
      if (this.getupTimer <= 0) {
        this.combat.stance = PlayerStance.IDLE;
      }
      return;
    }

    if (this.combat.knockbackTimer > 0) return;

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

    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const jump = input.up;
    const fastFall = input.down && !this.combat.isGrounded;
    const dt = TICK_MS / 1000;

    if (jump && this.combat.isGrounded) {
      this.phys.vy = PLAYER_CONFIG.JUMP_FORCE;
      this.combat.isGrounded = false;
      this.phys.jumpsLeft = 1;
    } else if (jump && !this.combat.isGrounded && this.phys.jumpsLeft > 0) {
      this.phys.vy = PLAYER_CONFIG.DOUBLE_JUMP_FORCE;
      this.phys.jumpsLeft--;
    }

    if (!this.combat.isGrounded) {
      if (fastFall && this.phys.vy > 0) {
        this.phys.vy = Math.min(this.phys.vy + PLAYER_CONFIG.FAST_FALL_SPEED * dt, PLAYER_CONFIG.FAST_FALL_SPEED);
      }
      this.phys.vx *= PLAYER_CONFIG.AIR_FRICTION;
    } else {
      this.phys.jumpsLeft = 1;
      this.phys.vx += moveX * PLAYER_CONFIG.WALK_ACCELERATION * dt;
      if (moveX === 0) {
        this.phys.vx *= PLAYER_CONFIG.GROUND_FRICTION;
      }
    }

    if (moveX !== 0) {
      this.phys.facingRight = moveX > 0;
      this.combat.facingRight = moveX > 0;
    }

    const maxSpeed = PLAYER_CONFIG.SPEED;
    if (Math.abs(this.phys.vx) > maxSpeed) {
      this.phys.vx = Math.sign(this.phys.vx) * maxSpeed;
    }

    if (Math.abs(this.phys.vx) < 5) {
      this.phys.vx = 0;
    }

    if (Math.abs(this.phys.vx) > 10) {
      this.combat.stance = PlayerStance.WALKING;
    } else {
      this.combat.stance = PlayerStance.IDLE;
    }
  }

  postUpdate(): void {
    this.input = null;
  }
}
