import { PLAYER_CONFIG } from '@/shared';

export interface PhysicalState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facingRight: boolean;
}

export function createPhysicsState(x: number, y: number, facingRight: boolean): PhysicalState {
  return { x, y, vx: 0, vy: 0, grounded: false, facingRight };
}

export function updatePhysics(state: PhysicalState, dt: number, moveX: number, jump: boolean): void {
  state.vx += moveX * PLAYER_CONFIG.SPEED * dt;

  if (jump && state.grounded) {
    state.vy = PLAYER_CONFIG.JUMP_FORCE;
    state.grounded = false;
  }

  if (!state.grounded) {
    state.vy += PLAYER_CONFIG.GRAVITY * dt;
  } else {
    state.vx *= PLAYER_CONFIG.GROUND_FRICTION;
  }

  state.x += state.vx * dt;
  state.y += state.vy * dt;

  if (state.x < PLAYER_CONFIG.STAGE_LEFT) {
    state.x = PLAYER_CONFIG.STAGE_LEFT;
    state.vx = 0;
  }
  if (state.x + PLAYER_CONFIG.WIDTH > PLAYER_CONFIG.STAGE_RIGHT) {
    state.x = PLAYER_CONFIG.STAGE_RIGHT - PLAYER_CONFIG.WIDTH;
    state.vx = 0;
  }
  if (state.y < PLAYER_CONFIG.STAGE_CEILING) {
    state.y = PLAYER_CONFIG.STAGE_CEILING;
    state.vy = 0;
  }
  if (state.y + PLAYER_CONFIG.HEIGHT >= PLAYER_CONFIG.STAGE_GROUND) {
    state.y = PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT;
    state.vy = 0;
    state.grounded = true;
  }

  if (Math.abs(state.vx) > PLAYER_CONFIG.SPEED) {
    state.vx = Math.sign(state.vx) * PLAYER_CONFIG.SPEED;
  }

  if (moveX > 0) state.facingRight = true;
  else if (moveX < 0) state.facingRight = false;
}

export function pushApart(a: PhysicalState, b: PhysicalState): void {
  const aRight = a.x + PLAYER_CONFIG.WIDTH;
  const bRight = b.x + PLAYER_CONFIG.WIDTH;

  if (a.x < bRight && aRight > b.x) {
    const overlap = Math.min(aRight - b.x, bRight - a.x) / 2;
    a.x -= overlap;
    b.x += overlap;
  }
}
