import Phaser from 'phaser';
import {
  PLAYER_CONFIG, COMBAT_CONFIG, ATTACK_CONFIG, GAME_CONFIG,
  PlayerStance,
} from '@/shared';
import type { GameStateSnapshot, PlayerSnapshot } from '@/shared';
import { Stickman } from '../entities/Stickman';
import { InputManager, type GameInput } from '../input/InputManager';
import { createPhysicsState, updatePhysics, pushApart, type PhysicalState } from '../systems/LocalPhysics';
import { CombatHUD } from '../ui/CombatHUD';
import { CountdownOverlay } from '../ui/CountdownOverlay';
import { WinScreen } from '../ui/WinScreen';
import { ParticleEffects } from '../effects/ParticleEffects';

interface CombatState {
  health: number;
  maxHealth: number;
  combo: number;
  ultimate: number;
  ultimateReady: boolean;
  wins: number;
  hitstopTimer: number;
  attackTimer: number;
  attackType: 'punch' | 'kick' | 'heavy' | 'ultimate' | null;
  isBlocking: boolean;
  inHitstun: boolean;
  invincibilityTimer: number;
  alive: boolean;
}

const P2_INPUT: GameInput = { left: false, right: false, up: false, down: false, punch: false, kick: false, block: false };

function createCombatState(wins = 0): CombatState {
  return {
    health: PLAYER_CONFIG.MAX_HEALTH,
    maxHealth: PLAYER_CONFIG.MAX_HEALTH,
    combo: 0,
    ultimate: 0,
    ultimateReady: false,
    wins,
    hitstopTimer: 0,
    attackTimer: 0,
    attackType: null,
    isBlocking: false,
    inHitstun: false,
    invincibilityTimer: 0,
    alive: true,
  };
}

export class GameScene extends Phaser.Scene {
  private stickmen: Stickman[] = [];
  private physStates: PhysicalState[] = [];
  private combatStates: CombatState[] = [createCombatState(), createCombatState()];
  private inputManager: InputManager | null = null;
  private networkState: GameStateSnapshot | null = null;
  private localMode = true;
  private walkPhase = 0;

  private hud: CombatHUD | null = null;
  private countdown: CountdownOverlay | null = null;
  private winScreen: WinScreen | null = null;
  private particles: ParticleEffects | null = null;

  private round = 1;
  private roundTimer: number = GAME_CONFIG.ROUND_DURATION;
  private fighting = false;
  private koTimer = 0;
  private KO_DELAY_FRAMES = GAME_CONFIG.KO_DELAY;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.drawArena();
    this.cameras.main.setBackgroundColor('#0f0d2e');

    this.stickmen = [new Stickman(this), new Stickman(this)];
    this.resetPositions();

    this.inputManager = new InputManager();
    this.hud = new CombatHUD(this);
    this.countdown = new CountdownOverlay(this);
    this.winScreen = new WinScreen(this);
    this.particles = new ParticleEffects(this);

    this.round = 1;
    this.roundTimer = GAME_CONFIG.ROUND_DURATION;
    this.fighting = false;
    this.koTimer = 0;

    this.countdown.start(() => {
      this.fighting = true;
    });
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    if (dt > 0.05) return;
    if (this.stickmen.length < 2 || this.combatStates.length < 2) return;

    this.countdown?.update(dt);

    if (!this.fighting) {
      this.renderIdle();
      return;
    }

    if (this.koTimer > 0) {
      this.koTimer -= 16;
      this.renderIdle();
      return;
    }

    this.walkPhase += dt * 8;

    for (let i = 0; i < 2; i++) {
      const cs = this.combatStates[i];
      if (cs.hitstopTimer > 0) cs.hitstopTimer--;
      if (cs.invincibilityTimer > 0) cs.invincibilityTimer--;
      if (cs.attackTimer > 0) cs.attackTimer--;
    }

    if (this.localMode && this.inputManager) {
      const input = this.inputManager.getInput();
      this.handleLocalInput(input, dt);
    }

    pushApart(this.physStates[0], this.physStates[1]);

