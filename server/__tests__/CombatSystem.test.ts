import { describe, it, expect, beforeEach } from 'vitest';
import { PLAYER_CONFIG } from 'shared';
import { ServerPlayer } from '../src/game/Player';
import { CombatSystem } from '../src/game/CombatSystem';

describe('CombatSystem', () => {
  let combat: CombatSystem;
  let atk: ServerPlayer;
  let def: ServerPlayer;

  /**
   * Position attacker (facing right) at x=100 and defender at x=170.
   * Punch range=60 from the attacker's front edge (x+40=140), so the
   * hitbox extends from 140 to 200. Defender at x=170 is within range.
   */
  beforeEach(() => {
    combat = new CombatSystem();
    atk = new ServerPlayer('p1', 0, 100, 400, 0);
    def = new ServerPlayer('p2', 1, 170, 400, 0);
    atk.facingRight = true;
    def.facingRight = false;
  });

  describe('hit detection', () => {
    it('deals damage on hit in active window', () => {
      // Punch: startup=80, active=100, recovery=150, total=330
      // Active window when framesElapsed (total - timer) is in [80, 180)
      // So attackTimer in (150, 250] is active
      atk.attackType = 'punch';
      atk.attackTimer = 200;
      const healthBefore = def.health;
      combat.checkCollisions([atk, def]);
      expect(def.health).toBeLessThan(healthBefore);
    });

    it('does not hit when outside active window (startup phase)', () => {
      atk.attackType = 'punch';
      atk.attackTimer = 500;
      const healthBefore = def.health;
      combat.checkCollisions([atk, def]);
      expect(def.health).toBe(healthBefore);
    });

    it('does not hit when out of range', () => {
      def.x = 1000;
      atk.attackType = 'punch';
      atk.attackTimer = 200;
      const healthBefore = def.health;
      combat.checkCollisions([atk, def]);
      expect(def.health).toBe(healthBefore);
    });

    it('only hits once per tick per defender', () => {
      atk.attackType = 'punch';
      atk.attackTimer = 200;
      combat.checkCollisions([atk, def]);
      const healthAfterFirst = def.health;
      combat.checkCollisions([atk, def]);
      expect(def.health).toBe(healthAfterFirst);
    });
  });

  describe('scaling & rewards', () => {
    it('combo scaling reduces damage on successive hits', () => {
      atk.attackType = 'punch';
      atk.attackTimer = 200;
      atk.combo = 5;
      combat.checkCollisions([atk, def]);
      const punchDamage = PLAYER_CONFIG.MAX_HEALTH - def.health;
      expect(punchDamage).toBeLessThan(80);
    });

    it('defender gains ultimate on taking a hit', () => {
      atk.attackType = 'punch';
      atk.attackTimer = 200;
      const ultBefore = def.ultimate;
      combat.checkCollisions([atk, def]);
      expect(def.ultimate).toBeGreaterThan(ultBefore);
    });

    it('attacker gains ultimate on landing a hit', () => {
      atk.attackType = 'punch';
      atk.attackTimer = 200;
      const ultBefore = atk.ultimate;
      combat.checkCollisions([atk, def]);
      expect(atk.ultimate).toBeGreaterThan(ultBefore);
    });
  });
});
