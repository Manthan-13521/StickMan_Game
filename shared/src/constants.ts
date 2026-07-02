export const GAME_CONFIG = {
  TICK_RATE: 50,
  TICK_DURATION: 1000 / 50,
  MAX_PLAYERS: 2,
  ROUNDS_TO_WIN: 2,
  COUNTDOWN_SECONDS: 3,
  ROUND_DURATION: 99,
  KO_DELAY: 2000,
} as const;

export const PLAYER_CONFIG = {
  SPEED: 300,
  JUMP_FORCE: -600,
  GRAVITY: 1800,
  WIDTH: 40,
  HEIGHT: 80,
  MAX_HEALTH: 1000,
  ULTIMATE_MAX: 100,
  ULTIMATE_PER_HIT: 10,
  ULTIMATE_PER_TAKE_HIT: 5,
  BLOCK_DAMAGE_MULTIPLIER: 0.3,
  KNOCKBACK_DURATION: 300,
  GETUP_DURATION: 500,
  INVINCIBILITY_DURATION: 1000,
  AIR_FRICTION: 0.98,
  GROUND_FRICTION: 0.85,
  WALK_ACCELERATION: 2000,
  STAGE_LEFT: 0,
  STAGE_RIGHT: 1200,
  STAGE_GROUND: 500,
  STAGE_CEILING: 0,
} as const;

export const ATTACK_CONFIG = {
  PUNCH: {
    damage: 80,
    range: 60,
    startup: 80,
    active: 100,
    recovery: 150,
    knockback: 300,
    hitstop: 80,
    comboWindow: 300,
  },
  KICK: {
    damage: 120,
    range: 75,
    startup: 120,
    active: 120,
    recovery: 200,
    knockback: 450,
    hitstop: 120,
    comboWindow: 200,
  },
  HEAVY: {
    damage: 200,
    range: 70,
    startup: 200,
    active: 150,
    recovery: 300,
    knockback: 600,
    hitstop: 150,
    comboWindow: 150,
  },
} as const;

export const ROOM_CODE_LENGTH = 6;
export const MAX_ROOMS = 100;
export const ROOM_IDLE_TIMEOUT = 300000;
export const RECONNECTION_TIMEOUT = 10000;
export const HEARTBEAT_INTERVAL = 3000;
export const PING_INTERVAL = 2000;
export const INPUT_BUFFER_SIZE = 60;
export const STATE_BUFFER_SIZE = 60;
