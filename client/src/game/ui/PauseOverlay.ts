import * as Phaser from 'phaser';
import { soundManager } from '../effects/SoundManager';
import { useGameStore } from '@/stores/gameStore';

export class PauseOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private title: Phaser.GameObjects.Text;
  private resumeBtn: Phaser.GameObjects.Text;
  private quitBtn: Phaser.GameObjects.Text;
  private _active = false;
  private onResume: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const dim = scene.add.rectangle(
      scene.scale.width / 2, scene.scale.height / 2,
      scene.scale.width, scene.scale.height,
      0x000000, 0.7,
    ).setInteractive();

    this.title = scene.add.text(scene.scale.width / 2, scene.scale.height * 0.30, 'PAUSED', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.resumeBtn = scene.add.text(scene.scale.width / 2, scene.scale.height * 0.48, '[ RESUME ]', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#a5b4fc',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive();

    this.quitBtn = scene.add.text(scene.scale.width / 2, scene.scale.height * 0.58, '[ QUIT TO MENU ]', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#f87171',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive();

    this.container = scene.add.container(0, 0, [dim, this.title, this.resumeBtn, this.quitBtn])
      .setDepth(400)
      .setVisible(false);

    this.resumeBtn.on('pointerover', () => this.resumeBtn.setColor('#ffffff'));
    this.resumeBtn.on('pointerout', () => this.resumeBtn.setColor('#a5b4fc'));
    this.resumeBtn.on('pointerdown', () => {
      soundManager.playMenuClick();
      this.hide();
      this.onResume?.();
    });

    this.quitBtn.on('pointerover', () => this.quitBtn.setColor('#ffffff'));
    this.quitBtn.on('pointerout', () => this.quitBtn.setColor('#f87171'));
    this.quitBtn.on('pointerdown', () => {
      soundManager.playMenuClick();
      this.hide();
      useGameStore.getState().exitToMenu();
    });
  }

  show(onResume: () => void): void {
    this._active = true;
    this.onResume = onResume;
    this.container.setVisible(true);
    this.title.setAlpha(0);
    this.scene.tweens.add({
      targets: this.title,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
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
