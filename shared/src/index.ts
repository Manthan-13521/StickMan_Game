export { ClientEvent, ServerEvent } from './events';
export type { ClientEventType, ServerEventType } from './events';
export { GAME_CONFIG, PLAYER_CONFIG, ATTACK_CONFIG, COMBAT_CONFIG, ROOM_CODE_LENGTH, MAX_ROOMS, ROOM_IDLE_TIMEOUT, RECONNECTION_TIMEOUT, HEARTBEAT_INTERVAL, PING_INTERVAL, INPUT_BUFFER_SIZE, STATE_BUFFER_SIZE } from './constants';
export { PlayerStance, GamePhase, MatchResult } from './types';
export type { PlayerInput, PlayerSnapshot, GameStateSnapshot, RoomInfo, CreateRoomResponse, JoinRoomResponse, ErrorResponse } from './types';
export { validateRoomCode, validatePlayerInput, sanitizePlayerInput, validateSnapshot, clampHealth, clampPosition, validateInputRate } from './validation';

export type { CombatState, AttackConfig, AttackType } from './combat/types';
export type { HitResult } from './combat/engine';
export {
  createCombatState,
  getAttackConfig,
  getAttackTotalDuration,
  getAttackPhase,
  updateCombatTimers,
  handleAttackInput,
  startAttack,
  checkHit,
  applyHit,
  updateStance,
} from './combat/engine';

export type { PhysicalState } from './physics/engine';
export {
  createPhysicsState as createPhysicalState,
  updatePhysics,
  pushApart,
  applyKnockback,
} from './physics/engine';
