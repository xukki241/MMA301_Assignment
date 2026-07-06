import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

let io: Server | null = null;

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('joinClass', (classId: string) => {
      if (classId) {
        socket.join(`class:${classId}`);
        console.log(`Socket ${socket.id} joined room class:${classId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  if (process.env.NODE_ENV !== 'test') {
    const redisUrl = process.env.REDIS_URI || 'redis://redis:6379';
    console.log(`Connecting Socket.IO to Redis at ${redisUrl}`);

    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.error('Redis pubClient error:', err));
    subClient.on('error', (err) => console.error('Redis subClient error:', err));

    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io!.adapter(createAdapter(pubClient as any, subClient as any));
        console.log('Socket.IO Redis adapter configured successfully');
      })
      .catch((err) => {
        console.error('Failed to configure Socket.IO Redis adapter:', err);
      });
  }

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function broadcastToClass(classId: string, eventName: string, data: any): void {
  if (io) {
    const room = `class:${classId}`;
    io.to(room).emit(eventName, data);
    console.log(`Broadcasted event ${eventName} to room ${room}`);
  } else {
    console.warn(`Socket.IO not initialized. Cannot broadcast event ${eventName} to class ${classId}`);
  }
}
