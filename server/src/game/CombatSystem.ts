import { ATTACK_CONFIG, PLAYER_CONFIG } from 'shared';
import { ServerPlayer } from './Player';

export class CombatSystem {
  checkCollisions(players: [ServerPlayer, ServerPlayer]): void {
    for (let i = 0; i < 2; i++) {
      const attacker = players[i];
      const defender = players[1 - i];

      if (!attacker.currentAttack || attacker.attackTimer === undefined) continue;

      const config = this.getAttackConfig(attacker.attackType);
      if (!config) continue;

      const totalFrames = config.startup + config.active + config.recovery;
      const framesElapsed = totalFrames - attacker.attackTimer;
      const inActiveWindow = framesElapsed >= config.startup && framesElapsed < config.startup + config.active;

      if (!inActiveWindow) continue;

      const attackerHitbox = this.getHitbox(attacker, config.range);
      const defenderHitbox = this.getHitbox(defender, 0);

      if (this.overlaps(attackerHitbox, defenderHitbox)) {
        const knockbackX = attacker.facingRight ? config.knockback : -config.knockback;
        defender.takeDamage(config.damage, knockbackX, config.knockback * 0.3, config.hitstop);
        attacker.startCombo();
        attacker.addUltimate(PLAYER_CONFIG.ULTIMATE_PER_HIT);
        defender.addUltimate(PLAYER_CONFIG.ULTIMATE_PER_TAKE_HIT);
        attacker.currentAttack = null;
        attacker.attackTimer = 0;
      }
    }
  }

  private getAttackConfig(type: string | null): { readonly damage: number; readonly range: number; readonly startup: number; readonly active: number; readonly recovery: number; readonly knockback: number; readonly hitstop: number; readonly comboWindow: number } | undefined {
    switch (type) {
      case 'punch': return ATTACK_CONFIG.PUNCH;
      case 'kick': return ATTACK_CONFIG.KICK;
      case 'heavy': return ATTACK_CONFIG.HEAVY;
      default: return undefined;
    }
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
