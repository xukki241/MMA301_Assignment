import { Document, Schema, model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  fullName: string;
  avatarURL?: string | null;
  cognitoSub?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    fullName: { type: String, required: true, trim: true },
    avatarURL: { type: String, default: null },
    cognitoSub: { type: String, unique: true, sparse: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model<IUser>('User', UserSchema);
