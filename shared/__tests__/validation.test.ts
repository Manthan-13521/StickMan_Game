import { describe, it, expect } from 'vitest';
import {
  validateRoomCode,
  validatePlayerInput,
  sanitizePlayerInput,
  validateSnapshot,
  clampHealth,
  clampPosition,
  validateInputRate,
} from '../src/validation';
import type { PlayerInput, PlayerSnapshot } from '../src/types';

describe('validateRoomCode', () => {
  it('accepts valid 6-char alphanumeric uppercase codes', () => {
    expect(validateRoomCode('ABC123')).toBe(true);
    expect(validateRoomCode('XYZW99')).toBe(true);
  });

  it('rejects codes with wrong length', () => {
    expect(validateRoomCode('ABC12')).toBe(false);
    expect(validateRoomCode('ABC1234')).toBe(false);
    expect(validateRoomCode('')).toBe(false);
  });

  it('rejects codes with lowercase letters', () => {
    expect(validateRoomCode('abc123')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(validateRoomCode(123456 as any)).toBe(false);
    expect(validateRoomCode(null as any)).toBe(false);
    expect(validateRoomCode(undefined as any)).toBe(false);
  });
});

describe('validatePlayerInput', () => {
  const validInput: PlayerInput = {
    sequence: 1,
    left: false,
    right: true,
    up: false,
    down: false,
    punch: true,
    kick: false,
    block: false,
    timestamp: Date.now(),
  };

  it('accepts valid input', () => {
    expect(validatePlayerInput(validInput)).toBe(true);
  });

  it('rejects null/undefined', () => {
    expect(validatePlayerInput(null)).toBe(false);
    expect(validatePlayerInput(undefined)).toBe(false);
  });

  it('rejects missing fields', () => {
    const { sequence, ...noSeq } = validInput;
    expect(validatePlayerInput(noSeq)).toBe(false);
  });

  it('rejects non-integer sequence', () => {
    expect(validatePlayerInput({ ...validInput, sequence: 1.5 })).toBe(false);
  });

  it('rejects negative sequence', () => {
    expect(validatePlayerInput({ ...validInput, sequence: -1 })).toBe(false);
  });

  it('rejects non-boolean action fields', () => {
    expect(validatePlayerInput({ ...validInput, left: 1 as any })).toBe(false);
  });
});

describe('sanitizePlayerInput', () => {
  it('clamps sequence to floor >= 0', () => {
    const result = sanitizePlayerInput({
      sequence: -5.7,
      left: null as any,
      right: undefined as any,
      up: 0 as any,
      down: 'false' as any,
      punch: 1 as any,
      kick: '' as any,
      block: undefined as any,
      timestamp: 0,
    });
    expect(result.sequence).toBe(0);
    expect(result.left).toBe(false);
    expect(result.right).toBe(false);
    expect(result.punch).toBe(true);
  });
});

describe('validateSnapshot', () => {
  const validSnapshot: PlayerSnapshot = {
    id: 'p1',
    x: 100,
    y: 200,
    velocityX: 0,
    velocityY: 0,
    facingRight: true,
    stance: 'idle' as any,
    health: 500,
    maxHealth: 1000,
    combo: 0,
    ultimate: 0,
    wins: 0,
  };

  it('accepts valid snapshot', () => {
    expect(validateSnapshot(validSnapshot)).toBe(true);
  });

  it('rejects health below 0', () => {
    expect(validateSnapshot({ ...validSnapshot, health: -1 })).toBe(false);
  });

  it('rejects health above maxHealth', () => {
    expect(validateSnapshot({ ...validSnapshot, health: 1500 })).toBe(false);
  });

  it('rejects missing id', () => {
    const { id, ...noId } = validSnapshot;
    expect(validateSnapshot(noId)).toBe(false);
  });

  it('rejects non-numeric x', () => {
    expect(validateSnapshot({ ...validSnapshot, x: 'abc' as any })).toBe(false);
  });
});

describe('clampHealth', () => {
  it('clamps to 0 minimum', () => {
    expect(clampHealth(-100)).toBe(0);
  });

  it('clamps to MAX_HEALTH maximum', () => {
    expect(clampHealth(9999)).toBe(1000);
  });

  it('preserves in-range values', () => {
    expect(clampHealth(500)).toBe(500);
  });
});

describe('clampPosition', () => {
  it('clamps x within stage bounds', () => {
    const { x } = clampPosition(-100, 300);
    expect(x).toBe(0);
    const { x: x2 } = clampPosition(9999, 300);
    expect(x2).toBe(1160);
  });

  it('clamps y within stage bounds', () => {
    const { y } = clampPosition(100, -100);
    expect(y).toBe(0);
    const { y: y2 } = clampPosition(100, 9999);
    expect(y2).toBe(420);
  });
});

describe('validateInputRate', () => {
  const base: PlayerInput = {
    sequence: 5, left: false, right: false, up: false, down: false,
    punch: false, kick: false, block: false, timestamp: 1000,
  };

  it('accepts first input (no previous)', () => {
    expect(validateInputRate(null, base)).toBe(true);
  });

  it('accepts sequential input', () => {
    const prev = { ...base, sequence: 4, timestamp: 900 };
    expect(validateInputRate(prev, base)).toBe(true);
  });

  it('rejects duplicate sequence', () => {
    const prev = { ...base, sequence: 5, timestamp: 900 };
    expect(validateInputRate(prev, base)).toBe(false);
  });

  it('rejects large sequence gap', () => {
    const prev = { ...base, sequence: 4, timestamp: 900 };
    const curr = { ...base, sequence: 15, timestamp: 1000 };
    expect(validateInputRate(prev, curr)).toBe(false);
  });

  it('rejects negative time diff', () => {
    const prev = { ...base, sequence: 4, timestamp: 1100 };
    expect(validateInputRate(prev, base)).toBe(false);
  });
});
