export enum PlayerStance {
  IDLE = 'idle',
  WALKING = 'walking',
  RUNNING = 'running',
  JUMPING = 'jumping',
  FALLING = 'falling',
  PUNCHING = 'punching',
  KICKING = 'kicking',
  BLOCKING = 'blocking',
  HIT = 'hit',
  KNOCKED_DOWN = 'knocked_down',
  GETTING_UP = 'getting_up',
  DEAD = 'dead',
}

export enum GamePhase {
  WAITING = 'waiting',
  COUNTDOWN = 'countdown',
  FIGHTING = 'fighting',
  KO = 'ko',
  FINISHED = 'finished',
}

export enum MatchResult {
  PLAYER1_WIN = 'player1_win',
  PLAYER2_WIN = 'player2_win',
  DRAW = 'draw',
  DISCONNECTED = 'disconnected',
}

export interface PlayerInput {
  sequence: number;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
  block: boolean;
  timestamp: number;
}

export interface PlayerSnapshot {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  facingRight: boolean;
  stance: PlayerStance;
  health: number;
  maxHealth: number;
  combo: number;
  ultimate: number;
  wins: number;
}

export interface GameStateSnapshot {
  phase: GamePhase;
  countdown: number;
  players: [PlayerSnapshot, PlayerSnapshot];
  round: number;
  maxRounds: number;
  winner: string | null;
  result: MatchResult | null;
  tick: number;
  timestamp: number;
}

export interface RoomInfo {
  code: string;
  playerCount: number;
  maxPlayers: number;
  state: GamePhase;
}

export interface CreateRoomResponse {
  code: string;
  playerId: string;
  playerIndex: number;
}

export interface JoinRoomResponse {
  code: string;
  playerId: string;
  playerIndex: number;
}

export interface ErrorResponse {
  code: string;
  message: string;
}
