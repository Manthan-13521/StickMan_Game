import { PLAYER_CONFIG, COMBAT_CONFIG } from '../constants';

export interface PhysicalState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facingRight: boolean;
  jumpsLeft: number;
}

export function createPhysicsState(
  x: number,
  y: number,
  facingRight: boolean,
): PhysicalState {
  return { x, y, vx: 0, vy: 0, grounded: false, facingRight, jumpsLeft: 1 };
}

export function updatePhysics(
  state: PhysicalState,
  dt: number,
  moveX: number,
  jump: boolean,
  fastFall: boolean,
  inHitstun: boolean,
): void {
  if (inHitstun) {
    if (state.grounded && state.vy >= 0) {
      state.vx *= 0.92;
    }
    applyGravity(state, dt);
    integrate(state, dt);
    applyBounds(state);
    checkGround(state);
    return;
  }

  if (jump) {
    if (state.grounded) {
      state.vy = PLAYER_CONFIG.JUMP_FORCE;
      state.grounded = false;
      state.jumpsLeft = 1;
    } else if (state.jumpsLeft > 0) {
      state.vy = PLAYER_CONFIG.DOUBLE_JUMP_FORCE;
      state.jumpsLeft--;
    }
  }

  if (!state.grounded) {
    state.vy += PLAYER_CONFIG.GRAVITY * dt;

    if (fastFall && state.vy > 0) {
      state.vy += PLAYER_CONFIG.FAST_FALL_SPEED * dt;
      state.vy = Math.min(state.vy, PLAYER_CONFIG.FAST_FALL_SPEED);
    }

    const airAccel = moveX * PLAYER_CONFIG.AIR_ACCELERATION * dt;
    state.vx += airAccel;
    state.vx *= PLAYER_CONFIG.AIR_FRICTION;
  } else {
    const accel = moveX * PLAYER_CONFIG.WALK_ACCELERATION * dt;
    state.vx += accel;

    if (moveX === 0) {
      state.vx *= PLAYER_CONFIG.GROUND_FRICTION;
    }
  }

  const maxSpeed = PLAYER_CONFIG.SPEED;
  if (Math.abs(state.vx) > maxSpeed) {
    state.vx = Math.sign(state.vx) * maxSpeed;
  }

  if (Math.abs(state.vx) < 5) {
    state.vx = 0;
  }

  integrate(state, dt);
  applyBounds(state);
  checkGround(state);
  applyFacing(state, moveX);

  if (state.grounded) {
    state.jumpsLeft = 1;
  }
}

export function applyGravity(state: PhysicalState, dt: number): void {
  if (!state.grounded) {
    state.vy += PLAYER_CONFIG.GRAVITY * dt;
  }
}

export function applyKnockback(
  state: PhysicalState,
  knockbackX: number,
  knockbackY: number,
): void {
  state.vx = knockbackX;
  state.vy = knockbackY;
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

function integrate(state: PhysicalState, dt: number): void {
  state.x += state.vx * dt;
  state.y += state.vy * dt;
}

function applyBounds(state: PhysicalState): void {
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
}

function checkGround(state: PhysicalState): void {
  if (state.y + PLAYER_CONFIG.HEIGHT >= PLAYER_CONFIG.STAGE_GROUND) {
    state.y = PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT;
    state.vy = 0;
    state.grounded = true;
  } else {
    state.grounded = false;
  }
}

function applyFacing(state: PhysicalState, moveX: number): void {
  if (moveX > 0) state.facingRight = true;
  else if (moveX < 0) state.facingRight = false;
}
