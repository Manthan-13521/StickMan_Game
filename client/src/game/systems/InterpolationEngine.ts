import { STATE_BUFFER_SIZE } from '@/shared';
import type { PlayerSnapshot } from '@/shared';

export class InterpolationEngine {
  private stateBuffer: PlayerSnapshot[] = [];
  private renderState: PlayerSnapshot | null = null;

  pushState(state: PlayerSnapshot): void {
    this.stateBuffer.push(JSON.parse(JSON.stringify(state)));
    if (this.stateBuffer.length > STATE_BUFFER_SIZE) {
      this.stateBuffer.shift();
    }
  }

  interpolate(now: number, renderDelay: number = 100): PlayerSnapshot | null {
    if (this.stateBuffer.length < 2) {
      if (this.stateBuffer.length === 1) {
        this.renderState = this.stateBuffer[0];
      }
      return this.renderState;
    }

    const renderTime = now - renderDelay;

    let before = this.stateBuffer[0];
    let after = this.stateBuffer[this.stateBuffer.length - 1];

    for (let i = 0; i < this.stateBuffer.length - 1; i++) {
      const current = this.stateBuffer[i];
      const next = this.stateBuffer[i + 1];

      const ct = current.timestamp ?? Date.now();
      const nt = next.timestamp ?? Date.now();

      if (ct <= renderTime && nt >= renderTime) {
        before = current;
        after = next;
        break;
      }
    }

    const t = this.getLerpFactor(before.timestamp ?? Date.now(), after.timestamp ?? Date.now(), renderTime);
    this.renderState = this.lerpSnapshot(before, after, t);
    return this.renderState;
  }

  reset(): void {
    this.stateBuffer = [];
    this.renderState = null;
  }

  private getLerpFactor(t1: number, t2: number, current: number): number {
    const range = t2 - t1;
    if (range <= 0) return 0;
    return Math.max(0, Math.min(1, (current - t1) / range));
  }

  private lerpSnapshot(a: PlayerSnapshot, b: PlayerSnapshot, t: number): PlayerSnapshot {
    return {
      id: a.id,
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      velocityX: a.velocityX + (b.velocityX - a.velocityX) * t,
      velocityY: a.velocityY + (b.velocityY - a.velocityY) * t,
      facingRight: b.facingRight,
      stance: t < 0.5 ? a.stance : b.stance,
      health: a.health + (b.health - a.health) * t,
      maxHealth: a.maxHealth,
      combo: t < 0.5 ? a.combo : b.combo,
      ultimate: a.ultimate + (b.ultimate - a.ultimate) * t,
      wins: b.wins,
    };
  }
}
