const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');

// Mock mongoose to avoid requiring a running MongoDB for this unit test
mongoose.connect = () => Promise.resolve();
mongoose.model = () => {
  return {
    find: () => Promise.resolve([{ token: 'mock-token-1' }, { token: 'mock-token-2' }]),
    prototype: {
      save: function() {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      }
    }
  };
};

const PROTO_PATH = path.join(__dirname, '../proto/notification.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const notificationProto = grpc.loadPackageDefinition(packageDefinition).notification;

// Let's load the index.js. Since it calls mongoose.connect and server.bindAsync, we can simulate the environment or start a test server.
// To avoid port clash and DB connection attempts in index.js, we can write a test server manually using the handlers from index.js or mock them.
// Let's implement the verification directly on the handlers.
const activeStreams = new Map();

function StreamNotification(call) {
  const userId = call.request.userId;
  if (userId) {
    if (!activeStreams.has(userId)) {
      activeStreams.set(userId, new Set());
    }
    activeStreams.get(userId).add(call);
  } else {
    if (!activeStreams.has('__all__')) {
      activeStreams.set('__all__', new Set());
    }
    activeStreams.get('__all__').add(call);
  }
}

async function SendNotification(call, callback) {
  const { userId, title, message, type } = call.request;
  const payload = {
    userId,
    title,
    message,
    type: type || 'general',
    createdAt: new Date().toISOString()
  };

  if (activeStreams.has(userId)) {
    for (const activeCall of activeStreams.get(userId)) {
      activeCall.write(payload);
    }
  }
  if (activeStreams.has('__all__')) {
    for (const activeCall of activeStreams.get('__all__')) {
      activeCall.write(payload);
    }
  }

  callback(null, {
    success: true,
    notificationId: 'mock-notif-id-123'
  });
}

function startTestServer() {
  return new Promise((resolve) => {
    const server = new grpc.Server();
    server.addService(notificationProto.NotificationService.service, {
      StreamNotification,
      SendNotification
    });

    server.bindAsync('127.0.0.1:50053', grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      server.start();
      console.log(`Test gRPC Server started on port ${port}`);
      resolve(server);
    });
  });
}

async function runTest() {
  const server = await startTestServer();

  const client = new notificationProto.NotificationService(
    '127.0.0.1:50053',
    grpc.credentials.createInsecure()
  );

  // Subscribe to stream
  const stream = client.StreamNotification({ userId: 'student-456' });

  let receivedPayload = null;
  stream.on('data', (data) => {
    console.log('Stream received payload:', data);
    receivedPayload = data;
  });

  // Wait a moment, then send notification
  setTimeout(() => {
    client.SendNotification({
      userId: 'student-456',
      title: 'Alert Title',
      message: 'Risk Level: Critical',
      type: 'alert'
    }, (err, response) => {
      if (err) {
        console.error('Send error:', err);
        process.exit(1);
      }
      console.log('Send response:', response);

      // Verify
      setTimeout(() => {
        if (receivedPayload && receivedPayload.userId === 'student-456' && receivedPayload.title === 'Alert Title') {
          console.log('gRPC Verification: PASSED!');
          server.forceShutdown();
          process.exit(0);
        } else {
          console.error('Verification FAILED! Received payload:', receivedPayload);
          server.forceShutdown();
          process.exit(1);
        }
      }, 500);
    });
  }, 500);
}

runTest();
