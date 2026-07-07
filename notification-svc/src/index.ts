import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import mongoose, { Schema, model } from 'mongoose';

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms-db';
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Notification Service connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Schemas
const DeviceTokenSchema = new Schema(
  {
    userId: { type: String, required: true },
    token: { type: String, required: true },
    deviceType: { type: String, enum: ['ios', 'android', 'web'], default: 'web' },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'devicetokens' }
);
const DeviceToken = model('DeviceToken', DeviceTokenSchema);

const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    type: { type: String, default: 'general' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'notifications' }
);
const Notification = model('Notification', NotificationSchema);

// Load Proto
const PROTO_PATH = path.join(__dirname, '../../proto/notification.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const notificationProto: any = grpc.loadPackageDefinition(packageDefinition).notification;

// Active Streams Store - maps userId -> Set of gRPC call stream objects
const activeStreams = new Map<string, Set<any>>();

function StreamNotification(call: any): void {
  const userId: string = call.request.userId;
  console.log(`Client subscribed to StreamNotification. Filter userId: ${userId || 'ALL'}`);

  if (!activeStreams.has(userId)) {
    activeStreams.set(userId, new Set());
  }
  activeStreams.get(userId)!.add(call);

  call.on('cancelled', () => {
    console.log(`Client stream cancelled for userId: ${userId}`);
    activeStreams.get(userId)?.delete(call);
    if (activeStreams.get(userId)?.size === 0) {
      activeStreams.delete(userId);
    }
  });

  call.on('error', (err: any) => {
    console.error(`Stream error for userId ${userId}:`, err);
    activeStreams.get(userId)?.delete(call);
  });
}

function SendNotification(call: any, callback: any): void {
  const { userId, title, message, type } = call.request;

  if (!userId || !title) {
    return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'userId and title are required' });
  }

  const notification = new Notification({
    userId,
    title,
    content: message || '',
    type: type || 'general',
  });

  notification
    .save()
    .then(() => {
      // Stream to active listeners
      const payload = {
        notificationId: notification._id.toString(),
        userId,
        title,
        message: message || '',
        type: type || 'general',
        createdAt: new Date().toISOString(),
      };

      const streamTargets: Set<any>[] = [];
      if (activeStreams.has(userId)) streamTargets.push(activeStreams.get(userId)!);
      if (activeStreams.has('')) streamTargets.push(activeStreams.get('')!);

      for (const streams of streamTargets) {
        for (const stream of streams) {
          try {
            stream.write(payload);
          } catch (e) {
            streams.delete(stream);
          }
        }
      }

      console.log(`Notification sent to userId ${userId}: ${title}`);
      callback(null, { success: true, notificationId: notification._id.toString() });
    })
    .catch((err: any) => {
      console.error('Save notification error:', err);
      callback({ code: grpc.status.INTERNAL, message: err.message });
    });
}

// Start gRPC Server
const server = new grpc.Server();
server.addService(notificationProto.NotificationService.service, {
  StreamNotification,
  SendNotification,
});

const GRPC_PORT = process.env.GRPC_PORT || '50052';
server.bindAsync(
  `0.0.0.0:${GRPC_PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (err: Error | null, port: number) => {
    if (err) {
      console.error(`gRPC notification server bind failed: ${err.message}`);
      return;
    }
    console.log(`Notification gRPC server listening on port ${port}`);
  }
);
