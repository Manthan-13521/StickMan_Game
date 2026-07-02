import { PLAYER_CONFIG, ATTACK_CONFIG, COMBAT_CONFIG } from 'shared';
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
  attackType: 'punch' | 'kick' | 'heavy' | 'ultimate' | null = null;
  hitstopTimer: number = 0;
  knockbackTimer: number = 0;
  invincibilityTimer: number = 0;
  input: PlayerInput | null = null;
  lastProcessedSeq: number = -1;
  lastHitTime: number = 0;
  comboResetTimer: number = 0;
  wasHitDuringAttack: boolean = false;
  ultimateArmorTimer: number = 0;

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

  getLastProcessedSeq(): number {
    return this.lastProcessedSeq;
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

    if (this.ultimateArmorTimer > 0) {
      this.ultimateArmorTimer--;
    }

    if (this.comboResetTimer > 0) {
      this.comboResetTimer--;
      if (this.comboResetTimer <= 0) {
        this.combo = 0;
      }
    }

    if (this.knockbackTimer > 0) {
      this.knockbackTimer--;
      return;
    }

    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer--;
    }

    if (this.attackTimer > 0) {
      this.attackTimer--;
      return;
    }

    if (this.stance === PlayerStance.GETTING_UP) {
      this.stance = PlayerStance.IDLE;
    }

    if (this.stance === PlayerStance.HIT) {
      this.stance = PlayerStance.IDLE;
      return;
    }

    if (!this.input) return;
    const input = this.input;

    this.isBlocking = input.block && this.isGrounded;

    this.handleAttackInput(input);

    if (this.attackType) return;

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

  private handleAttackInput(input: PlayerInput): void {
    const both = input.punch && input.kick;

    if (both && this.ultimate >= COMBAT_CONFIG.ULTIMATE_COST) {
      this.startAttack('ultimate');
      return;
    }

    if (both) {
      this.startAttack('heavy');
      return;
    }

    if (this.attackType && this.attackTimer > 0) {
      const config = this.getAttackConfig(this.attackType)!;
      const totalFrames = config.startup + config.active + config.recovery;
      const framesElapsed = totalFrames - this.attackTimer;
      const cancelWindowEnd = config.startup + Math.floor(config.active * COMBAT_CONFIG.CANCEL_WINDOW_RATIO);

      if (config.chainInto && framesElapsed <= cancelWindowEnd) {
        if (config.chainInto === 'kick' && input.kick) {
          this.startAttack('kick');
          return;
        }
      }
    }

    if (input.punch) {
      this.startAttack('punch');
      return;
    }

    if (input.kick) {
      this.startAttack('kick');
      return;
    }
  }

  private startAttack(type: 'punch' | 'kick' | 'heavy' | 'ultimate'): void {
    const config = this.getAttackConfig(type);
    if (!config) return;

    this.attackType = type;
    this.attackTimer = config.startup + config.active + config.recovery;

    if (type === 'ultimate') {
      this.ultimate = 0;
      this.ultimateArmorTimer = COMBAT_CONFIG.ULTIMATE_ARMOR_DURATION;
      this.stance = PlayerStance.PUNCHING;
    } else {
      this.stance = type === 'kick' ? PlayerStance.KICKING : PlayerStance.PUNCHING;
    }
  }

  private endAttack(): void {
    this.attackTimer = 0;
    this.attackType = null;
    this.stance = PlayerStance.IDLE;
  }

  getCurrentAttackConfig() {
    if (!this.attackType) return null;
    return this.getAttackConfig(this.attackType);
  }

  getAttackConfig(type: string | null) {
    switch (type) {
      case 'punch': return ATTACK_CONFIG.PUNCH;
      case 'kick': return ATTACK_CONFIG.KICK;
      case 'heavy': return ATTACK_CONFIG.HEAVY;
      case 'ultimate': return ATTACK_CONFIG.ULTIMATE;
      default: return null;
    }
  }

  takeDamage(damage: number, knockbackX: number, knockbackY: number, hitStop: number, isJuggle = false): void {
    if (this.invincibilityTimer > 0) return;

    if (this.ultimateArmorTimer > 0) return;

    if (this.isBlocking) {
      damage = Math.floor(damage * PLAYER_CONFIG.BLOCK_DAMAGE_MULTIPLIER);
      knockbackX *= 0.3;
      knockbackY *= 0.3;
    }

    this.health = Math.max(0, this.health - damage);
    this.velocityX = knockbackX;
    this.velocityY = knockbackY;
    this.hitstopTimer = hitStop;
    this.knockbackTimer = PLAYER_CONFIG.KNOCKBACK_DURATION;
    this.stance = PlayerStance.HIT;
    this.invincibilityTimer = PLAYER_CONFIG.INVINCIBILITY_DURATION;
    this.combo = isJuggle ? this.combo : 0;
    this.lastHitTime = Date.now();
  }

  applyGroundBounce(): void {
    this.velocityY = COMBAT_CONFIG.GROUND_BOUNCE_VY;
    this.knockbackTimer = PLAYER_CONFIG.KNOCKBACK_DURATION;
  }

  startCombo(): void {
    this.combo++;
    this.comboResetTimer = COMBAT_CONFIG.COMBO_TIMER_MS / (1000 / 50);
  }

  addUltimate(amount: number): void {
    this.ultimate = Math.min(PLAYER_CONFIG.ULTIMATE_MAX, this.ultimate + amount);
  }

  get ultimateReady(): boolean {
    return this.ultimate >= COMBAT_CONFIG.ULTIMATE_COST;
  }

  postUpdate(): void {
    this.input = null;
  }
}
