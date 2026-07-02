import { io, Socket } from 'socket.io-client';
import { ClientEvent, ServerEvent } from '@/shared';
import type { CreateRoomResponse, JoinRoomResponse } from '@/shared';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

class NetworkClient {
  private socket: Socket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.socket?.disconnect();
    this.socket = null;
  }

  createRoom(): void {
    this.socket?.emit(ClientEvent.CREATE_ROOM);
  }

  joinRoom(code: string): void {
    this.socket?.emit(ClientEvent.JOIN_ROOM, code);
  }

  sendInput(input: {
    sequence: number;
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    punch: boolean;
    kick: boolean;
    block: boolean;
    timestamp: number;
  }): void {
    this.socket?.emit(ClientEvent.PLAYER_INPUT, input);
  }

  requestRematch(): void {
    this.socket?.emit(ClientEvent.REQUEST_REMATCH);
  }

  sendPing(): void {
    this.socket?.emit(ClientEvent.PING);
  }

  onRoomCreated(callback: (data: CreateRoomResponse) => void): void {
    this.socket?.on(ServerEvent.ROOM_CREATED, callback);
  }

  onPlayerJoined(callback: (data: JoinRoomResponse) => void): void {
    this.socket?.on(ServerEvent.PLAYER_JOINED, callback);
  }

  onGameState(callback: (data: any) => void): void {
    this.socket?.on(ServerEvent.GAME_STATE, callback);
  }

  onGameStart(callback: (data: { countdown: number }) => void): void {
    this.socket?.on(ServerEvent.GAME_START, callback);
  }

  onGameOver(callback: (data: any) => void): void {
    this.socket?.on(ServerEvent.GAME_OVER, callback);
  }

  onError(callback: (data: { code: string; message: string }) => void): void {
    this.socket?.on(ServerEvent.ERROR, callback);
  }

  onPong(callback: (data: number) => void): void {
    this.socket?.on(ServerEvent.PONG, callback);
  }

  onDisconnect(callback: (reason: string) => void): void {
    this.socket?.on('disconnect', callback);
  }

  get id(): string | undefined {
    return this.socket?.id;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const networkClient = new NetworkClient();
