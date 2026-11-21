import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

export function initializeWebSocket(httpServer: HttpServer, frontendUrl: string): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: frontendUrl || '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // console.log(`[WebSocket] Client connected: ${socket.id}`);

    socket.on('join_room', (room: string) => {
      socket.join(room);
      // console.log(`[WebSocket] Client ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      // console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet.');
  }
  return io;
}

export function emitToClients(event: string, data: any, room?: string) {
  if (!io) return;
  if (room) {
    io.to(room).emit(event, data);
  } else {
    io.emit(event, data);
  }
}
