import { Document, Schema, Types, model } from 'mongoose';

export interface IUserRole extends Document {
  userId: Types.ObjectId;
  roleId: Types.ObjectId;
  createdAt: Date;
}

const UserRoleSchema = new Schema<IUserRole>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

UserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });

export default model<IUserRole>('UserRole', UserRoleSchema);
