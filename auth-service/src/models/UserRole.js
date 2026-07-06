const mongoose = require('mongoose');

const UserRoleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Ensure uniqueness of User-Role assignments
UserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });

module.exports = mongoose.model('UserRole', UserRoleSchema);
