import { PLAYER_CONFIG, ATTACK_CONFIG } from 'shared';
import type { PlayerInput } from 'shared';
import { PlayerStance } from 'shared';

export class ServerPlayer {
  id: string;
  playerIndex: number;
  x: number;
  y: number;
  velocityX: number = 0;
  velocityY: number = 0;
  facingRight: boolean;
  stance: PlayerStance = PlayerStance.IDLE;
  health: number;
  maxHealth: number;
  combo: number = 0;
  ultimate: number = 0;
  wins: number;
  isBlocking: boolean = false;
  isGrounded: boolean = true;
  attackTimer: number = 0;
  attackType: 'punch' | 'kick' | 'heavy' | null = null;
  currentAttack: string | null = null;
  hitstopTimer: number = 0;
  knockbackTimer: number = 0;
  invincibilityTimer: number = 0;
  input: PlayerInput | null = null;
  lastProcessedSeq: number = -1;
  lastHitTime: number = 0;

  constructor(id: string, playerIndex: number, x: number, y: number, wins: number) {
    this.id = id;
    this.playerIndex = playerIndex;
    this.x = x;
    this.y = y;
    this.facingRight = playerIndex === 0;
    this.health = PLAYER_CONFIG.MAX_HEALTH;
    this.maxHealth = PLAYER_CONFIG.MAX_HEALTH;
    this.wins = wins;
  }

  setInput(input: PlayerInput): void {
    if (input.sequence <= this.lastProcessedSeq) return;
    this.input = input;
    this.lastProcessedSeq = input.sequence;
  }

  update(): void {
    if (this.health <= 0) {
      this.stance = PlayerStance.DEAD;
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer--;
      return;
    }

    if (this.knockbackTimer > 0) {
      this.knockbackTimer--;
      if (this.knockbackTimer <= 0) {
        this.stance = PlayerStance.GETTING_UP;
      }
      return;
    }

    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer--;
    }

    if (this.attackTimer > 0) {
      this.attackTimer--;
      if (this.attackTimer <= 0) {
        this.endAttack();
      }
      return;
    }

    if (this.stance === PlayerStance.HIT || this.stance === PlayerStance.GETTING_UP) {
      return;
    }

    if (!this.input) return;
    const input = this.input;

    this.isBlocking = input.block && this.isGrounded;

    if (input.punch) {
      this.startAttack('punch');
      return;
    }

    if (input.kick) {
      this.startAttack('kick');
      return;
    }

    if (input.left && input.right) {
      this.velocityX = 0;
    } else if (input.left) {
      this.velocityX = -PLAYER_CONFIG.SPEED;
      this.facingRight = false;
    } else if (input.right) {
      this.velocityX = PLAYER_CONFIG.SPEED;
      this.facingRight = true;
    } else {
      this.velocityX *= PLAYER_CONFIG.GROUND_FRICTION;
    }

    if (input.up && this.isGrounded) {
      this.velocityY = PLAYER_CONFIG.JUMP_FORCE;
      this.isGrounded = false;
    }

    if (Math.abs(this.velocityX) > 10) {
      this.stance = PlayerStance.WALKING;
    } else {
      this.stance = PlayerStance.IDLE;
    }
  }

  postUpdate(): void {
    this.input = null;
  }

  private startAttack(type: 'punch' | 'kick' | 'heavy'): void {
    this.attackType = type;
    const config = type === 'punch' ? ATTACK_CONFIG.PUNCH : type === 'kick' ? ATTACK_CONFIG.KICK : ATTACK_CONFIG.HEAVY;
    this.attackTimer = config.startup + config.active + config.recovery;
    this.stance = type === 'punch' ? PlayerStance.PUNCHING : PlayerStance.KICKING;
    this.currentAttack = type;
  }

  private endAttack(): void {
    this.attackTimer = 0;
    this.currentAttack = null;
    this.attackType = null;
    this.stance = PlayerStance.IDLE;
  }

  takeDamage(damage: number, knockbackX: number, knockbackY: number, hitStop: number): void {
    if (this.invincibilityTimer > 0) return;

    if (this.isBlocking) {
      damage = Math.floor(damage * PLAYER_CONFIG.BLOCK_DAMAGE_MULTIPLIER);
      knockbackX *= 0.3;
    }

    this.health = Math.max(0, this.health - damage);
    this.velocityX = knockbackX;
    this.velocityY = knockbackY;
    this.hitstopTimer = hitStop;
    this.knockbackTimer = PLAYER_CONFIG.KNOCKBACK_DURATION;
    this.stance = PlayerStance.HIT;
    this.invincibilityTimer = PLAYER_CONFIG.INVINCIBILITY_DURATION;
    this.combo = 0;
    this.lastHitTime = Date.now();
  }

  startCombo(): void {
    this.combo++;
  }

  addUltimate(amount: number): void {
    this.ultimate = Math.min(PLAYER_CONFIG.ULTIMATE_MAX, this.ultimate + amount);
  }
}
