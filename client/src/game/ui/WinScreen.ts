import * as Phaser from 'phaser';
import { GAME_CONFIG } from '@/shared';

export interface RoundStats {
  damageDealt: number;
  hitsLanded: number;
  longestCombo: number;
}

export class WinScreen {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private dim: Phaser.GameObjects.Rectangle;
  private title: Phaser.GameObjects.Text;
  private subtitle: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private _active = false;
  private rematchCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.dim = scene.add.rectangle(
      scene.scale.width / 2, scene.scale.height / 2,
      scene.scale.width, scene.scale.height,
      0x000000, 0,
    ).setInteractive();

    this.title = scene.add.text(scene.scale.width / 2, scene.scale.height * 0.26, '', {
      fontFamily: 'monospace',
      fontSize: '72px',
      color: '#ff2222',
      stroke: '#000000',
      strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 0, color: '#ff2222', blur: 20, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    this.subtitle = scene.add.text(scene.scale.width / 2, scene.scale.height * 0.42, '', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);

    this.statsText = scene.add.text(scene.scale.width / 2, scene.scale.height * 0.54, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#cbd5e1',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setAlpha(0);

    this.hint = scene.add.text(scene.scale.width / 2, scene.scale.height * 0.72, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#94a3b8',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    this.container = scene.add.container(0, 0, [this.dim, this.title, this.subtitle, this.statsText, this.hint])
      .setDepth(300)
      .setVisible(false);
  }

  showKO(winnerIndex: number | null, winnerName: string, onRematch: () => void, stats?: [RoundStats, RoundStats]): void {
    this.rematchCallback = onRematch;
    this._active = true;
    this.container.setVisible(true);

    this.title.setText('K.O.!');
    this.title.setColor(winnerIndex === 0 ? '#6366f1' : winnerIndex === 1 ? '#ec4899' : '#ff4444');
    this.title.setScale(3);

    if (winnerIndex !== null) {
      this.subtitle.setText(`${winnerName} wins!`);
      this.subtitle.setColor(winnerIndex === 0 ? '#a5b4fc' : '#f9a8d4');
    } else {
      this.subtitle.setText('Draw!');
      this.subtitle.setColor('#94a3b8');
    }

    this.statsText.setText(this.formatStats(winnerIndex, stats));
    this.hint.setText('ENTER = Rematch  |  ESC = Menu');

    this.animateIn();
    this.setupInput(onRematch);
  }

  showMatchOver(winnerIndex: number | null, winnerName: string, onRematch?: () => void, stats?: [RoundStats, RoundStats]): void {
    this._active = true;
    this.container.setVisible(true);

    this.title.setText('GAME OVER');
    this.title.setColor(winnerIndex === 0 ? '#6366f1' : winnerIndex === 1 ? '#ec4899' : '#fbbf24');
    this.title.setScale(3);

    if (winnerIndex !== null) {
      this.subtitle.setText(`${winnerName} wins the match!`);
      this.subtitle.setColor(winnerIndex === 0 ? '#a5b4fc' : '#f9a8d4');
    } else {
      this.subtitle.setText('The match is a draw!');
      this.subtitle.setColor('#94a3b8');
    }

    this.statsText.setText(this.formatStats(winnerIndex, stats));

    if (onRematch) {
      this.hint.setText('ENTER = Rematch  |  ESC = Menu');
    } else {
      this.hint.setText('ESC = Return to Menu');
    }

    this.animateIn();
    if (onRematch) {
      this.setupInput(() => onRematch());
    }
  }

  private formatStats(winnerIndex: number | null, stats?: [RoundStats, RoundStats]): string {
    if (!stats) return '';
    const p1Color = '#a5b4fc';
    const p2Color = '#f9a8d4';
    const header = winnerIndex !== null
      ? `${winnerIndex === 0 ? 'P1' : 'P2'} WINS`
      : 'DRAW';

    const p1Prefix = winnerIndex === 0 ? '► ' : '  ';
    const p2Prefix = winnerIndex === 1 ? '► ' : '  ';

    return [
      `${'─'.repeat(30)}`,
      `${p1Prefix}${'P1'.padEnd(4)}  DMG: ${String(stats[0].damageDealt).padStart(4)}  HITS: ${String(stats[0].hitsLanded).padStart(2)}  BEST: ${String(stats[0].longestCombo)}`,
      `${p2Prefix}${'P2'.padEnd(4)}  DMG: ${String(stats[1].damageDealt).padStart(4)}  HITS: ${String(stats[1].hitsLanded).padStart(2)}  BEST: ${String(stats[1].longestCombo)}`,
      `${'─'.repeat(30)}`,
    ].join('\n');
  }

  private animateIn(): void {
    this.dim.setFillStyle(0x000000, 0);

    this.scene.tweens.add({
      targets: this.dim,
      alpha: 0.7,
      duration: 300,
      ease: 'Power2',
    });

    this.scene.tweens.add({
      targets: this.title,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: this.subtitle,
      alpha: 1,
      duration: 400,
      delay: 400,
      ease: 'Power2',
    });

    this.scene.tweens.add({
      targets: this.statsText,
      alpha: 1,
      duration: 400,
      delay: 600,
      ease: 'Power2',
    });

    this.scene.tweens.add({
      targets: this.hint,
      alpha: 1,
      duration: 300,
      delay: 900,
      ease: 'Power2',
    });
  }

  private setupInput(onAction: () => void): void {
    this.rematchCallback = onAction;
    this.scene.input.keyboard?.once('keydown-ENTER', () => {
      if (!this._active) return;
      this.hide();
      this.rematchCallback?.();
    });
  }

  hide(): void {
    this._active = false;
    this.container.setVisible(false);
  }

  get active(): boolean {
    return this._active;
  }

  destroy(): void {
    this.container.destroy();
  }
}