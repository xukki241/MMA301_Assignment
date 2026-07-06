const mongoose = require('mongoose');
const { Schema } = mongoose;

const SystemLogSchema = new Schema({
  serviceName: { type: String, default: 'core-api' },
  level: { type: String, enum: ['info', 'warn', 'error', 'debug'], default: 'info' },
  message: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('SystemLog', SystemLogSchema);
