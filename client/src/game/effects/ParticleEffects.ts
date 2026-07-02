import Phaser from 'phaser';

export class ParticleEffects {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(50);
  }

  hitSpark(x: number, y: number, color: number = 0xff4444): void {
    this.burst(x, y, color, 8, 200);
  }

  blockSpark(x: number, y: number): void {
    this.burst(x, y, 0x4488ff, 6, 150);
  }

  ultimateBurst(x: number, y: number): void {
    this.burst(x, y, 0xfbbf24, 16, 400);
    this.burst(x, y, 0xffffff, 8, 300);
  }

  private burst(x: number, y: number, color: number, count: number, speed: number): void {
    const particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const vel = speed * (0.5 + Math.random() * 0.5);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel * 0.6 - 30,
        life: 300 + Math.random() * 200,
        maxLife: 300 + Math.random() * 200,
        size: 2 + Math.random() * 2,
      });
    }

    let elapsed = 0;
    const timer = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        elapsed += 16;
        this.graphics.clear();

        let alive = false;
        for (const p of particles) {
          if (elapsed >= p.life) continue;
          alive = true;
          const t = elapsed / p.life;
          const alpha = 1 - t;
          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;
          p.vy += 200 * 0.016;

          this.graphics.fillStyle(color, alpha);
          this.graphics.fillCircle(p.x, p.y, p.size * (1 - t * 0.5));
        }

        if (!alive) {
          timer.destroy();
          this.graphics.clear();
        }
      },
    });
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
