import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioc, type Socket } from 'socket.io-client';
import { ClientEvent, ServerEvent } from 'shared';
import { RoomManager } from '../src/rooms/RoomManager';

const PORT = 3099;

function createServerPair(): Promise<{ serverSocket: Server; httpServer: ReturnType<typeof createServer> }> {
  return new Promise((resolve) => {
    const app = express();
    const httpServer = createServer(app);
    const serverSocket = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });
    httpServer.listen(PORT, () => {
      resolve({ serverSocket, httpServer });
    });
  });
}

describe('RoomManager (real socket flow)', () => {
  let serverSocket: Server;
  let httpServer: ReturnType<typeof createServer>;
  let roomManager: RoomManager;
  let c1: Socket;
  let c2: Socket;

  beforeAll(async () => {
    const pair = await createServerPair();
    serverSocket = pair.serverSocket;
    httpServer = pair.httpServer;
    roomManager = new RoomManager(serverSocket);
    serverSocket.on('connection', (socket) => {
      roomManager.handleConnection(socket);
    });
  });

  afterAll(() => {
    c1?.close();
    c2?.close();
    httpServer.close();
  });

  it('client connects to server', async () => {
    c1 = ioc(`http://localhost:${PORT}`, { transports: ['polling', 'websocket'] });
    await new Promise<void>((resolve) => {
      c1.on('connect', () => {
        expect(c1.connected).toBe(true);
        resolve();
      });
    });
  });

  it('creates a room and receives code', async () => {
    return new Promise<void>((resolve) => {
      c1.emit(ClientEvent.CREATE_ROOM);
      c1.on(ServerEvent.ROOM_CREATED, (data) => {
        expect(data.code).toBeDefined();
        expect(typeof data.code).toBe('string');
        expect(data.code.length).toBe(6);
        expect(data.playerIndex).toBe(0);
        resolve();
      });
    });
  });

  it('second client joins room', async () => {
    c2 = ioc(`http://localhost:${PORT}`, { transports: ['polling', 'websocket'] });
    await new Promise<void>((resolve) => {
      c2.on('connect', async () => {
        const code = await new Promise<string>((res) => {
          c1.emit(ClientEvent.CREATE_ROOM);
          c1.on(ServerEvent.ROOM_CREATED, (data) => res(data.code));
        });

        c2.emit(ClientEvent.JOIN_ROOM, code);
        c2.on(ServerEvent.PLAYER_JOINED, (data) => {
          expect(data.code).toBe(code);
          expect(data.playerIndex).toBe(1);
          resolve();
        });
      });
    });
  }, 10000);

  it('starts countdown when room is full', async () => {
    return new Promise<void>((resolve) => {
      c1.emit(ClientEvent.CREATE_ROOM);
      c1.on(ServerEvent.ROOM_CREATED, async (data) => {
        const tempC = ioc(`http://localhost:${PORT}`, { transports: ['polling', 'websocket'] });
        await new Promise<void>((r) => tempC.on('connect', () => r()));
        tempC.emit(ClientEvent.JOIN_ROOM, data.code);
        tempC.on(ServerEvent.GAME_START, (startData) => {
          expect(startData.countdown).toBeDefined();
          tempC.close();
          resolve();
        });
      });
    });
  }, 10000);
});
