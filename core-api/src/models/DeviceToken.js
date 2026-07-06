const mongoose = require('mongoose');
const { Schema } = mongoose;

const DeviceTokenSchema = new Schema({
  userId: { type: String, required: true }, // Auth service userId
  token: { type: String, required: true },
  deviceType: { type: String, enum: ['ios', 'android', 'web'], default: 'web' },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('DeviceToken', DeviceTokenSchema);
