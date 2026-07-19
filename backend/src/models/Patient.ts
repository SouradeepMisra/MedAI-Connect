import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // no two patients can register with the same email
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true, // stored as a bcrypt hash, never plain text
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt fields
  }
);

export const Patient = mongoose.model('Patient', patientSchema);