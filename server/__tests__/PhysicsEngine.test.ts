import { describe, it, expect, beforeEach } from 'vitest';
import { PLAYER_CONFIG } from 'shared';
import { ServerPlayer } from '../src/game/Player';
import { PhysicsEngine } from '../src/game/PhysicsEngine';

describe('PhysicsEngine', () => {
  let physics: PhysicsEngine;
  let p1: ServerPlayer;
  let p2: ServerPlayer;

  beforeEach(() => {
    physics = new PhysicsEngine();
    p1 = new ServerPlayer('p1', 0, 100, 400, 0);
    p2 = new ServerPlayer('p2', 1, 300, 400, 0);
  });

  it('applies gravity to airborne players', () => {
    p1.isGrounded = false;
    p1.velocityY = 0;
    const vyBefore = p1.velocityY;
    physics.update([p1, p2]);
    expect(p1.velocityY).toBeGreaterThan(vyBefore);
  });

  it('applies reduced gravity during knockback juggle', () => {
    p1.isGrounded = false;
    p1.knockbackTimer = 10;
    p1.velocityY = 0;
    physics.update([p1, p2]);
    const juggleGravity = p1.velocityY;
    p1.knockbackTimer = 0;
    p1.velocityY = 0;
    physics.update([p1, p2]);
    expect(Math.abs(juggleGravity)).toBeLessThan(Math.abs(p1.velocityY));
  });

  it('stops player at stage left boundary', () => {
    p1.x = -50;
    p1.velocityX = -500;
    physics.update([p1, p2]);
    expect(p1.x).toBe(PLAYER_CONFIG.STAGE_LEFT);
    expect(p1.velocityX).toBe(0);
  });

  it('stops player at stage right boundary', () => {
    p1.x = 1300;
    p1.velocityX = 500;
    physics.update([p1, p2]);
    expect(p1.x + PLAYER_CONFIG.WIDTH).toBeLessThanOrEqual(PLAYER_CONFIG.STAGE_RIGHT);
    expect(p1.velocityX).toBe(0);
  });

  it('stops player at ceiling', () => {
    p1.y = -50;
    p1.velocityY = -500;
    physics.update([p1, p2]);
    expect(p1.y).toBe(PLAYER_CONFIG.STAGE_CEILING);
    expect(p1.velocityY).toBe(0);
  });

  it('grounds player at floor level', () => {
    p1.y = 500;
    p1.velocityY = 200;
    p1.isGrounded = false;
    physics.update([p1, p2]);
    expect(p1.y + PLAYER_CONFIG.HEIGHT).toBeLessThanOrEqual(PLAYER_CONFIG.STAGE_GROUND);
    expect(p1.isGrounded).toBe(true);
    expect(p1.velocityY).toBe(0);
  });

  it('pushes apart overlapping players', () => {
    p1.x = 250;
    p2.x = 260;
    physics.update([p1, p2]);
    expect(p1.x + PLAYER_CONFIG.WIDTH).toBeLessThanOrEqual(p2.x);
  });

  it('skips physics for dead players', () => {
    p1.health = 0;
    p1.velocityX = 500;
    physics.update([p1, p2]);
    expect(p1.velocityX).toBe(500);
  });
});
