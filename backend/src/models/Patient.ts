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
    // Set together when a password-reset email is requested, cleared together
    // once the reset is used. Only the sha256 hash of the reset token is
    // stored, never the raw token itself — same never-store-the-secret
    // philosophy as the bcrypt password hash above.
    passwordResetTokenHash: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt fields
  }
);

export const Patient = mongoose.model('Patient', patientSchema);