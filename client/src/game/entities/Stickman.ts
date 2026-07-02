import * as Phaser from 'phaser';
import { PLAYER_CONFIG, PlayerStance } from '@/shared';

interface Joint {
  x: number;
  y: number;
  angle: number;
}

interface Pose {
  head: { x: number; y: number };
  neck: { x: number; y: number };
  shoulder: { x: number; y: number };
  elbowL: Joint;
  handL: Joint;
  elbowR: Joint;
  handR: Joint;
  hip: { x: number; y: number };
  kneeL: Joint;
  footL: Joint;
  kneeR: Joint;
  footR: Joint;
}

const STANCE_POSES: Record<PlayerStance, Pose> = {
  [PlayerStance.IDLE]: {
    head: { x: 0, y: -38 }, neck: { x: 0, y: -30 },
    shoulder: { x: 0, y: -26 },
    elbowL: { x: -10, y: -18, angle: -0.3 }, handL: { x: -14, y: -10, angle: 0 },
    elbowR: { x: 10, y: -18, angle: 0.3 }, handR: { x: 14, y: -10, angle: 0 },
    hip: { x: 0, y: -14 },
    kneeL: { x: -6, y: -2, angle: 0.1 }, footL: { x: -8, y: 10, angle: 0 },
    kneeR: { x: 6, y: -2, angle: -0.1 }, footR: { x: 8, y: 10, angle: 0 },
  },
  [PlayerStance.RUNNING]: {
    head: { x: 0, y: -36 }, neck: { x: 0, y: -28 },
    shoulder: { x: 0, y: -24 },
    elbowL: { x: -14, y: -14, angle: -0.7 }, handL: { x: -18, y: -6, angle: 0 },
    elbowR: { x: 14, y: -14, angle: 0.7 }, handR: { x: 18, y: -6, angle: 0 },
    hip: { x: 0, y: -14 },
    kneeL: { x: -10, y: 2, angle: 0.6 }, footL: { x: -12, y: 10, angle: 0 },
    kneeR: { x: 10, y: 2, angle: -0.6 }, footR: { x: 12, y: 10, angle: 0 },
  },
  [PlayerStance.WALKING]: {
    head: { x: 0, y: -38 }, neck: { x: 0, y: -30 },
    shoulder: { x: 0, y: -26 },
    elbowL: { x: -12, y: -16, angle: -0.5 }, handL: { x: -16, y: -8, angle: 0 },
    elbowR: { x: 12, y: -16, angle: 0.5 }, handR: { x: 16, y: -8, angle: 0 },
    hip: { x: 0, y: -14 },
    kneeL: { x: -8, y: 0, angle: 0.4 }, footL: { x: -10, y: 10, angle: 0 },
    kneeR: { x: 8, y: 0, angle: -0.4 }, footR: { x: 10, y: 10, angle: 0 },
  },
  [PlayerStance.JUMPING]: {
    head: { x: 0, y: -40 }, neck: { x: 0, y: -32 },
    shoulder: { x: 0, y: -28 },
    elbowL: { x: -14, y: -22, angle: -0.8 }, handL: { x: -18, y: -16, angle: 0 },
    elbowR: { x: 14, y: -22, angle: 0.8 }, handR: { x: 18, y: -16, angle: 0 },
    hip: { x: 0, y: -16 },
    kneeL: { x: -5, y: -4, angle: -0.3 }, footL: { x: -7, y: 6, angle: 0 },
    kneeR: { x: 5, y: -4, angle: 0.3 }, footR: { x: 7, y: 6, angle: 0 },
  },
  [PlayerStance.FALLING]: {
    head: { x: 0, y: -38 }, neck: { x: 0, y: -30 },
    shoulder: { x: 0, y: -26 },
    elbowL: { x: -16, y: -20, angle: -1 }, handL: { x: -20, y: -14, angle: 0 },
    elbowR: { x: 16, y: -20, angle: 1 }, handR: { x: 20, y: -14, angle: 0 },
    hip: { x: 0, y: -14 },
    kneeL: { x: -8, y: -2, angle: 0.5 }, footL: { x: -12, y: 6, angle: 0 },
    kneeR: { x: 8, y: -2, angle: -0.5 }, footR: { x: 12, y: 6, angle: 0 },
  },
  [PlayerStance.PUNCHING]: {
    head: { x: 0, y: -38 }, neck: { x: 0, y: -30 },
    shoulder: { x: 0, y: -26 },
    elbowL: { x: -8, y: -20, angle: -0.2 }, handL: { x: -12, y: -14, angle: 0 },
    elbowR: { x: 0, y: -22, angle: 0 }, handR: { x: 24, y: -22, angle: 0 },
    hip: { x: 0, y: -14 },
    kneeL: { x: -6, y: -2, angle: 0.1 }, footL: { x: -8, y: 10, angle: 0 },
    kneeR: { x: 6, y: -2, angle: -0.1 }, footR: { x: 8, y: 10, angle: 0 },
  },
  [PlayerStance.KICKING]: {
    head: { x: 0, y: -38 }, neck: { x: 0, y: -30 },
    shoulder: { x: 0, y: -26 },
    elbowL: { x: -10, y: -18, angle: -0.3 }, handL: { x: -14, y: -10, angle: 0 },
    elbowR: { x: 10, y: -18, angle: 0.3 }, handR: { x: 14, y: -10, angle: 0 },
    hip: { x: 0, y: -14 },
    kneeL: { x: -4, y: 0, angle: 0 }, footL: { x: -6, y: 10, angle: 0 },
    kneeR: { x: 0, y: -6, angle: 0 }, footR: { x: 20, y: -2, angle: 0 },
  },
  [PlayerStance.BLOCKING]: {
    head: { x: 0, y: -36 }, neck: { x: 0, y: -28 },
    shoulder: { x: 0, y: -24 },
    elbowL: { x: -6, y: -16, angle: 0.5 }, handL: { x: -2, y: -22, angle: 0 },
    elbowR: { x: 6, y: -16, angle: -0.5 }, handR: { x: 2, y: -22, angle: 0 },
    hip: { x: 0, y: -14 },
    kneeL: { x: -6, y: -2, angle: 0.2 }, footL: { x: -8, y: 10, angle: 0 },
    kneeR: { x: 6, y: -2, angle: -0.2 }, footR: { x: 8, y: 10, angle: 0 },
  },
  [PlayerStance.HIT]: {
    head: { x: 0, y: -36 }, neck: { x: 0, y: -28 },
    shoulder: { x: 0, y: -24 },
    elbowL: { x: -14, y: -18, angle: -0.6 }, handL: { x: -18, y: -12, angle: 0 },
    elbowR: { x: 14, y: -18, angle: 0.6 }, handR: { x: 18, y: -12, angle: 0 },
    hip: { x: 0, y: -14 },
    kneeL: { x: -8, y: 0, angle: 0.3 }, footL: { x: -12, y: 10, angle: 0 },
    kneeR: { x: 8, y: 0, angle: -0.3 }, footR: { x: 12, y: 10, angle: 0 },
  },
  [PlayerStance.KNOCKED_DOWN]: {
    head: { x: 0, y: -4 }, neck: { x: 0, y: -2 },
    shoulder: { x: 0, y: 0 },
    elbowL: { x: -10, y: 2, angle: 0.2 }, handL: { x: -14, y: 6, angle: 0 },
    elbowR: { x: 10, y: 2, angle: -0.2 }, handR: { x: 14, y: 6, angle: 0 },
    hip: { x: 0, y: 2 },
    kneeL: { x: -6, y: 6, angle: 0.5 }, footL: { x: -8, y: 10, angle: 0 },
    kneeR: { x: 6, y: 6, angle: -0.5 }, footR: { x: 8, y: 10, angle: 0 },
  },
  [PlayerStance.GETTING_UP]: {
    head: { x: 0, y: -20 }, neck: { x: 0, y: -16 },
    shoulder: { x: 0, y: -14 },
    elbowL: { x: -8, y: -8, angle: 0.3 }, handL: { x: -4, y: -12, angle: 0 },
    elbowR: { x: 8, y: -8, angle: -0.3 }, handR: { x: 4, y: -12, angle: 0 },
    hip: { x: 0, y: -10 },
    kneeL: { x: -5, y: -2, angle: 0.2 }, footL: { x: -7, y: 6, angle: 0 },
    kneeR: { x: 5, y: -2, angle: -0.2 }, footR: { x: 7, y: 6, angle: 0 },
  },
  [PlayerStance.DEAD]: {
    head: { x: 0, y: -4 }, neck: { x: 0, y: -2 },
    shoulder: { x: 0, y: 0 },
    elbowL: { x: -12, y: 4, angle: 0.5 }, handL: { x: -16, y: 8, angle: 0 },
    elbowR: { x: 12, y: 4, angle: -0.5 }, handR: { x: 16, y: 8, angle: 0 },
    hip: { x: 0, y: 2 },
    kneeL: { x: -8, y: 8, angle: 0.8 }, footL: { x: -10, y: 12, angle: 0 },
    kneeR: { x: 8, y: 8, angle: -0.8 }, footR: { x: 10, y: 12, angle: 0 },
  },
};

