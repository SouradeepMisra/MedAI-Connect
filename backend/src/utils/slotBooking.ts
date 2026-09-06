import { Slot } from '../models/Slot';

// Materializes a Slot document for a doctor+date+time the first time it's
// touched (viewed or booked), rather than pre-creating every possible slot
// for a month up front. Safe under concurrent requests: the unique index on
// (doctor, date, time) means at most one of two racing upserts can insert —
// the loser hits a duplicate-key error, which we treat as "someone else just
// created it," and simply re-fetch.
export async function ensureSlot(
  doctorId: string,
  date: Date,
  time: string,
  maxPatients: number
): Promise<InstanceType<typeof Slot>> {
  try {
    return await Slot.findOneAndUpdate(
      { doctor: doctorId, date, time },
      { $setOnInsert: { doctor: doctorId, date, time, maxPatients, bookedCount: 0 } },
      { upsert: true, new: true }
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await Slot.findOne({ doctor: doctorId, date, time });
      if (existing) return existing;
    }
    throw error;
  }
}

// The actual atomic booking step — a pure conditional increment. By the time
// this runs, ensureSlot has already guaranteed the document exists, so this
// has no upsert race in it at all: either it atomically claims a seat, or it
// returns null because the slot was already full.
export async function claimSlot(
  slotId: string,
  maxPatients: number
): Promise<InstanceType<typeof Slot> | null> {
  return Slot.findOneAndUpdate(
    { _id: slotId, bookedCount: { $lt: maxPatients } },
    { $inc: { bookedCount: 1 } },
    { new: true }
  );
}
