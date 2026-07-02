import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './rooms/RoomManager';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'] },
  pingInterval: 3000,
  pingTimeout: 10000,
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), players: roomManager.activePlayers });
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
  roomManager.handleConnection(socket);
});

httpServer.listen(PORT, () => {
  console.log(`StickMan Arena server running on port ${PORT}`);
});
