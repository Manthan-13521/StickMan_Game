import Phaser from 'phaser';
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
    const fx = (x: number, y: number) => ({ x: originX + x * dir, y: originY + y });
    const head = fx(p.head.x, p.head.y);

    if (this.flashTimer > 0) {
      g.fillStyle(this.flashColor, alpha);
      g.fillCircle(head.x, head.y, headRadius + 2);
    }

    g.lineStyle(3, color, alpha);
    g.fillStyle(color, 0.15);
    g.fillCircle(head.x, head.y, headRadius);
    g.strokeCircle(head.x, head.y, headRadius);

    const neck = fx(p.neck.x, p.neck.y);
    const shoulder = fx(p.shoulder.x, p.shoulder.y);
    const hip = fx(p.hip.x, p.hip.y);

    g.beginPath();
    g.moveTo(neck.x, neck.y);
    g.lineTo(shoulder.x, shoulder.y);
    g.lineTo(hip.x, hip.y);
    g.stroke();

    const drawLimb = (from: { x: number; y: number }, joint: Joint, to: Joint) => {
      const j = fx(joint.x, joint.y);
      const t = fx(to.x, to.y);
      g.beginPath();
      g.moveTo(from.x, from.y);
      g.lineTo(j.x, j.y);
      g.lineTo(t.x, t.y);
      g.stroke();

      g.fillStyle(color, alpha);
      g.fillCircle(j.x, j.y, 2);
    };

    drawLimb({ x: shoulder.x, y: shoulder.y }, p.elbowL, p.handL);
    drawLimb({ x: shoulder.x, y: shoulder.y }, p.elbowR, p.handR);
    drawLimb({ x: hip.x, y: hip.y }, p.kneeL, p.footL);
    drawLimb({ x: hip.x, y: hip.y }, p.kneeR, p.footR);

    g.fillStyle(color, alpha);
    g.fillCircle(shoulder.x, shoulder.y, 2);
    g.fillCircle(hip.x, hip.y, 2);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private lerpPose(t: number): void {
    const lerp = (a: number, b: number) => a + (b - a) * t;
    const lerpJoint = (a: Joint, b: Joint): Joint => ({
      x: lerp(a.x, b.x), y: lerp(a.y, b.y), angle: lerp(a.angle, b.angle),
    });
    const lerpPt = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
      x: lerp(a.x, b.x), y: lerp(a.y, b.y),
    });

    this.currentPose = {
      head: lerpPt(this.currentPose.head, this.targetPose.head),
      neck: lerpPt(this.currentPose.neck, this.targetPose.neck),
      shoulder: lerpPt(this.currentPose.shoulder, this.targetPose.shoulder),
      elbowL: lerpJoint(this.currentPose.elbowL, this.targetPose.elbowL),
      handL: lerpJoint(this.currentPose.handL, this.targetPose.handL),
      elbowR: lerpJoint(this.currentPose.elbowR, this.targetPose.elbowR),
      handR: lerpJoint(this.currentPose.handR, this.targetPose.handR),
      hip: lerpPt(this.currentPose.hip, this.targetPose.hip),
      kneeL: lerpJoint(this.currentPose.kneeL, this.targetPose.kneeL),
      footL: lerpJoint(this.currentPose.footL, this.targetPose.footL),
      kneeR: lerpJoint(this.currentPose.kneeR, this.targetPose.kneeR),
      footR: lerpJoint(this.currentPose.footR, this.targetPose.footR),
    };
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}
