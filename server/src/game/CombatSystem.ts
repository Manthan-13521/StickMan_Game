import { ATTACK_CONFIG, PLAYER_CONFIG, COMBAT_CONFIG } from 'shared';
import { ServerPlayer } from './Player';

export class CombatSystem {
  private hitThisTick: Set<string> = new Set();

  checkCollisions(players: [ServerPlayer, ServerPlayer]): void {
    this.hitThisTick.clear();

    for (let i = 0; i < 2; i++) {
      const attacker = players[i];
      const defender = players[1 - i];

      if (!attacker.attackType || attacker.attackTimer === undefined) continue;

      const config = attacker.getAttackConfig(attacker.attackType);
      if (!config) continue;

      const totalFrames = config.startup + config.active + config.recovery;
      const framesElapsed = totalFrames - attacker.attackTimer;
      const inActiveWindow = framesElapsed >= config.startup && framesElapsed < config.startup + config.active;

      if (!inActiveWindow) continue;

      if (this.hitThisTick.has(defender.id)) continue;

      const attackerHitbox = this.getHitbox(attacker, config.range);
      const defenderHitbox = this.getDefenderHitbox(defender);

      if (!this.overlaps(attackerHitbox, defenderHitbox)) continue;

      this.hitThisTick.add(defender.id);

      const knockbackX = attacker.facingRight ? config.knockback : -config.knockback;
      const knockbackY = config.knockbackY;
      let damage: number = config.damage;
      const isJuggle = !defender.isGrounded;

      if (attacker.combo > 0) {
        damage = Math.floor(damage * Math.pow(COMBAT_CONFIG.COMBO_SCALING, attacker.combo));
      }

      const hitStop = defender.isBlocking ? Math.floor(config.hitstop * 0.5) : config.hitstop;

      defender.takeDamage(damage, knockbackX, knockbackY, hitStop, isJuggle);

      if (defender.health > 0 && !defender.isGrounded && config.groundBounce) {
        defender.applyGroundBounce();
      }

      attacker.startCombo();
      attacker.addUltimate(PLAYER_CONFIG.ULTIMATE_PER_HIT);
      defender.addUltimate(PLAYER_CONFIG.ULTIMATE_PER_TAKE_HIT);

      attacker.wasHitDuringAttack = false;

      if (attacker.hitstopTimer < hitStop) {
        attacker.hitstopTimer = hitStop;
      }
    }
  }

  private getDefenderHitbox(player: ServerPlayer): { x: number; y: number; w: number; h: number } {
    return {
      x: player.x,
      y: player.y,
      w: PLAYER_CONFIG.WIDTH,
      h: PLAYER_CONFIG.HEIGHT,
    };
  }

  private getHitbox(player: ServerPlayer, range: number): { x: number; y: number; w: number; h: number } {
    const originX = player.facingRight ? player.x + PLAYER_CONFIG.WIDTH : player.x;
    return {
      x: player.facingRight ? originX : originX - range,
      y: player.y,
      w: range,
      h: PLAYER_CONFIG.HEIGHT,
    };
  }

  private overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
}
