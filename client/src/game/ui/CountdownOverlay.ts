import * as Phaser from 'phaser';
import { soundManager } from '../effects/SoundManager';

export class CountdownOverlay {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;
  private container: Phaser.GameObjects.Container;
  private _active = false;
  private callback: (() => void) | null = null;
  private steps = ['3', '2', '1', 'FIGHT!'];
  private stepIndex = 0;
  private timer = 0;
  private perStep = 800;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.text = scene.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '96px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0);

    const dim = scene.add.rectangle(
      scene.scale.width / 2, scene.scale.height / 2,
      scene.scale.width, scene.scale.height,
      0x000000, 0.4,
    ).setDepth(200);

    this.container = scene.add.container(0, 0, [dim, this.text]).setDepth(199).setVisible(false);
  }

  start(callback: () => void): void {
    this.callback = callback;
    this.stepIndex = 0;
    this.timer = 0;
    this._active = true;
    this.container.setVisible(true);
    this.text.setText(this.steps[0]);
    this.text.setScale(2).setAlpha(0);
    this.scene.tweens.add({
      targets: this.text,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  startServer(count: number): void {
    this._active = false;
    this.container.setVisible(true);
    const label = count > 0 ? String(count) : 'FIGHT!';
    this.text.setText(label);
    this.text.setScale(2).setAlpha(0);
    this.scene.tweens.add({
      targets: this.text,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 250,
      ease: 'Back.easeOut',
    });
  }

  update(dt: number): void {
    if (!this._active) return;

    this.timer += dt * 1000;
    if (this.timer >= this.perStep) {
      this.timer = 0;
      this.stepIndex++;

      if (this.stepIndex >= this.steps.length) {
        this._active = false;
        this.container.setVisible(false);
        this.callback?.();
        return;
      }

      if (this.stepIndex === this.steps.length - 1) {
        soundManager.playCountdownFinal();
      } else {
        soundManager.playCountdownBeep();
      }

      this.text.setText(this.steps[this.stepIndex]);
      this.text.setScale(2).setAlpha(0);
      this.scene.tweens.add({
        targets: this.text,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 250,
        ease: 'Back.easeOut',
      });
    }
  }

  get active(): boolean {
    return this._active;
  }

  destroy(): void {
    this.container.destroy();
  }
}
