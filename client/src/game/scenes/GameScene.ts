import Phaser from 'phaser';
import { PLAYER_CONFIG, PlayerStance } from '@/shared';
import type { GameStateSnapshot, PlayerSnapshot } from '@/shared';
import { useGameStore } from '@/stores/gameStore';

export class GameScene extends Phaser.Scene {
  private stickmen: Phaser.GameObjects.Graphics[] = [];
  private unsub: (() => void) | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.drawArena();
    this.stickmen = [this.add.graphics(), this.add.graphics()];
    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.unsub = useGameStore.subscribe((state) => {
      const gs = state.gameState;
      if (gs) {
        this.renderState(gs);
      }
    });
  }

  destroy(): void {
    this.unsub?.();
  }

  update(): void {
    const state = useGameStore.getState().gameState;
    if (state) {
      this.renderState(state);
    }
  }

  private renderState(state: GameStateSnapshot): void {
    for (let i = 0; i < state.players.length && i < this.stickmen.length; i++) {
      this.drawStickman(this.stickmen[i], state.players[i]);
    }
  }

  private drawArena(): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0x6366f1, 0.5);

    const stageW = PLAYER_CONFIG.STAGE_RIGHT - PLAYER_CONFIG.STAGE_LEFT;
    const stageH = PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.STAGE_CEILING;

    g.strokeRect(PLAYER_CONFIG.STAGE_LEFT, PLAYER_CONFIG.STAGE_CEILING, stageW, stageH);

    g.fillStyle(0x6366f1, 0.1);
    g.fillRect(PLAYER_CONFIG.STAGE_LEFT, PLAYER_CONFIG.STAGE_GROUND - 4, stageW, 4);
  }

  private drawStickman(g: Phaser.GameObjects.Graphics, player: PlayerSnapshot): void {
    g.clear();

    const color = player.id === 'p1' ? 0x6366f1 : 0xec4899;
    const x = player.x + PLAYER_CONFIG.WIDTH / 2;
    const y = player.y + PLAYER_CONFIG.HEIGHT;
    const facing = player.facingRight ? 1 : -1;

    g.lineStyle(3, color, 1);

    const headRadius = 10;
    const neckY = y - 70;
    const bodyEndY = y - 40;

    g.fillStyle(0x6366f1, 0.2);
    g.fillCircle(x, neckY + headRadius, headRadius);
    g.strokeCircle(x, neckY + headRadius, headRadius);

    g.beginPath();
    g.moveTo(x, neckY + headRadius * 2);
    g.lineTo(x, bodyEndY);
    g.stroke();

    const armY = neckY + headRadius * 2 + 5;
    const legY = bodyEndY;

    if (player.stance === PlayerStance.PUNCHING || player.stance === PlayerStance.KICKING) {
      g.beginPath();
      g.moveTo(x, armY);
      g.lineTo(x + facing * 30, armY - 10);
      g.stroke();

      g.beginPath();
      g.moveTo(x, armY);
      g.lineTo(x - facing * 15, armY + 5);
      g.stroke();
    } else {
      g.beginPath();
      g.moveTo(x, armY);
      g.lineTo(x + facing * 20, armY - 5);
      g.stroke();

      g.beginPath();
      g.moveTo(x, armY);
      g.lineTo(x - facing * 15, armY + 5);
      g.stroke();
    }

    g.beginPath();
    g.moveTo(x, legY);
    g.lineTo(x + facing * 15, y - 20);
    g.stroke();

    g.beginPath();
    g.moveTo(x, legY);
    g.lineTo(x - facing * 10, y - 20);
    g.stroke();
  }
}
