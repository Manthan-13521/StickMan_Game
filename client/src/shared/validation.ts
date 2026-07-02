import { PLAYER_CONFIG, ROOM_CODE_LENGTH } from './constants';
import type { PlayerInput, PlayerSnapshot } from './types';

export function validateRoomCode(code: string): boolean {
  return typeof code === 'string' && code.length === ROOM_CODE_LENGTH && /^[A-Z0-9]+$/.test(code);
}

export function validatePlayerInput(input: unknown): input is PlayerInput {
  if (!input || typeof input !== 'object') return false;
  const i = input as Record<string, unknown>;
  return (
    typeof i.sequence === 'number' &&
    Number.isInteger(i.sequence) &&
    i.sequence >= 0 &&
    typeof i.left === 'boolean' &&
    typeof i.right === 'boolean' &&
    typeof i.up === 'boolean' &&
    typeof i.down === 'boolean' &&
    typeof i.punch === 'boolean' &&
    typeof i.kick === 'boolean' &&
    typeof i.block === 'boolean' &&
    typeof i.timestamp === 'number'
  );
}

export function sanitizePlayerInput(input: PlayerInput): PlayerInput {
  return {
    sequence: Math.max(0, Math.floor(input.sequence)),
    left: !!input.left,
    right: !!input.right,
    up: !!input.up,
    down: !!input.down,
    punch: !!input.punch,
    kick: !!input.kick,
    block: !!input.block,
    timestamp: Date.now(),
  };
}

export function validateSnapshot(snapshot: unknown): snapshot is PlayerSnapshot {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const s = snapshot as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.x === 'number' &&
    typeof s.y === 'number' &&
    typeof s.health === 'number' &&
    typeof s.maxHealth === 'number' &&
    s.health >= 0 &&
    s.health <= (s.maxHealth as number)
  );
}

export function clampHealth(value: number): number {
  return Math.max(0, Math.min(value, PLAYER_CONFIG.MAX_HEALTH));
}

export function clampPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(PLAYER_CONFIG.STAGE_LEFT, Math.min(x, PLAYER_CONFIG.STAGE_RIGHT - PLAYER_CONFIG.WIDTH)),
    y: Math.max(PLAYER_CONFIG.STAGE_CEILING, Math.min(y, PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT)),
  };
}

export function validateInputRate(lastInput: PlayerInput | null, currentInput: PlayerInput): boolean {
  if (!lastInput) return true;
  const seqDiff = currentInput.sequence - lastInput.sequence;
  const timeDiff = currentInput.timestamp - lastInput.timestamp;
  if (seqDiff <= 0 || seqDiff > 10) return false;
  if (timeDiff < 0 || timeDiff > 1000) return false;
  return true;
}