const WALK_CYCLE_AMP = 4;

export class Stickman {
  private graphics: Phaser.GameObjects.Graphics;
  private currentPose: Pose;
  private targetPose: Pose;
  private poseTransition = 1;
  private walkPhase = 0;
  private flashTimer = 0;
  private flashColor: number = 0xffffff;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.currentPose = JSON.parse(JSON.stringify(STANCE_POSES[PlayerStance.IDLE]));
    this.targetPose = JSON.parse(JSON.stringify(STANCE_POSES[PlayerStance.IDLE]));
  }

  setStance(stance: PlayerStance, instant = false): void {
    const pose = STANCE_POSES[stance];
    if (!pose) return;
    this.targetPose = JSON.parse(JSON.stringify(pose));
    this.poseTransition = instant ? 1 : 0;
  }

  setWalkPhase(phase: number): void {
    this.walkPhase = phase;
  }

  flash(color: number = 0xffffff, duration: number = 80): void {
    this.flashTimer = duration;
    this.flashColor = color;
  }

  update(dt: number): void {
    const blendSpeed = 10;
    if (this.poseTransition < 1) {
      this.poseTransition = Math.min(1, this.poseTransition + dt * blendSpeed);
    }

    const t = this.easeInOut(this.poseTransition);
    this.lerpPose(t);

    const bike = Math.sin(this.walkPhase) * WALK_CYCLE_AMP;
    this.currentPose.footL.x += bike;
    this.currentPose.footR.x -= bike;
    this.currentPose.kneeL.x += bike * 0.5;
    this.currentPose.kneeR.x -= bike * 0.5;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt * 1000;
    }
  }

  render(originX: number, originY: number, facingRight: boolean, color: number, alpha = 1): void {
    this.graphics.clear();
    const g = this.graphics;
    const dir = facingRight ? 1 : -1;
    const headRadius = 7;

    const p = this.currentPose;
    const ox = originX;
    const oy = originY;

    const hx = ox + p.head.x * dir;
    const hy = oy + p.head.y;

    if (this.flashTimer > 0) {
      g.fillStyle(this.flashColor, alpha);
      g.fillCircle(hx, hy, headRadius + 2);
    }

    g.lineStyle(3, color, alpha);
    g.fillStyle(color, 0.15);
    g.fillCircle(hx, hy, headRadius);
    g.strokeCircle(hx, hy, headRadius);

    const nx = ox + p.neck.x * dir;
    const ny = oy + p.neck.y;
    const sx = ox + p.shoulder.x * dir;
    const sy = oy + p.shoulder.y;
    const hix = ox + p.hip.x * dir;
    const hiy = oy + p.hip.y;

    g.beginPath();
    g.moveTo(nx, ny);
    g.lineTo(sx, sy);
    g.lineTo(hix, hiy);
    g.stroke();

    const drawLimb = (fx: number, fy: number, jx: number, jy: number, tx: number, ty: number) => {
      const jx2 = ox + jx * dir;
      const jy2 = oy + jy;
      const tx2 = ox + tx * dir;
      const ty2 = oy + ty;
      g.beginPath();
      g.moveTo(fx, fy);
      g.lineTo(jx2, jy2);
      g.lineTo(tx2, ty2);
      g.stroke();

      g.fillStyle(color, alpha);
      g.fillCircle(jx2, jy2, 2);
    };

    drawLimb(sx, sy, p.elbowL.x, p.elbowL.y, p.handL.x, p.handL.y);
    drawLimb(sx, sy, p.elbowR.x, p.elbowR.y, p.handR.x, p.handR.y);
    drawLimb(hix, hiy, p.kneeL.x, p.kneeL.y, p.footL.x, p.footL.y);
    drawLimb(hix, hiy, p.kneeR.x, p.kneeR.y, p.footR.x, p.footR.y);

    g.fillStyle(color, alpha);
    g.fillCircle(sx, sy, 2);
    g.fillCircle(hix, hiy, 2);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private lerpPose(t: number): void {
    const lerp = (a: number, b: number) => a + (b - a) * t;
    const cp = this.currentPose;
    const tp = this.targetPose;

    const lerpPt = (a: { x: number; y: number }, b: { x: number; y: number }, out: { x: number; y: number }) => {
      out.x = lerp(a.x, b.x);
      out.y = lerp(a.y, b.y);
    };
    const lerpJoint = (a: Joint, b: Joint, out: Joint) => {
      out.x = lerp(a.x, b.x);
      out.y = lerp(a.y, b.y);
      out.angle = lerp(a.angle, b.angle);
    };

    lerpPt(cp.head, tp.head, cp.head);
    lerpPt(cp.neck, tp.neck, cp.neck);
    lerpPt(cp.shoulder, tp.shoulder, cp.shoulder);
    lerpJoint(cp.elbowL, tp.elbowL, cp.elbowL);
    lerpJoint(cp.handL, tp.handL, cp.handL);
    lerpJoint(cp.elbowR, tp.elbowR, cp.elbowR);
    lerpJoint(cp.handR, tp.handR, cp.handR);
    lerpPt(cp.hip, tp.hip, cp.hip);
    lerpJoint(cp.kneeL, tp.kneeL, cp.kneeL);
    lerpJoint(cp.footL, tp.footL, cp.footL);
    lerpJoint(cp.kneeR, tp.kneeR, cp.kneeR);
    lerpJoint(cp.footR, tp.footR, cp.footR);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}
