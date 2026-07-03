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
    knockback: 120,
    knockbackY: -50,
    hitstop: 60,
    comboWindow: 300,
    chainInto: null,
    groundBounce: false,
  },
  KICK: {
    damage: 120,
    range: 75,
    startup: 150,
    active: 120,
    recovery: 250,
    knockback: 200,
    knockbackY: -120,
    hitstop: 80,
    comboWindow: 200,
    chainInto: null,
    groundBounce: false,
  },
  HEAVY: {
    damage: 200,
    range: 70,
    startup: 250,
    active: 150,
    recovery: 400,
    knockback: 350,
    knockbackY: -220,
    hitstop: 120,
    comboWindow: 150,
    chainInto: null,
    groundBounce: false,
  },
  ULTIMATE: {
    damage: 400,
    range: 100,
    startup: 100,
    active: 250,
    recovery: 500,
    knockback: 500,
    knockbackY: -350,
    hitstop: 200,
    comboWindow: 100,
    chainInto: null,
    groundBounce: false,
  },
} as const;

export const COMBAT_CONFIG = {
  COMBO_SCALING: 0.85,
  COMBO_TIMER_MS: 2000,
  JUGGLE_GRAVITY_MULTIPLIER: 0.6,
  GROUND_BOUNCE_VY: -400,
  CANCEL_WINDOW_RATIO: 0.3,
  ULTIMATE_COST: 100,
  ULTIMATE_ARMOR_DURATION: 200,
} as const;

export const ROOM_CODE_LENGTH = 6;
export const MAX_ROOMS = 100;
export const ROOM_IDLE_TIMEOUT = 300000;
export const RECONNECTION_TIMEOUT = 10000;
export const HEARTBEAT_INTERVAL = 3000;
export const PING_INTERVAL = 2000;
export const INPUT_BUFFER_SIZE = 60;
export const STATE_BUFFER_SIZE = 60;
