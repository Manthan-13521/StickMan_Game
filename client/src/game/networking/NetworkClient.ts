import { io, Socket } from 'socket.io-client';
import { ClientEvent, ServerEvent } from '@/shared';
import type { PlayerInput, GameStateSnapshot, CreateRoomResponse, JoinRoomResponse, ErrorResponse } from '@/shared';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

class NetworkClient {
  private socket: Socket | null = null;
  private sequence = 0;
  private _connected = false;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SERVER_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this._connected = true;
      this.emit('_connected', true);
    });

    this.socket.on('disconnect', () => {
      this._connected = false;
      this.emit('_disconnected', false);
    });

    this.socket.on(ServerEvent.ROOM_CREATED, (data: CreateRoomResponse) => {
      this.emit(ServerEvent.ROOM_CREATED, data);
    });

    this.socket.on(ServerEvent.PLAYER_JOINED, (data: JoinRoomResponse) => {
      this.emit(ServerEvent.PLAYER_JOINED, data);
    });

    this.socket.on(ServerEvent.GAME_STATE, (data: GameStateSnapshot) => {
      this.emit(ServerEvent.GAME_STATE, data);
    });

    this.socket.on(ServerEvent.GAME_START, (data: { countdown: number }) => {
      this.emit(ServerEvent.GAME_START, data);
    });

    this.socket.on(ServerEvent.GAME_OVER, (data: any) => {
      this.emit(ServerEvent.GAME_OVER, data);
    });

    this.socket.on(ServerEvent.ERROR, (data: ErrorResponse) => {
      this.emit(ServerEvent.ERROR, data);
    });

    this.socket.on(ServerEvent.PONG, (data: number) => {
      this.emit(ServerEvent.PONG, data);
    });

    return this.socket;
  }

  disconnect(): void {
    this.listeners.clear();
    this.socket?.disconnect();
    this.socket = null;
    this._connected = false;
  }

  createRoom(): void {
    this.socket?.emit(ClientEvent.CREATE_ROOM);
  }

  joinRoom(code: string): void {
    this.socket?.emit(ClientEvent.JOIN_ROOM, code);
  }

  sendInput(input: Omit<PlayerInput, 'sequence' | 'timestamp'>, seq?: number): number {
    if (seq === undefined) {
      this.sequence++;
      seq = this.sequence;
    }
    const packet: PlayerInput = {
      sequence: seq,
      left: input.left,
      right: input.right,
      up: input.up,
      down: input.down,
      punch: input.punch,
      kick: input.kick,
      block: input.block,
      timestamp: Date.now(),
    };
    this.socket?.emit(ClientEvent.PLAYER_INPUT, packet);
    return seq;
  }

  requestRematch(): void {
    this.socket?.emit(ClientEvent.REQUEST_REMATCH);
  }

  sendPing(): void {
    this.socket?.emit(ClientEvent.PING);
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }

  get id(): string | undefined {
    return this.socket?.id;
  }

  get connected(): boolean {
    return this._connected;
  }
}

export const networkClient = new NetworkClient();
