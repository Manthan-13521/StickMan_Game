import { Server, Socket } from 'socket.io';
import { ClientEvent, ServerEvent, GamePhase, validateRoomCode, validatePlayerInput, validateInputRate, MAX_ROOMS } from 'shared';
import type { PlayerInput } from 'shared';
import { GameRoom } from './GameRoom';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  private socketRoomMap = new Map<string, string>();
  private lastInputs = new Map<string, PlayerInput | null>();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  get activePlayers(): number {
    return this.socketRoomMap.size;
  }

  handleConnection(socket: Socket): void {
    socket.on(ClientEvent.CREATE_ROOM, () => this.handleCreateRoom(socket));
    socket.on(ClientEvent.JOIN_ROOM, (code: string) => this.handleJoinRoom(socket, code));
    socket.on(ClientEvent.LEAVE_ROOM, () => this.handleLeaveRoom(socket));
    socket.on(ClientEvent.PLAYER_INPUT, (input: unknown) => this.handlePlayerInput(socket, input));
    socket.on(ClientEvent.REQUEST_REMATCH, () => this.handleRematch(socket));
    socket.on(ClientEvent.PING, () => socket.emit(ServerEvent.PONG, Date.now()));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  private handleCreateRoom(socket: Socket): void {
    if (this.rooms.size >= MAX_ROOMS) {
      socket.emit(ServerEvent.ERROR, { code: 'SERVER_FULL', message: 'Server is full, try again later' });
      return;
    }
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }
    const room = new GameRoom(code, this.io);
    this.rooms.set(code, room);
    socket.join(code);
    this.socketRoomMap.set(socket.id, code);
    room.addPlayer(socket);
    socket.emit(ServerEvent.ROOM_CREATED, { code, playerIndex: 0 });
  }

  private handleJoinRoom(socket: Socket, code: string): void {
    if (!validateRoomCode(code)) {
      socket.emit(ServerEvent.ERROR, { code: 'INVALID_CODE', message: 'Invalid room code' });
      return;
    }
    const room = this.rooms.get(code);
    if (!room) {
      socket.emit(ServerEvent.ERROR, { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }
    if (room.isFull) {
      socket.emit(ServerEvent.ERROR, { code: 'ROOM_FULL', message: 'Room is full' });
      return;
    }
    socket.join(code);
    this.socketRoomMap.set(socket.id, code);
    room.addPlayer(socket);
    socket.emit(ServerEvent.PLAYER_JOINED, { code, playerIndex: 1 });
  }

  private handleLeaveRoom(socket: Socket): void {
    const code = this.socketRoomMap.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (room) {
      room.removePlayer(socket.id);
    }
    socket.leave(code);
    this.socketRoomMap.delete(socket.id);
    this.checkEmptyRoom(code);
  }

  private handlePlayerInput(socket: Socket, input: unknown): void {
    const code = this.socketRoomMap.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    if (!validatePlayerInput(input)) return;
    const lastInput = this.lastInputs.get(socket.id) ?? null;
    if (!validateInputRate(lastInput, input)) return;
    this.lastInputs.set(socket.id, input);
    room.handleInput(socket.id, input);
  }

  private handleRematch(socket: Socket): void {
    const code = this.socketRoomMap.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    room.requestRematch(socket.id);
  }

  private handleDisconnect(socket: Socket): void {
    const code = this.socketRoomMap.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (room) {
      room.handleDisconnect(socket.id);
    }
    this.socketRoomMap.delete(socket.id);
    this.lastInputs.delete(socket.id);
    this.checkEmptyRoom(code);
  }

  private checkEmptyRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room && room.playerCount === 0) {
      room.destroy();
      this.rooms.delete(code);
    }
  }
}
