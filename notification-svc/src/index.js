const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms-core-db';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Notification Service connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schemas/Models
const DeviceTokenSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  token: { type: String, required: true },
  deviceType: { type: String, enum: ['ios', 'android', 'web'], default: 'web' },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'devicetokens' });

const DeviceToken = mongoose.model('DeviceToken', DeviceTokenSchema);

const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  type: { type: String, default: 'general' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'notifications' });

const Notification = mongoose.model('Notification', NotificationSchema);

// Load Proto
const PROTO_PATH = path.join(__dirname, '../../proto/notification.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const notificationProto = grpc.loadPackageDefinition(packageDefinition).notification;

// Active Streams Store
// Maps userId -> Set of gRPC call stream objects
const activeStreams = new Map();

function StreamNotification(call) {
  const userId = call.request.userId;
  console.log(`Client subscribed to StreamNotification. Filter userId: ${userId || 'ALL'}`);

  if (userId) {
    if (!activeStreams.has(userId)) {
      activeStreams.set(userId, new Set());
    }
    activeStreams.get(userId).add(call);
  } else {
    // Wildcard subscriber
    if (!activeStreams.has('__all__')) {
      activeStreams.set('__all__', new Set());
    }
    activeStreams.get('__all__').add(call);
  }

  // Handle client disconnection
  call.on('cancelled', () => {
    console.log(`StreamNotification connection cancelled for userId: ${userId || 'ALL'}`);
    removeStream(userId, call);
  });

  call.on('close', () => {
    console.log(`StreamNotification connection closed for userId: ${userId || 'ALL'}`);
    removeStream(userId, call);
  });

  call.on('error', (err) => {
    console.error(`StreamNotification connection error for userId: ${userId || 'ALL'}:`, err);
    removeStream(userId, call);
  });
}

function removeStream(userId, call) {
  if (userId && activeStreams.has(userId)) {
    activeStreams.get(userId).delete(call);
    if (activeStreams.get(userId).size === 0) {
      activeStreams.delete(userId);
    }
  }
  if (activeStreams.has('__all__')) {
    activeStreams.get('__all__').delete(call);
    if (activeStreams.get('__all__').size === 0) {
      activeStreams.delete('__all__');
    }
  }
}

async function SendNotification(call, callback) {
  try {
    const { userId, title, message, type } = call.request;
    const createdAtStr = call.request.createdAt || new Date().toISOString();

    if (!userId || !title || !message) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Missing required fields: userId, title, message'
      });
    }

    // 1. Save notification to MongoDB
    const notification = new Notification({
      userId,
      title,
      content: message,
      type: type || 'general',
      createdAt: new Date(createdAtStr)
    });
    await notification.save();

    // 2. Fetch device tokens for the user
    const tokensDoc = await DeviceToken.find({ userId });
    const tokens = tokensDoc.map(t => t.token);

    const payload = {
      userId,
      title,
      message,
      type: type || 'general',
      createdAt: createdAtStr
    };

    // 3. Dispatch to active streams
    let streamCount = 0;
    // Direct matches
    if (activeStreams.has(userId)) {
      for (const activeCall of activeStreams.get(userId)) {
        activeCall.write(payload);
        streamCount++;
      }
    }
    // Wildcard matches
    if (activeStreams.has('__all__')) {
      for (const activeCall of activeStreams.get('__all__')) {
        activeCall.write(payload);
        streamCount++;
      }
    }

    // 4. Mock FCM dispatch log
    console.log(`[FCM Mock Dispatch] User: ${userId} | Tokens: [${tokens.join(', ')}] | Title: "${title}" | Message: "${message}" | Streamed to ${streamCount} client(s)`);

    callback(null, {
      success: true,
      notificationId: notification._id.toString()
    });

  } catch (error) {
    console.error('Error in SendNotification:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

function main() {
  const server = new grpc.Server();
  server.addService(notificationProto.NotificationService.service, {
    StreamNotification,
    SendNotification
  });

  const PORT = process.env.PORT || '50052';
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('gRPC Server failed to bind:', err);
      process.exit(1);
    }
    console.log(`gRPC Notification Service running on port ${port}`);
    server.start();
  });
}

main();
