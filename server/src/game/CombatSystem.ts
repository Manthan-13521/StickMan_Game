import { PLAYER_CONFIG, GAME_CONFIG } from 'shared';
import type { AttackConfig } from 'shared';
import { checkHit, applyHit, getAttackConfig, getAttackPhase } from 'shared';
import { ServerPlayer } from './Player';

export class CombatSystem {
  private hitThisTick: Set<string> = new Set();

  checkCollisions(players: [ServerPlayer, ServerPlayer]): void {
    this.hitThisTick.clear();

    for (let i = 0; i < 2; i++) {
      const attacker = players[i];
      const defender = players[1 - i];

      const config = getAttackConfig(attacker.attackType);
      if (!config) continue;

      const phase = getAttackPhase(attacker.combat);
      if (phase !== 'active') continue;

      if (this.hitThisTick.has(defender.id)) continue;

      const atkX = attacker.facingRight ? attacker.x + PLAYER_CONFIG.WIDTH : attacker.x;
      const defX = defender.x;
      const dist = Math.abs(atkX - defX);
      const yDist = attacker.y - defender.y;

      if (!checkHit(attacker.combat, defender.combat, config as AttackConfig, dist, yDist)) continue;

      this.hitThisTick.add(defender.id);

      const direction = attacker.facingRight ? 1 : -1;
      const result = applyHit(attacker.combat, defender.combat, config as AttackConfig, direction);

      const atkType = attacker.attackType;
      if (atkType === 'kick') {
        defender.combat.knockdownTimer = 400;
      } else if (atkType === 'heavy') {
        defender.combat.knockdownTimer = 600;
      } else if (atkType === 'ultimate') {
        defender.combat.knockdownTimer = 800;
      }

      const knockbackX = direction * config.knockback * (result.wasBlocking ? 0.3 : 1);
      const knockbackY = config.knockbackY * (result.wasBlocking ? 0.3 : 1);

      defender.velocityX = knockbackX;
      defender.velocityY = knockbackY;
      defender.x += knockbackX * (GAME_CONFIG.TICK_DURATION / 1000);
      defender.y += knockbackY * (GAME_CONFIG.TICK_DURATION / 1000);

      if (defender.combat.health > 0 && !defender.combat.isGrounded && config.groundBounce) {
        defender.velocityY = -400;
        defender.combat.knockbackTimer = PLAYER_CONFIG.KNOCKBACK_DURATION;
      }

      attacker.wasHitDuringAttack = false;
    }
  }
}