    for (let i = 0; i < 2; i++) {
      const phys = this.physStates[i];
      const cs = this.combatStates[i];
      const stickman = this.stickmen[i];

      const stance = this.getVisualStance(i, phys, cs);
      stickman.setStance(stance);
      stickman.setWalkPhase(this.walkPhase + i * Math.PI);

      if (cs.hitstopTimer > 0 && cs.hitstopTimer % 4 < 2) {
        stickman.flash(0xff4444);
      }

      stickman.update(dt);

      const color = i === 0 ? 0x6366f1 : 0xec4899;
      stickman.render(
        phys.x + PLAYER_CONFIG.WIDTH / 2,
        phys.y + PLAYER_CONFIG.HEIGHT,
        phys.facingRight,
        color,
      );
    }

    this.resolveRound();

    this.roundTimer -= dt;
    if (this.roundTimer <= 0) {
      this.roundTimer = 0;
      this.triggerKO(null);
    }

    this.hud?.update(
      this.combatStates[0],
      this.combatStates[1],
      this.round,
      this.roundTimer,
    );
  }

  private resetPositions(): void {
    this.physStates = [
      createPhysicsState(PLAYER_CONFIG.STAGE_LEFT + 200, PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT, true),
      createPhysicsState(PLAYER_CONFIG.STAGE_RIGHT - 200, PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT, false),
    ];
  }

  private renderIdle(): void {
    for (let i = 0; i < 2; i++) {
      const phys = this.physStates[i];
      const cs = this.combatStates[i];
      const stickman = this.stickmen[i];

      stickman.setStance(this.getVisualStance(i, phys, cs));
      stickman.update(0.016);

      const color = i === 0 ? 0x6366f1 : 0xec4899;
      stickman.render(
        phys.x + PLAYER_CONFIG.WIDTH / 2,
        phys.y + PLAYER_CONFIG.HEIGHT,
        phys.facingRight,
        color,
      );
    }

    this.hud?.update(
      this.combatStates[0],
      this.combatStates[1],
      this.round,
      this.roundTimer,
    );
  }

  private handleLocalInput(input: GameInput, dt: number): void {
    const p0 = this.physStates[0];
    const p1 = this.physStates[1];
    const c0 = this.combatStates[0];
    const c1 = this.combatStates[1];

    if (c0.health > 0) {
      if (c0.hitstopTimer > 0 || c0.inHitstun) {
        if (p0.grounded && c0.invincibilityTimer <= 0) {
          c0.inHitstun = false;
        }
      } else {
        let moveX1 = 0;
        if (input.left) moveX1 -= 1;
        if (input.right) moveX1 += 1;
        c0.isBlocking = input.block && p0.grounded;
        updatePhysics(p0, dt, moveX1, input.up);
        this.handleLocalAttack(0, input);
      }
    }

    if (c1.health > 0) {
      if (c1.hitstopTimer > 0 || c1.inHitstun) {
        if (p1.grounded && c1.invincibilityTimer <= 0) {
          c1.inHitstun = false;
        }
      } else {
        let moveX2 = 0;
        if (input.down) moveX2 -= 1;
        if (input.punch) moveX2 += 1;
        c1.isBlocking = input.block && p1.grounded;
        updatePhysics(p1, dt, moveX2, input.block);
        P2_INPUT.punch = input.kick;
      this.handleLocalAttack(1, P2_INPUT);
      }
    }

    this.checkLocalCollisions();
  }

  private handleLocalAttack(index: number, input: GameInput): void {
    const cs = this.combatStates[index];
    if (cs.attackTimer > 0) return;
    if (cs.health <= 0) return;

    const both = input.punch && input.kick;

    if (both && cs.ultimate >= COMBAT_CONFIG.ULTIMATE_COST) {
      cs.attackType = 'ultimate';
      cs.ultimate = 0;
      cs.ultimateReady = false;
      cs.attackTimer = (ATTACK_CONFIG.ULTIMATE.startup + ATTACK_CONFIG.ULTIMATE.active + ATTACK_CONFIG.ULTIMATE.recovery) / 16;
      this.stickmen[index].setStance(PlayerStance.PUNCHING, true);
      this.cameras.main.shake(200, 0.01);
      const p = this.physStates[index];
      this.particles?.ultimateBurst(p.x + PLAYER_CONFIG.WIDTH / 2, p.y + PLAYER_CONFIG.HEIGHT / 2);
      return;
    }

    if (both) {
      cs.attackType = 'heavy';
      cs.attackTimer = (ATTACK_CONFIG.HEAVY.startup + ATTACK_CONFIG.HEAVY.active + ATTACK_CONFIG.HEAVY.recovery) / 16;
      this.stickmen[index].setStance(PlayerStance.PUNCHING, true);
      return;
    }

    if (input.punch) {
      cs.attackType = 'punch';
      cs.attackTimer = (ATTACK_CONFIG.PUNCH.startup + ATTACK_CONFIG.PUNCH.active + ATTACK_CONFIG.PUNCH.recovery) / 16;
      this.stickmen[index].setStance(PlayerStance.PUNCHING, true);
      return;
    }

    if (input.kick) {
      cs.attackType = 'kick';
      cs.attackTimer = (ATTACK_CONFIG.KICK.startup + ATTACK_CONFIG.KICK.active + ATTACK_CONFIG.KICK.recovery) / 16;
      this.stickmen[index].setStance(PlayerStance.KICKING, true);
      return;
    }
  }

  private checkLocalCollisions(): void {
    for (let i = 0; i < 2; i++) {
      const atk = this.physStates[i];
      const def = this.physStates[1 - i];
      const atkC = this.combatStates[i];
      const defC = this.combatStates[1 - i];

      if (!atkC.attackType || atkC.attackTimer <= 0) continue;
      if (defC.health <= 0) continue;

      const config = this.getAttackConfig(atkC.attackType);
      if (!config) continue;

      const atkX = atk.facingRight ? atk.x + PLAYER_CONFIG.WIDTH : atk.x;
      const defX = def.x;
      const dist = Math.abs(atkX - defX);

      if (dist >= config.range) continue;
      if (Math.abs(atk.y - def.y) > PLAYER_CONFIG.HEIGHT * 1.2) continue;

      const knockDir = atk.facingRight ? 1 : -1;
      let damage: number = config.damage;

      if (atkC.combo > 0) {
        damage = Math.floor(damage * Math.pow(COMBAT_CONFIG.COMBO_SCALING, atkC.combo));
      }

      const wasBlocking = defC.isBlocking;
      if (wasBlocking) {
        damage = Math.floor(damage * PLAYER_CONFIG.BLOCK_DAMAGE_MULTIPLIER);
      }

      defC.health = Math.max(0, defC.health - damage);
      def.vy = (config as any).knockbackY || -200;
      def.vx = knockDir * config.knockback;
      defC.hitstopTimer = Math.floor((config.hitstop as number) / 16);
      defC.inHitstun = true;
      defC.invincibilityTimer = Math.floor(PLAYER_CONFIG.INVINCIBILITY_DURATION / 16);

      atkC.hitstopTimer = Math.floor((config.hitstop as number) / 16);
      atkC.combo++;
      atkC.attackTimer = 0;
      atkC.attackType = null;

      atkC.ultimate = Math.min(PLAYER_CONFIG.ULTIMATE_MAX, atkC.ultimate + PLAYER_CONFIG.ULTIMATE_PER_HIT);
      defC.ultimate = Math.min(PLAYER_CONFIG.ULTIMATE_MAX, defC.ultimate + PLAYER_CONFIG.ULTIMATE_PER_TAKE_HIT);
      atkC.ultimateReady = atkC.ultimate >= COMBAT_CONFIG.ULTIMATE_COST;
      defC.ultimateReady = defC.ultimate >= COMBAT_CONFIG.ULTIMATE_COST;

      this.stickmen[i].setStance(PlayerStance.PUNCHING, true);
      this.stickmen[1 - i].flash(wasBlocking ? 0x4444ff : 0xff4444);
      this.cameras.main.shake(config.hitstop > 100 ? 150 : 80, 0.005);

      const hitX = def.x + PLAYER_CONFIG.WIDTH / 2;
      const hitY = def.y + PLAYER_CONFIG.HEIGHT / 2;
      if (wasBlocking) {
        this.particles?.blockSpark(hitX, hitY);
      } else {
        this.particles?.hitSpark(hitX, hitY);
      }
    }
  }

  private resolveRound(): void {
    for (let i = 0; i < 2; i++) {
      if (this.combatStates[i].health <= 0 && this.combatStates[i].alive) {
        this.combatStates[i].alive = false;
        this.triggerKO(i);
      }
    }
  }

  private triggerKO(loserIndex: number | null): void {
    this.fighting = false;
    this.koTimer = 2000;

    let winnerIndex: number | null = null;
    if (loserIndex !== null) {
      winnerIndex = loserIndex === 0 ? 1 : 0;
    }

    if (winnerIndex !== null) {
      this.combatStates[winnerIndex].wins++;
    }

    const totalWinsNeeded = Math.ceil(GAME_CONFIG.ROUNDS_TO_WIN);

    const winner = winnerIndex !== null ? this.combatStates[winnerIndex] : null;
    const isMatchOver = winner !== null && winner.wins >= totalWinsNeeded;

    const winnerName = winnerIndex === 0 ? 'P1' : 'P2';

    this.time.delayedCall(600, () => {
      if (isMatchOver) {
        this.winScreen?.showMatchOver(winnerIndex, winnerName);
      } else {
        this.winScreen?.showKO(winnerIndex, winnerName, () => {
          this.round++;
          this.roundTimer = GAME_CONFIG.ROUND_DURATION;
          this.resetPositions();
          this.combatStates = [
            createCombatState(this.combatStates[0].wins),
            createCombatState(this.combatStates[1].wins),
          ];
          this.koTimer = 0;
          this.countdown?.start(() => {
            this.fighting = true;
          });
        });
      }
    });
  }

  private getAttackConfig(type: string | null) {
    switch (type) {
      case 'punch': return ATTACK_CONFIG.PUNCH;
      case 'kick': return ATTACK_CONFIG.KICK;
      case 'heavy': return ATTACK_CONFIG.HEAVY;
      case 'ultimate': return ATTACK_CONFIG.ULTIMATE;
      default: return null;
    }
  }

  private getVisualStance(index: number, phys: PhysicalState, cs: CombatState): PlayerStance {
    if (cs.health <= 0) return PlayerStance.DEAD;
    if (cs.inHitstun) return PlayerStance.HIT;
    if (cs.attackTimer > 0 && cs.attackType === 'kick') return PlayerStance.KICKING;
    if (cs.attackTimer > 0) return PlayerStance.PUNCHING;
    if (cs.isBlocking) return PlayerStance.BLOCKING;
    if (!phys.grounded) {
      return phys.vy < 0 ? PlayerStance.JUMPING : PlayerStance.FALLING;
    }
    if (Math.abs(phys.vx) > 50) {
      return PlayerStance.WALKING;
    }
    return PlayerStance.IDLE;
  }

  private drawArena(): void {
    const g = this.add.graphics();

    const stageW = PLAYER_CONFIG.STAGE_RIGHT - PLAYER_CONFIG.STAGE_LEFT;
    const stageH = PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.STAGE_CEILING;
    const floorY = PLAYER_CONFIG.STAGE_GROUND;

    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(PLAYER_CONFIG.STAGE_LEFT, PLAYER_CONFIG.STAGE_CEILING, stageW, stageH);

    g.lineStyle(1, 0x6366f1, 0.15);
    const gridSize = 40;
    for (let x = PLAYER_CONFIG.STAGE_LEFT; x <= PLAYER_CONFIG.STAGE_RIGHT; x += gridSize) {
      g.beginPath();
      g.moveTo(x, PLAYER_CONFIG.STAGE_CEILING);
      g.lineTo(x, floorY);
      g.stroke();
    }
    for (let y = PLAYER_CONFIG.STAGE_CEILING; y <= floorY; y += gridSize) {
      g.beginPath();
      g.moveTo(PLAYER_CONFIG.STAGE_LEFT, y);
      g.lineTo(PLAYER_CONFIG.STAGE_RIGHT, y);
      g.stroke();
    }

    g.fillStyle(0x6366f1, 0.08);
    g.fillRect(PLAYER_CONFIG.STAGE_LEFT, floorY - 60, stageW, 4);

    const gradient = this.add.graphics();
    for (let i = 0; i < 60; i++) {
      const alpha = 0.06 * (1 - i / 60);
      gradient.fillStyle(0x818cf8, alpha);
      gradient.fillRect(PLAYER_CONFIG.STAGE_LEFT, floorY - 4 + i, stageW, 1);
    }

    g.lineStyle(2, 0x818cf8, 0.3);
    g.strokeRect(PLAYER_CONFIG.STAGE_LEFT, PLAYER_CONFIG.STAGE_CEILING, stageW, floorY);
  }

  destroy(): void {
    for (const s of this.stickmen) s.destroy();
    this.inputManager?.destroy();
    this.hud?.destroy();
    this.countdown?.destroy();
    this.winScreen?.destroy();
    this.particles?.destroy();
  }
}
