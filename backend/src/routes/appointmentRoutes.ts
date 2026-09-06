import { Router } from 'express';
import { Doctor } from '../models/Doctor';
import { DoctorAvailability } from '../models/DoctorAvailability';
import { Slot } from '../models/Slot';
import { Appointment } from '../models/Appointment';
import { verifyToken, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware';
import { getCandidateTimes } from '../utils/slotGenerator';
import { ensureSlot, claimSlot } from '../utils/slotBooking';

const router = Router();

const BOOKING_WINDOW_DAYS = 30;

// Normalizes an incoming date string to UTC midnight so it can be compared
// and stored consistently, regardless of what time-of-day was in the string.
function normalizeDate(dateInput: string): Date | null {
  if (!dateInput || isNaN(Date.parse(dateInput))) return null;
  const normalized = new Date(dateInput);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

function isWithinBookingWindow(date: Date): boolean {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setUTCDate(maxDate.getUTCDate() + BOOKING_WINDOW_DAYS);

  return date >= today && date <= maxDate;
}

type BookableResult =
  | { ok: false; status: number; error: string }
  | {
      ok: true;
      doctor: InstanceType<typeof Doctor>;
      availability: InstanceType<typeof DoctorAvailability> | null;
      candidateTimes: string[];
    };

// Looks up whether a doctor is currently bookable, and if so, the candidate
// times for the requested date per their availability template. Shared by
// both the slots-listing and booking routes so they can never disagree.
async function getBookableCandidateTimes(doctorId: string, date: Date): Promise<BookableResult> {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor || doctor.verificationStatus !== 'Approved' || !doctor.isActivated) {
    return { ok: false, status: 404, error: 'Doctor not found or not currently accepting bookings' };
  }

  const availability = await DoctorAvailability.findOne({ doctor: doctorId });
  if (!availability) {
    return { ok: true, doctor, availability: null, candidateTimes: [] };
  }

  const isBlocked = availability.blockedDates.some(
    (blocked: any) => new Date(blocked).getTime() === date.getTime()
  );
  if (isBlocked) {
    return { ok: true, doctor, availability, candidateTimes: [] };
  }

  const dayOfWeek = date.getUTCDay();
  const scheduleEntry = availability.weeklySchedule.find(
    (entry: any) => entry.dayOfWeek === dayOfWeek
  );
  if (!scheduleEntry) {
    return { ok: true, doctor, availability, candidateTimes: [] };
  }

  const candidateTimes = getCandidateTimes(
    scheduleEntry.startTime,
    scheduleEntry.endTime,
    availability.slotDurationMinutes
  );

  return { ok: true, doctor, availability, candidateTimes };
}

// Public — patients (or anyone) browsing a doctor's open slots for one day.
router.get('/slots', async (req, res) => {
  try {
    const { doctorId, date: dateQuery } = req.query;

    if (!doctorId || typeof doctorId !== 'string') {
      return res.status(400).json({ error: 'doctorId is required' });
    }

    const date = normalizeDate(dateQuery as string);
    if (!date) {
      return res.status(400).json({ error: 'A valid date is required' });
    }

    if (!isWithinBookingWindow(date)) {
      return res.status(400).json({ error: `Slots are only viewable up to ${BOOKING_WINDOW_DAYS} days ahead` });
    }

    const result = await getBookableCandidateTimes(doctorId, date);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    const { candidateTimes } = result;

    const existingSlots = await Slot.find({ doctor: doctorId, date, time: { $in: candidateTimes } });
    const existingByTime = new Map(existingSlots.map((slot) => [slot.time, slot]));

    const slots = candidateTimes.map((time) => {
      const existing = existingByTime.get(time);
      const maxPatients = existing?.maxPatients ?? result.availability?.maxPatientsPerSlot ?? 1;
      const bookedCount = existing?.bookedCount ?? 0;
      return { time, maxPatients, bookedCount, isFull: bookedCount >= maxPatients };
    });

    res.status(200).json({ date, slots });
  } catch (error) {
    console.error('Fetch slots error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching slots' });
  }
});

// Patient books one slot. Atomic under concurrent requests: ensureSlot
// materializes the Slot document if this is the first booking attempt for
// this doctor+date+time, then claimSlot does a single conditional $inc — no
// two patients can both claim the last open seat.
router.post('/book', verifyToken, requireRole('patient'), async (req: AuthenticatedRequest, res) => {
  try {
    const { doctorId, date: dateInput, time, amount } = req.body;

    if (!doctorId || !dateInput || !time || amount === undefined) {
      return res.status(400).json({ error: 'doctorId, date, time, and amount are all required' });
    }

    const minBookingAmount = Number(process.env.MIN_BOOKING_AMOUNT) || 100;
    if (Number(amount) < minBookingAmount) {
      return res.status(400).json({ error: `A minimum booking amount of ${minBookingAmount} is required` });
    }

    const date = normalizeDate(dateInput);
    if (!date) {
      return res.status(400).json({ error: 'A valid date is required' });
    }

    if (!isWithinBookingWindow(date)) {
      return res.status(400).json({ error: `Bookings are only allowed up to ${BOOKING_WINDOW_DAYS} days ahead` });
    }

    const result = await getBookableCandidateTimes(doctorId, date);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    if (!result.candidateTimes.includes(time)) {
      return res.status(400).json({ error: 'That time is not available for this doctor on this date' });
    }

    const maxPatients = result.availability!.maxPatientsPerSlot ?? 1;
    const slot = await ensureSlot(doctorId, date, time, maxPatients);
    const claimed = await claimSlot(slot._id.toString(), slot.maxPatients);

    if (!claimed) {
      return res.status(409).json({ error: 'This slot is fully booked' });
    }

    const appointment = await Appointment.create({
      patient: req.user!.id,
      doctor: doctorId,
      slot: claimed._id,
      date,
      time,
      amount,
      status: 'Booked',
    });

    res.status(201).json({ message: 'Appointment booked', appointment });
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: 'Something went wrong while booking the appointment' });
  }
});

// Patient's own booking history.
router.get('/my', verifyToken, requireRole('patient'), async (req: AuthenticatedRequest, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user!.id })
      .populate('doctor', 'name specialization degree')
      .sort({ date: 1, time: 1 });

    res.status(200).json({ appointments });
  } catch (error) {
    console.error('Fetch appointments error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching appointments' });
  }
});

export default router;
