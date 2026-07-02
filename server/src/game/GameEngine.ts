import { PLAYER_CONFIG, GAME_CONFIG } from 'shared';
import type { PlayerInput, GameStateSnapshot, PlayerSnapshot } from 'shared';
import { PlayerStance, GamePhase, MatchResult } from 'shared';
import { ServerPlayer } from './Player';
import { CombatSystem } from './CombatSystem';
import { PhysicsEngine } from './PhysicsEngine';

export class GameEngine {
  private players: [ServerPlayer, ServerPlayer] | null = null;
  private physics: PhysicsEngine;
  private combat: CombatSystem;
  private round: number = 1;
  private tickCount: number = 0;
  private state: GamePhase = GamePhase.FIGHTING;
  private winner: string | null = null;
  private result: MatchResult | null = null;
  private roundStartDelay: number = 0;
  private disconnectedId: string | null = null;

  constructor(playerWins: [number, number]) {
    this.physics = new PhysicsEngine();
    this.combat = new CombatSystem();
    this.players = [
      new ServerPlayer('p1', 0, PLAYER_CONFIG.STAGE_LEFT + 200, PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT, playerWins[0]),
      new ServerPlayer('p2', 1, PLAYER_CONFIG.STAGE_RIGHT - 200, PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT, playerWins[1]),
    ];
    this.players[0].facingRight = true;
    this.players[1].facingRight = false;
  }

  handleInput(playerIndex: number, input: PlayerInput): void {
    if (!this.players) return;
    this.players[playerIndex].setInput(input);
  }

  handleDisconnect(socketId: string): void {
    this.disconnectedId = socketId;
  }

  tick(): void {
    if (!this.players || this.state !== GamePhase.FIGHTING) return;

    this.tickCount++;

    for (const player of this.players) {
      player.update();
    }

    this.physics.update(this.players);
    this.combat.checkCollisions(this.players);

    for (const player of this.players) {
      player.postUpdate();
    }

    if (this.disconnectedId) {
      const idx = this.players.findIndex(p => p.id === this.disconnectedId);
      if (idx !== -1) {
        this.state = GamePhase.KO;
        this.winner = this.players[idx === 0 ? 1 : 0].id;
        this.result = MatchResult.DISCONNECTED;
      }
      this.disconnectedId = null;
      return;
    }

    for (const player of this.players) {
      if (player.health <= 0) {
        this.state = GamePhase.KO;
        this.winner = this.players.find(p => p.health > 0)?.id || 'draw';
        const winnerIndex = this.players.findIndex(p => p.id === this.winner);
        this.result = winnerIndex === 0 ? MatchResult.PLAYER1_WIN : winnerIndex === 1 ? MatchResult.PLAYER2_WIN : MatchResult.DRAW;
        break;
      }
    }
  }

  getState(): GameStateSnapshot {
    if (!this.players) {
      return this.createEmptyState();
    }

    return {
      phase: this.state,
      countdown: 0,
      players: [
        {
          id: this.players[0].id,
          x: this.players[0].x,
          y: this.players[0].y,
          velocityX: this.players[0].velocityX,
          velocityY: this.players[0].velocityY,
          facingRight: this.players[0].facingRight,
          stance: this.players[0].stance,
          health: this.players[0].health,
          maxHealth: PLAYER_CONFIG.MAX_HEALTH,
          combo: this.players[0].combo,
          ultimate: this.players[0].ultimate,
          wins: this.players[0].wins,
        },
        {
          id: this.players[1].id,
          x: this.players[1].x,
          y: this.players[1].y,
          velocityX: this.players[1].velocityX,
          velocityY: this.players[1].velocityY,
          facingRight: this.players[1].facingRight,
          stance: this.players[1].stance,
          health: this.players[1].health,
          maxHealth: PLAYER_CONFIG.MAX_HEALTH,
          combo: this.players[1].combo,
          ultimate: this.players[1].ultimate,
          wins: this.players[1].wins,
        },
      ],
      round: this.round,
      maxRounds: GAME_CONFIG.ROUNDS_TO_WIN,
      winner: this.winner,
      result: this.result,
      tick: this.tickCount,
      timestamp: Date.now(),
    };
  }

  private createEmptyState(): GameStateSnapshot {
    const { STAGE_LEFT, STAGE_RIGHT, STAGE_GROUND, HEIGHT, MAX_HEALTH } = PLAYER_CONFIG;
    return {
      phase: GamePhase.WAITING,
      countdown: 0,
      players: [
        { id: 'p1', x: STAGE_LEFT + 200, y: STAGE_GROUND - HEIGHT, velocityX: 0, velocityY: 0, facingRight: true, stance: PlayerStance.IDLE, health: MAX_HEALTH, maxHealth: MAX_HEALTH, combo: 0, ultimate: 0, wins: 0 },
        { id: 'p2', x: STAGE_RIGHT - 200, y: STAGE_GROUND - HEIGHT, velocityX: 0, velocityY: 0, facingRight: false, stance: PlayerStance.IDLE, health: MAX_HEALTH, maxHealth: MAX_HEALTH, combo: 0, ultimate: 0, wins: 0 },
      ],
      round: 1,
      maxRounds: GAME_CONFIG.ROUNDS_TO_WIN,
      winner: null,
      result: null,
      tick: 0,
      timestamp: Date.now(),
    };
  }
}
