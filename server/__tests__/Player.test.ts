import { describe, it, expect, beforeEach } from 'vitest';
import { PLAYER_CONFIG, PlayerStance } from 'shared';
import { ServerPlayer } from '../src/game/Player';

function createPlayer(wins = 0): ServerPlayer {
  return new ServerPlayer('test-p1', 0, 100, 400, wins);
}

describe('ServerPlayer', () => {
  let player: ServerPlayer;

  beforeEach(() => {
    player = createPlayer();
  });

  it('initializes with full health', () => {
    expect(player.health).toBe(PLAYER_CONFIG.MAX_HEALTH);
    expect(player.maxHealth).toBe(PLAYER_CONFIG.MAX_HEALTH);
  });

  it('initializes with idle stance', () => {
    expect(player.stance).toBe(PlayerStance.IDLE);
  });

  it('faces right for player 0, left for player 1', () => {
    const p0 = new ServerPlayer('p0', 0, 100, 400, 0);
    expect(p0.facingRight).toBe(true);
    const p1 = new ServerPlayer('p1', 1, 100, 400, 0);
    expect(p1.facingRight).toBe(false);
  });

  it('processes valid input by sequence', () => {
    const input = {
      sequence: 1, left: true, right: false, up: false, down: false,
      punch: false, kick: false, block: false, timestamp: Date.now(),
    };
    player.setInput(input);
    expect(player.lastProcessedSeq).toBe(1);
  });

  it('ignores stale input (lower sequence)', () => {
    player.setInput({ sequence: 5, left: false, right: false, up: false, down: false, punch: false, kick: false, block: false, timestamp: Date.now() });
    player.setInput({ sequence: 3, left: false, right: false, up: false, down: false, punch: false, kick: false, block: false, timestamp: Date.now() });
    expect(player.lastProcessedSeq).toBe(5);
  });

  it('sets dead stance when health reaches 0', () => {
    player.health = 0;
    player.update();
    expect(player.stance).toBe(PlayerStance.DEAD);
  });

  it('applies damage correctly', () => {
    player.takeDamage(100, 200, -200, 80);
    expect(player.health).toBe(PLAYER_CONFIG.MAX_HEALTH - 100);
    expect(player.velocityX).toBe(200);
    expect(player.stance).toBe(PlayerStance.HIT);
  });

  it('reduces damage when blocking', () => {
    player.isBlocking = true;
    player.takeDamage(100, 200, -200, 80);
    const blockedDamage = Math.floor(100 * PLAYER_CONFIG.BLOCK_DAMAGE_MULTIPLIER);
    expect(player.health).toBe(PLAYER_CONFIG.MAX_HEALTH - blockedDamage);
  });

  it('ignores damage during invincibility frames', () => {
    player.takeDamage(100, 200, -200, 80);
    const healthAfter = player.health;
    player.takeDamage(200, 300, -300, 80);
    expect(player.health).toBe(healthAfter);
  });

  it('ignores damage during ultimate armor', () => {
    player.ultimateArmorTimer = 10;
    player.takeDamage(999, 0, 0, 0);
    expect(player.health).toBe(PLAYER_CONFIG.MAX_HEALTH);
  });

  it('starts attack on punch input', () => {
    player.setInput({ sequence: 1, left: false, right: false, up: false, down: false, punch: true, kick: false, block: false, timestamp: Date.now() });
    player.update();
    expect(player.attackType).toBe('punch');
    expect(player.attackTimer).toBeGreaterThan(0);
  });

  it('starts attack on kick input', () => {
    player.setInput({ sequence: 1, left: false, right: false, up: false, down: false, punch: false, kick: true, block: false, timestamp: Date.now() });
    player.update();
    expect(player.attackType).toBe('kick');
  });

  it('triggers heavy attack on punch+kick', () => {
    player.setInput({ sequence: 1, left: false, right: false, up: false, down: false, punch: true, kick: true, block: false, timestamp: Date.now() });
    player.update();
    expect(player.attackType).toBe('heavy');
  });

  it('triggers ultimate on punch+kick with full meter', () => {
    player.ultimate = 100;
    player.setInput({ sequence: 1, left: false, right: false, up: false, down: false, punch: true, kick: true, block: false, timestamp: Date.now() });
    player.update();
    expect(player.attackType).toBe('ultimate');
    expect(player.ultimate).toBe(0);
    expect(player.ultimateArmorTimer).toBeGreaterThan(0);
  });

  it('accumulates ultimate meter', () => {
    player.addUltimate(10);
    expect(player.ultimate).toBe(10);
    player.addUltimate(95);
    expect(player.ultimate).toBe(PLAYER_CONFIG.ULTIMATE_MAX);
  });

  it('increments combo and sets combo timer', () => {
    player.startCombo();
    expect(player.combo).toBe(1);
    expect(player.comboResetTimer).toBeGreaterThan(0);
  });

  it('moves left on left input', () => {
    player.setInput({ sequence: 1, left: true, right: false, up: false, down: false, punch: false, kick: false, block: false, timestamp: Date.now() });
    player.update();
    expect(player.velocityX).toBeLessThan(0);
    expect(player.facingRight).toBe(false);
  });

  it('moves right on right input', () => {
    player.setInput({ sequence: 1, left: false, right: true, up: false, down: false, punch: false, kick: false, block: false, timestamp: Date.now() });
    player.update();
    expect(player.velocityX).toBeGreaterThan(0);
    expect(player.facingRight).toBe(true);
  });

  it('jumps on up input when grounded', () => {
    player.isGrounded = true;
    player.setInput({ sequence: 1, left: false, right: false, up: true, down: false, punch: false, kick: false, block: false, timestamp: Date.now() });
    player.update();
    expect(player.velocityY).toBe(PLAYER_CONFIG.JUMP_FORCE);
    expect(player.isGrounded).toBe(false);
  });

  it('applies ground bounce', () => {
    player.applyGroundBounce();
    expect(player.velocityY).toBeLessThan(0);
    expect(player.knockbackTimer).toBeGreaterThan(0);
  });
});
