import { create } from 'zustand';
import { GamePhase } from '@/shared';
import type { GameStateSnapshot, PlayerSnapshot, RoomInfo } from '@/shared';

interface GameStore {
  phase: GamePhase;
  roomCode: string | null;
  playerIndex: number | null;
  gameState: GameStateSnapshot | null;
  player: PlayerSnapshot | null;
  opponent: PlayerSnapshot | null;
  connected: boolean;
  ping: number;
  error: string | null;
  navigateToMenu: boolean;
  setRoomCode: (code: string) => void;
  setPlayerIndex: (index: number) => void;
  setGameState: (state: GameStateSnapshot) => void;
  setConnected: (connected: boolean) => void;
  setPing: (ping: number) => void;
  setError: (error: string | null) => void;
  exitToMenu: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: GamePhase.WAITING,
  roomCode: null,
  playerIndex: null,
  gameState: null,
  player: null,
  opponent: null,
  connected: false,
  ping: 0,
  error: null,
  navigateToMenu: false,

  setRoomCode: (code) => set({ roomCode: code }),

  setPlayerIndex: (index) => set({ playerIndex: index }),

  setGameState: (state) => {
    const { playerIndex } = get();
    set({
      gameState: state,
      player: playerIndex !== null ? state.players[playerIndex] : null,
      opponent: playerIndex !== null ? state.players[1 - playerIndex] : null,
    });
  },

  setConnected: (connected) => set({ connected }),
  setPing: (ping) => set({ ping }),
  setError: (error) => set({ error }),

  exitToMenu: () => set({ navigateToMenu: true }),

  reset: () =>
    set({
      phase: GamePhase.WAITING,
      roomCode: null,
      playerIndex: null,
      gameState: null,
      player: null,
      opponent: null,
      ping: 0,
      error: null,
      navigateToMenu: false,
    }),
}));
