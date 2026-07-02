import Phaser from 'phaser';
import { PLAYER_CONFIG, PlayerStance } from '@/shared';
import type { GameStateSnapshot, PlayerSnapshot } from '@/shared';
import { Stickman } from '../entities/Stickman';
import { InputManager, type GameInput } from '../input/InputManager';
import { createPhysicsState, updatePhysics, pushApart, type PhysicalState } from '../systems/LocalPhysics';

export class GameScene extends Phaser.Scene {
  private stickmen: Stickman[] = [];
  private physStates: PhysicalState[] = [];
  private inputManager: InputManager | null = null;
  private networkState: GameStateSnapshot | null = null;
  private localMode = true;
  private walkPhase = 0;
  private hitTimers: number[] = [0, 0];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.drawArena();
    this.cameras.main.setBackgroundColor('#0f0d2e');

    this.stickmen = [new Stickman(this), new Stickman(this)];
    this.physStates = [
      createPhysicsState(PLAYER_CONFIG.STAGE_LEFT + 200, PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT, true),
      createPhysicsState(PLAYER_CONFIG.STAGE_RIGHT - 200, PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT, false),
    ];

    this.inputManager = new InputManager();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    if (dt > 0.05) return;

    this.walkPhase += dt * 8;

    if (this.localMode && this.inputManager) {
      const input = this.inputManager.getInput();
      this.handleLocalInput(input, dt);
    }

    pushApart(this.physStates[0], this.physStates[1]);

    for (let i = 0; i < 2; i++) {
      const phys = this.physStates[i];
      const stickman = this.stickmen[i];

      const stance = this.getVisualStance(i, phys);
      stickman.setStance(stance);
      stickman.setWalkPhase(this.walkPhase + i * Math.PI);
      stickman.update(dt);

      const color = i === 0 ? 0x6366f1 : 0xec4899;
      stickman.render(phys.x + PLAYER_CONFIG.WIDTH / 2, phys.y + PLAYER_CONFIG.HEIGHT, phys.facingRight, color);
    }
  }

  private handleLocalInput(input: GameInput, dt: number): void {
    const p1 = this.physStates[0];
    const p2 = this.physStates[1];

    let moveX1 = 0;
    if (input.left) moveX1 -= 1;
    if (input.right) moveX1 += 1;
    updatePhysics(p1, dt, moveX1, input.up);

    let moveX2 = 0;
    if (input.down) moveX2 -= 1;
    if (input.punch) moveX2 += 1;
    updatePhysics(p2, dt, moveX2, input.block);

    this.handleAttack(0, input);
    this.handleAttack(1, { punch: input.kick, kick: false, block: false, left: false, right: false, up: false, down: false });
  }

  private handleAttack(index: number, input: GameInput): void {
    if (this.hitTimers[index] > 0) {
      this.hitTimers[index]--;
      return;
    }

    if (input.punch || input.kick) {
      this.hitTimers[index] = 10;
      const attacker = this.physStates[index];
      const defender = this.physStates[1 - index];
      const range = PLAYER_CONFIG.WIDTH + 30;

      const atkX = attacker.facingRight ? attacker.x + PLAYER_CONFIG.WIDTH : attacker.x;
      const defX = defender.x;
      const dist = Math.abs(atkX - defX);

      if (dist < range && Math.abs(attacker.y - defender.y) < PLAYER_CONFIG.HEIGHT) {
        const knockDir = attacker.facingRight ? 1 : -1;
        defender.vx = knockDir * 400;
        defender.vy = -200;
        this.stickmen[index].setStance(input.punch ? PlayerStance.PUNCHING : PlayerStance.KICKING, true);
        this.stickmen[1 - index].flash(0xff4444);
        this.cameras.main.shake(100, 0.005);
      }
    }
  }

  private getVisualStance(index: number, phys: PhysicalState): PlayerStance {
    if (this.hitTimers[index] > 0) {
      return PlayerStance.PUNCHING;
    }
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
  }
}
