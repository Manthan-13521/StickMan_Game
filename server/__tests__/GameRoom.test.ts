import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from 'socket.io';
import { GAME_CONFIG } from 'shared';
import { GameRoom } from '../src/rooms/GameRoom';

function createMockSocket(id: string) {
  return {
    id,
    join: vi.fn(),
    leave: vi.fn(),
    emit: vi.fn(),
    to: vi.fn().mockReturnThis(),
    on: vi.fn(),
  } as any;
}

function createMockIo() {
  const io = {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    in: vi.fn().mockReturnThis(),
  };
  return io as any;
}

describe('GameRoom', () => {
  let room: GameRoom;
  let io: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    io = createMockIo();
    room = new GameRoom('ABC123', io);
  });

  it('starts not full with 0 players', () => {
    expect(room.isFull).toBe(false);
    expect(room.playerCount).toBe(0);
  });

  it('is full after adding 2 players', () => {
    room.addPlayer(createMockSocket('s1'));
    expect(room.isFull).toBe(false);
    room.addPlayer(createMockSocket('s2'));
    expect(room.isFull).toBe(true);
  });

  it('stores player in internal map', () => {
    const s = createMockSocket('s1');
    room.addPlayer(s);
    expect(room.playerCount).toBe(1);
  });

  it('handles input during fighting phase without error', () => {
    const s = createMockSocket('s1');
    room.addPlayer(s);
    room.handleInput('s1', {
      sequence: 1, left: true, right: false, up: false, down: false,
      punch: false, kick: false, block: false, timestamp: Date.now(),
    });
    // No crash = success
    expect(true).toBe(true);
  });

  it('removes player on disconnect', () => {
    room.addPlayer(createMockSocket('s1'));
    room.addPlayer(createMockSocket('s2'));
    room.handleDisconnect('s1');
    expect(room.playerCount).toBe(1);
  });

  it('tracks rematch requests', () => {
    room.addPlayer(createMockSocket('s1'));
    room.addPlayer(createMockSocket('s2'));
    room.requestRematch('s1');
    room.requestRematch('s2');
    expect(io.to).toHaveBeenCalled();
  });

  it('destroys cleanly', () => {
    room.addPlayer(createMockSocket('s1'));
    room.destroy();
    expect(room.playerCount).toBe(0);
  });
});
