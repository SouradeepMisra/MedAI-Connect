import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    date: {
      type: Date, // normalized to UTC midnight for the calendar day
      required: true,
    },
    time: {
      type: String, // "HH:mm", 24-hour
      required: true,
    },
    // Copied from DoctorAvailability at creation time — later availability
    // edits don't retroactively change slots that already exist.
    maxPatients: {
      type: Number,
      required: true,
    },
    bookedCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Only ever materialized once per doctor+date+time — this uniqueness is what
// makes the "ensure slot exists" upsert safe under concurrent requests.
slotSchema.index({ doctor: 1, date: 1, time: 1 }, { unique: true });

export const Slot = mongoose.model('Slot', slotSchema);
