import Phaser from 'phaser';

export class WinScreen {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private title: Phaser.GameObjects.Text;
  private subtitle: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private _active = false;
  private rematchCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const dim = scene.add.rectangle(
      scene.scale.width / 2, scene.scale.height / 2,
      scene.scale.width, scene.scale.height,
      0x000000, 0.6,
    );

    this.title = scene.add.text(scene.scale.width / 2, scene.scale.height * 0.35, '', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.subtitle = scene.add.text(scene.scale.width / 2, scene.scale.height * 0.50, '', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.hint = scene.add.text(scene.scale.width / 2, scene.scale.height * 0.65, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(0.5);

    this.container = scene.add.container(0, 0, [dim, this.title, this.subtitle, this.hint])
      .setDepth(300)
      .setVisible(false);
  }

  showKO(winnerIndex: number | null, winnerName: string, onRematch: () => void): void {
    this.rematchCallback = onRematch;
    this._active = true;
    this.container.setVisible(true);

    this.title.setText('K.O.!');
    this.title.setColor('#ff4444');
    this.title.setScale(2).setAlpha(0);

    if (winnerIndex !== null) {
      this.subtitle.setText(`${winnerName} wins!`);
    } else {
      this.subtitle.setText('Draw!');
    }
    this.subtitle.setAlpha(0);

    this.hint.setText('Press SPACE for rematch');
    this.hint.setAlpha(0);

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
    });

    this.scene.tweens.add({
      targets: this.hint,
      alpha: 1,
      duration: 300,
      delay: 800,
    });

    this.scene.input.keyboard?.once('keydown-SPACE', () => {
      if (!this._active) return;
      this.hide();
      this.rematchCallback?.();
    });
  }

  showMatchOver(winnerIndex: number | null, winnerName: string): void {
    this._active = true;
    this.container.setVisible(true);

    this.title.setText('GAME OVER');
    this.title.setColor('#fbbf24');
    this.title.setScale(2).setAlpha(0);

    if (winnerIndex !== null) {
      this.subtitle.setText(`${winnerName} wins the match!`);
    } else {
      this.subtitle.setText('The match is a draw!');
    }
    this.subtitle.setAlpha(0);
    this.hint.setText('');
    this.hint.setAlpha(0);

    this.scene.tweens.add({
      targets: this.title,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 600,
      ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: this.subtitle,
      alpha: 1,
      duration: 400,
      delay: 500,
    });
  }

  private hide(): void {
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
