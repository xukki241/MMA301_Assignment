import { Document, Schema, model } from 'mongoose';

export interface IRole extends Document {
  roleName: string;
  createdAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    roleName: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default model<IRole>('Role', RoleSchema);
