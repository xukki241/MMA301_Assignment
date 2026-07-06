const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Default connection handling
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room event
    socket.on('joinClass', (classId) => {
      if (classId) {
        socket.join(`class:${classId}`);
        console.log(`Socket ${socket.id} joined room class:${classId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  // Configure Redis adapter if not running tests
  if (process.env.NODE_ENV !== 'test') {
    const redisUrl = process.env.REDIS_URI || 'redis://redis:6379';
    console.log(`Connecting Socket.IO to Redis at ${redisUrl}`);
    
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.error('Redis pubClient error:', err));
    subClient.on('error', (err) => console.error('Redis subClient error:', err));

    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log('Socket.IO Redis adapter configured successfully');
      })
      .catch((err) => {
        console.error('Failed to configure Socket.IO Redis adapter:', err);
      });
  }

  return io;
}

function getIO() {
  return io;
}

function broadcastToClass(classId, eventName, data) {
  if (io) {
    const room = `class:${classId}`;
    io.to(room).emit(eventName, data);
    console.log(`Broadcasted event ${eventName} to room ${room}`);
  } else {
    console.warn(`Socket.IO not initialized. Cannot broadcast event ${eventName} to class ${classId}`);
  }
}

module.exports = {
  initSocket,
  getIO,
  broadcastToClass
};
