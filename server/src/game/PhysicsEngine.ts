import { PLAYER_CONFIG, COMBAT_CONFIG, GAME_CONFIG } from 'shared';
import { ServerPlayer } from './Player';

export class PhysicsEngine {
  update(players: [ServerPlayer, ServerPlayer]): void {
    const dt = GAME_CONFIG.TICK_DURATION / 1000;

    for (const player of players) {
      if (player.combat.health <= 0) continue;

      if (!player.combat.isGrounded) {
        let gravityMult = 1;
        if (player.knockbackTimer > 0) {
          gravityMult = COMBAT_CONFIG.JUGGLE_GRAVITY_MULTIPLIER;
        }
        player.velocityY += PLAYER_CONFIG.GRAVITY * gravityMult * dt;
      }

      player.x += player.velocityX * dt;
      player.y += player.velocityY * dt;

      this.applyBounds(player);
      this.checkGround(player);

      if (player.knockbackTimer > 0) {
        player.knockbackTimer = Math.max(0, player.knockbackTimer - 20);
      }
    }

    this.pushApart(players);
  }

  private applyBounds(player: ServerPlayer): void {
    if (player.x < PLAYER_CONFIG.STAGE_LEFT) {
      player.x = PLAYER_CONFIG.STAGE_LEFT;
      player.velocityX = 0;
    }
    if (player.x + PLAYER_CONFIG.WIDTH > PLAYER_CONFIG.STAGE_RIGHT) {
      player.x = PLAYER_CONFIG.STAGE_RIGHT - PLAYER_CONFIG.WIDTH;
      player.velocityX = 0;
    }
    if (player.y < PLAYER_CONFIG.STAGE_CEILING) {
      player.y = PLAYER_CONFIG.STAGE_CEILING;
      player.velocityY = 0;
    }
    if (player.y + PLAYER_CONFIG.HEIGHT > PLAYER_CONFIG.STAGE_GROUND) {
      player.y = PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT;
      player.velocityY = 0;
      player.combat.isGrounded = true;
    }
  }

  private checkGround(player: ServerPlayer): void {
    if (player.y + PLAYER_CONFIG.HEIGHT >= PLAYER_CONFIG.STAGE_GROUND) {
      player.y = PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT;
      player.velocityY = 0;
      player.combat.isGrounded = true;
    } else {
      player.combat.isGrounded = false;
    }
  }

  private pushApart(players: [ServerPlayer, ServerPlayer]): void {
    const p1 = players[0];
    const p2 = players[1];

    const p1Right = p1.x + PLAYER_CONFIG.WIDTH;
    const p2Right = p2.x + PLAYER_CONFIG.WIDTH;

    if (p1.x < p2Right && p1Right > p2.x) {
      const overlap = Math.min(p1Right - p2.x, p2Right - p1.x) / 2;
      p1.x -= overlap;
      p2.x += overlap;
    }
  }
}
