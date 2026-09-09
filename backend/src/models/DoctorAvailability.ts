import mongoose from 'mongoose';

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      unique: true, // one recurring template per doctor
    },
    weeklySchedule: [
      {
        dayOfWeek: {
          type: Number, // 0 = Sunday ... 6 = Saturday
          required: true,
          min: 0,
          max: 6,
        },
        startTime: {
          type: String, // "HH:mm", 24-hour
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
      },
    ],
    slotDurationMinutes: {
      type: Number,
      default: 15,
      min: 1, // a non-positive value would make slot generation loop forever
    },
    maxPatientsPerSlot: {
      type: Number,
      default: 1,
      min: 1,
    },
    blockedDates: [Date], // doctor-blocked holidays
  },
  {
    timestamps: true,
  }
);

export const DoctorAvailability = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);
