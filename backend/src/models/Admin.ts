import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true, // stored as a bcrypt hash
    },
  },
  {
    timestamps: true,
  }
);

export const Admin = mongoose.model('Admin', adminSchema);