import { Server, Socket } from 'socket.io';
import { ServerEvent, GamePhase, GAME_CONFIG, PLAYER_CONFIG } from 'shared';
import type { PlayerInput, GameStateSnapshot, PlayerSnapshot } from 'shared';
import { PlayerStance, MatchResult } from 'shared';
import { GameEngine } from '../game/GameEngine';

export class GameRoom {
  private io: Server;
  private code: string;
  private players: Map<string, number> = new Map();
  private sockets: Map<string, Socket> = new Map();
  private engine: GameEngine | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private phase: GamePhase = GamePhase.WAITING;
  private rematchRequests = new Set<string>();
  private playerWins: [number, number] = [0, 0];

  constructor(code: string, io: Server) {
    this.code = code;
    this.io = io;
  }

  get isFull(): boolean {
    return this.players.size >= GAME_CONFIG.MAX_PLAYERS;
  }

  get playerCount(): number {
    return this.players.size;
  }

  addPlayer(socket: Socket): void {
    const index = this.players.size;
    this.players.set(socket.id, index);
    this.sockets.set(socket.id, socket);

    if (this.players.size === GAME_CONFIG.MAX_PLAYERS) {
      this.startCountdown();
    }
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);
    this.sockets.delete(socketId);
  }

  handleInput(socketId: string, input: PlayerInput): void {
    if (this.phase !== GamePhase.FIGHTING) return;
    const index = this.players.get(socketId);
    if (index === undefined) return;
    this.engine?.handleInput(index, input);
  }

  requestRematch(socketId: string): void {
    this.rematchRequests.add(socketId);
    if (this.rematchRequests.size >= this.players.size && this.players.size >= 2) {
      this.startRematch();
    }
  }

  handleDisconnect(socketId: string): void {
    this.removePlayer(socketId);
    if (this.engine) {
      this.engine.handleDisconnect(socketId);
    }
    this.broadcastGameState();
  }

  private startCountdown(): void {
    this.phase = GamePhase.COUNTDOWN;
    let count = GAME_CONFIG.COUNTDOWN_SECONDS;
    this.io.to(this.code).emit(ServerEvent.GAME_START, { countdown: count });

    const countInterval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countInterval);
        this.startFight();
        return;
      }
      this.io.to(this.code).emit(ServerEvent.GAME_STATE, {
        phase: GamePhase.COUNTDOWN,
        countdown: count,
        players: [
          this.createEmptySnapshot(0, 'Player 1'),
          this.createEmptySnapshot(1, 'Player 2'),
        ],
        round: 1,
        maxRounds: GAME_CONFIG.ROUNDS_TO_WIN,
        winner: null,
        result: null,
        tick: 0,
        timestamp: Date.now(),
      });
    }, 1000);
  }

  private startFight(): void {
    this.phase = GamePhase.FIGHTING;
    this.engine = new GameEngine(this.playerWins);

    this.tickInterval = setInterval(() => {
      if (!this.engine) return;
      this.engine.tick();
      const state = this.engine.getState();
      this.broadcastGameState(state);

      if (state.phase === GamePhase.KO || state.phase === GamePhase.FINISHED) {
        this.handleRoundEnd(state);
      }
    }, GAME_CONFIG.TICK_DURATION);
  }

  private handleRoundEnd(state: GameStateSnapshot): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    if (state.result === MatchResult.PLAYER1_WIN) {
      this.playerWins[0]++;
    } else if (state.result === MatchResult.PLAYER2_WIN) {
      this.playerWins[1]++;
    }

    this.io.to(this.code).emit(ServerEvent.GAME_OVER, {
      winner: state.winner,
      result: state.result,
      scores: this.playerWins,
    });

    if (this.playerWins[0] >= GAME_CONFIG.ROUNDS_TO_WIN || this.playerWins[1] >= GAME_CONFIG.ROUNDS_TO_WIN) {
      this.phase = GamePhase.FINISHED;
    } else {
      this.phase = GamePhase.KO;
      setTimeout(() => {
        this.rematchRequests.clear();
        this.startCountdown();
      }, GAME_CONFIG.KO_DELAY);
    }
  }

  private startRematch(): void {
    this.rematchRequests.clear();
    this.playerWins = [0, 0];
    this.engine = null;
    this.startCountdown();
  }

  private createEmptySnapshot(index: number, name: string): PlayerSnapshot {
    return {
      id: index === 0 ? 'p1' : 'p2',
      x: index === 0 ? 200 : PLAYER_CONFIG.STAGE_RIGHT - 200,
      y: PLAYER_CONFIG.STAGE_GROUND - PLAYER_CONFIG.HEIGHT,
      velocityX: 0,
      velocityY: 0,
      facingRight: index === 0,
      stance: PlayerStance.IDLE,
      health: PLAYER_CONFIG.MAX_HEALTH,
      maxHealth: PLAYER_CONFIG.MAX_HEALTH,
      combo: 0,
      ultimate: 0,
      wins: this.playerWins[index],
    };
  }

  private broadcastGameState(state?: GameStateSnapshot): void {
    if (!state) {
      const snapshot: GameStateSnapshot = {
        phase: this.phase,
        countdown: 0,
        players: [
          this.createEmptySnapshot(0, 'Player 1'),
          this.createEmptySnapshot(1, 'Player 2'),
        ],
        round: 1,
        maxRounds: GAME_CONFIG.ROUNDS_TO_WIN,
        winner: null,
        result: null,
        tick: 0,
        timestamp: Date.now(),
      };
      this.io.to(this.code).emit(ServerEvent.GAME_STATE, snapshot);
      return;
    }
    this.io.to(this.code).emit(ServerEvent.GAME_STATE, state);
  }

  destroy(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    this.players.clear();
    this.sockets.clear();
    this.engine = null;
  }
}
