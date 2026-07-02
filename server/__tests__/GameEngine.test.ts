import { describe, it, expect, beforeEach } from 'vitest';
import { GamePhase } from 'shared';
import { GameEngine } from '../src/game/GameEngine';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine([0, 0]);
  });

  it('starts in FIGHTING phase', () => {
    const state = engine.getState();
    expect(state.phase).toBe(GamePhase.FIGHTING);
  });

  it('initializes two players at correct positions', () => {
    const state = engine.getState();
    expect(state.players).toHaveLength(2);
    expect(state.players[0].id).toBe('p1');
    expect(state.players[1].id).toBe('p2');
  });

  it('moves player left on left input', () => {
    const xBefore = engine.getState().players[0].x;
    engine.handleInput(0, {
      sequence: 1, left: true, right: false, up: false, down: false,
      punch: false, kick: false, block: false, timestamp: Date.now(),
    });
    engine.tick();
    const state = engine.getState();
    expect(state.players[0].x).toBeLessThan(xBefore);
  });

  it('moves player right on right input', () => {
    const xBefore = engine.getState().players[0].x;
    engine.handleInput(0, {
      sequence: 1, left: false, right: true, up: false, down: false,
      punch: false, kick: false, block: false, timestamp: Date.now(),
    });
    engine.tick();
    const state = engine.getState();
    expect(state.players[0].x).toBeGreaterThan(xBefore);
  });

  it('deals damage on punch hit', () => {
    let seq = 1;
    // Move P1 right and P2 left until they're close (80 ticks at 4.8px/tick)
    for (let i = 0; i < 80; i++) {
      engine.handleInput(0, {
        sequence: seq++, left: false, right: true, up: false, down: false,
        punch: false, kick: false, block: false, timestamp: Date.now(),
      });
      engine.handleInput(1, {
        sequence: seq++, left: true, right: false, up: false, down: false,
        punch: false, kick: false, block: false, timestamp: Date.now(),
      });
      engine.tick();
    }

    const middleState = engine.getState();
    expect(middleState.players[0].x).toBeGreaterThan(550); // moved right
    expect(middleState.players[1].x).toBeLessThan(650); // moved left

    // Have P1 punch. The attack goes through startup (80 ticks), then active (100 ticks)
    const healthBefore = middleState.players[1].health;
    engine.handleInput(0, {
      sequence: seq++, left: false, right: false, up: false, down: false,
      punch: true, kick: false, block: false, timestamp: Date.now(),
    });

    // Tick through startup + active phase (no further input needed, attack auto-advances)
    for (let i = 0; i < 120; i++) {
      engine.tick();
    }

    const state = engine.getState();
    expect(state.players[1].health).toBeLessThan(healthBefore);
  }, 10000);

  it('includes lastProcessedInput and timestamp in snapshots', () => {
    const state = engine.getState();
    expect(state.players[0].lastProcessedInput).toBeDefined();
    expect(state.players[0].timestamp).toBeDefined();
    expect(state.timestamp).toBeDefined();
  });

  it('includes ultimateReady flag', () => {
    engine.handleInput(0, {
      sequence: 1, left: false, right: false, up: false, down: false,
      punch: true, kick: true, block: false, timestamp: Date.now(),
    });
    const state = engine.getState();
    expect(typeof state.players[0].ultimateReady).toBe('boolean');
  });

  it('handles disconnection', () => {
    engine.handleDisconnect('p2');
    engine.tick();
    const state = engine.getState();
    expect(state.phase).toBe(GamePhase.KO);
    expect(state.winner).toBe('p1');
  });

  it('returns empty state when no players', () => {
    const emptyEngine = new GameEngine([0, 0]);
    const state = emptyEngine.getState();
    expect(state.players).toHaveLength(2);
  });
});
