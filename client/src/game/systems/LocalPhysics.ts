import { updatePhysics as sharedUpdatePhysics, pushApart as sharedPushApart, createPhysicsState as sharedCreatePhysicsState } from '@/shared';
import type { PhysicalState as SharedPhysicalState } from '@/shared';

export type PhysicalState = SharedPhysicalState;

export function createPhysicsState(x: number, y: number, facingRight: boolean): PhysicalState {
  return sharedCreatePhysicsState(x, y, facingRight);
}

export function updatePhysics(
  state: PhysicalState,
  dt: number,
  moveX: number,
  jump: boolean,
  fastFall = false,
  inHitstun = false,
): void {
  sharedUpdatePhysics(state, dt, moveX, jump, fastFall, inHitstun);
}

export function pushApart(a: PhysicalState, b: PhysicalState): void {
  sharedPushApart(a, b);
}
