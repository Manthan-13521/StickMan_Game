import * as Phaser from 'phaser';

interface ActiveNumber {
  text: Phaser.GameObjects.Text;
  vy: number;
  life: number;
  maxLife: number;
}

export class DamageNumbers {
  private scene: Phaser.Scene;
  private active: ActiveNumber[] = [];
  private pool: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(x: number, y: number, damage: number, blocked = false, crit = false): void {
    const t = this.obtain();

    const sign = damage > 0 ? '-' : '';
    t.setText(`${sign}${damage}`);
    t.setPosition(x, y - 10);
    t.setAlpha(1);
    t.setScale(crit ? 1.4 : 1);

    if (blocked) {
      t.setColor('#4488ff');
      t.setFontSize(16);
    } else if (crit) {
      t.setColor('#ff4444');
      t.setFontSize(24);
    } else {
      t.setColor('#ffffff');
      t.setFontSize(18);
    }

    t.setDepth(150);
    t.setVisible(true);

    const driftX = (Math.random() - 0.5) * 40;
    const vy = -80 - Math.random() * 40;

    this.active.push({
      text: t,
      vy,
      life: 600,
      maxLife: 600,
    });

    this.scene.tweens.add({
      targets: t,
      x: t.x + driftX,
      duration: 600,
      ease: 'Power2',
    });
  }

  showCombo(x: number, y: number, combo: number): void {
    if (combo < 2) return;
    const t = this.obtain();
    t.setText(`${combo} HIT`);
    t.setPosition(x, y - 40);
    t.setAlpha(1);
    t.setScale(Math.min(1 + combo * 0.08, 2));
    t.setColor('#fbbf24');
    t.setFontSize(20);
    t.setDepth(150);
    t.setVisible(true);

    this.active.push({
      text: t,
      vy: -30,
      life: 800,
      maxLife: 800,
    });

    this.scene.tweens.add({
      targets: t,
      scaleX: Math.min(1 + combo * 0.08, 2),
      scaleY: Math.min(1 + combo * 0.08, 2),
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      a.life -= dt * 1000;
      if (a.life <= 0) {
        this.release(a.text);
        this.active.splice(i, 1);
        continue;
      }
      a.text.y += a.vy * dt;
      a.vy += 200 * dt;
      a.text.setAlpha(Math.min(1, a.life / 200));
    }
  }

  private obtain(): Phaser.GameObjects.Text {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    };
    const t = this.pool.pop() ?? this.scene.add.text(0, 0, '', style).setVisible(false).setOrigin(0.5);
    return t;
  }

  private release(t: Phaser.GameObjects.Text): void {
    t.setVisible(false);
    this.pool.push(t);
  }

  destroy(): void {
    for (const a of this.active) a.text.destroy();
    for (const t of this.pool) t.destroy();
    this.active = [];
    this.pool = [];
  }
}
