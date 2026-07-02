import * as Phaser from 'phaser';
import { PLAYER_CONFIG } from '@/shared';

interface HUDPlayerData {
  health: number;
  maxHealth: number;
  ultimate: number;
  combo: number;
  wins: number;
  ultimateReady: boolean;
}

export class CombatHUD {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private comboTexts: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  private winDots: [Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics];
  private nameTexts: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  private timerText: Phaser.GameObjects.Text;
  private roundText: Phaser.GameObjects.Text;
  private p1Color = 0x6366f1;
  private p2Color = 0xec4899;
  private maxRounds = 3;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(100);

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    };

    this.nameTexts = [
      scene.add.text(0, 0, 'P1', { ...style, fontSize: '16px', color: '#a5b4fc' }).setDepth(101),
      scene.add.text(0, 0, 'P2', { ...style, fontSize: '16px', color: '#f9a8d4' }).setDepth(101).setOrigin(1, 0),
    ];

    this.comboTexts = [
      scene.add.text(0, 0, '', style).setDepth(101).setOrigin(0.5),
      scene.add.text(0, 0, '', style).setDepth(101).setOrigin(0.5),
    ];

    this.winDots = [
      scene.add.graphics().setDepth(101),
      scene.add.graphics().setDepth(101),
    ];

    this.timerText = scene.add.text(scene.scale.width / 2, 22, '99', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(101);

    this.roundText = scene.add.text(scene.scale.width / 2, 46, 'ROUND 1', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#94a3b8',
    }).setOrigin(0.5).setDepth(101);
  }

  update(
    p1: HUDPlayerData,
    p2: HUDPlayerData,
    round: number = 1,
    timer: number = 99,
  ): void {
    const g = this.graphics;
    g.clear();

    const w = this.scene.scale.width;
    const barW = 380;
    const barH = 18;
    const margin = 24;
    const topY = 12;

    this.drawHealthBar(margin, topY + 22, barW, barH, p1.health, p1.maxHealth, this.p1Color, true);
    this.drawHealthBar(w - margin - barW, topY + 22, barW, barH, p2.health, p2.maxHealth, this.p2Color, false);

    this.nameTexts[0].setPosition(margin + 4, topY + 2);
    this.nameTexts[1].setPosition(w - margin - 4, topY + 2);

    const ultW = barW - 40;
    const ultY = topY + barH + 28;
    this.drawUltimateMeter(margin + 20, ultY, ultW, 5, p1.ultimate, this.p1Color, p1.ultimateReady);
    this.drawUltimateMeter(w - margin - 20 - ultW, ultY, ultW, 5, p2.ultimate, this.p2Color, p2.ultimateReady);

    this.timerText.setText(`${Math.ceil(timer)}`);

    this.roundText.setText(`ROUND ${round}`);
    this.roundText.setPosition(w / 2, 50);

    this.drawWinDots(this.winDots[0], margin + 4, ultY + 10, p1.wins, this.p1Color, true);
    this.drawWinDots(this.winDots[1], w - margin - 4, ultY + 10, p2.wins, this.p2Color, false);

    const comboP1 = p1.combo > 0 ? `${p1.combo} HIT` : '';
    this.comboTexts[0].setText(comboP1).setPosition(margin + barW / 2, ultY + 26).setVisible(p1.combo > 0);

    const comboP2 = p2.combo > 0 ? `${p2.combo} HIT` : '';
    this.comboTexts[1].setText(comboP2).setPosition(w - margin - barW / 2, ultY + 26).setVisible(p2.combo > 0);
  }

  private drawHealthBar(x: number, y: number, w: number, h: number, health: number, maxHealth: number, color: number, leftAlign: boolean): void {
    const g = this.graphics;
    const ratio = Math.max(0, health / maxHealth);

    g.fillStyle(0x1e1b4b, 0.85);
    g.fillRoundedRect(x, y, w, h, 4);

    const innerW = w - 4;
    const innerH = h - 4;
    const fillX = x + 2;
    const fillW = innerW * ratio;
    const fillColor = color === this.p1Color
      ? (ratio > 0.3 ? 0x6366f1 : 0xef4444)
      : (ratio > 0.3 ? 0xec4899 : 0xef4444);

    g.fillStyle(fillColor, 0.9);
    g.fillRect(leftAlign ? fillX : fillX + innerW - fillW, y + 2, fillW, innerH);

    g.lineStyle(1, 0xffffff, 0.15);
    g.strokeRoundedRect(x, y, w, h, 4);
  }

  private drawUltimateMeter(x: number, y: number, w: number, h: number, value: number, color: number, ready: boolean): void {
    const g = this.graphics;
    const ratio = Math.min(1, value / PLAYER_CONFIG.ULTIMATE_MAX);

    g.fillStyle(0x1e1b4b, 0.6);
    g.fillRoundedRect(x, y, w, h, 3);

    if (ratio > 0) {
      g.fillStyle(ready ? 0xfbbf24 : color, 0.8);
      g.fillRect(x + 1, y + 1, (w - 2) * ratio, h - 2);
    }

    if (ready) {
      g.lineStyle(1, 0xfbbf24, 0.5);
      g.strokeRoundedRect(x, y, w, h, 3);
    }
  }

  private drawWinDots(g: Phaser.GameObjects.Graphics, x: number, y: number, wins: number, color: number, leftAlign: boolean): void {
    g.clear();
    for (let i = 0; i < this.maxRounds; i++) {
      const dx = leftAlign ? x + i * 14 : x - i * 14;
      g.fillStyle(i < wins ? color : 0x1e1b4b, i < wins ? 1 : 0.5);
      g.fillCircle(dx, y, 4);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.comboTexts.forEach(t => t.destroy());
    this.winDots.forEach(g => g.destroy());
    this.nameTexts.forEach(t => t.destroy());
    this.timerText.destroy();
    this.roundText.destroy();
  }
}
