import { Router } from 'express';
import { Doctor } from '../models/Doctor';
import { DoctorAvailability } from '../models/DoctorAvailability';
import { Appointment } from '../models/Appointment';
import { verifyToken, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

// Every route below is a doctor acting on their own profile.
router.use(verifyToken, requireRole('doctor'));

// The calling doctor's own full profile — neither the public doctor-listing
// endpoint (Approved+isActivated only, minimal fields) nor the admin detail
// endpoint (admin-auth only) work for a doctor viewing their own dashboard.
router.get('/profile', async (req: AuthenticatedRequest, res) => {
  try {
    const doctor = await Doctor.findById(req.user!.id).select('-password');

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.status(200).json({ doctor });
  } catch (error) {
    console.error('Fetch doctor profile error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching the profile' });
  }
});

// The calling doctor's own upcoming appointments — mirrors the patient-side
// GET /api/appointments/my, just scoped to doctor and populating patient.
router.get('/appointments', async (req: AuthenticatedRequest, res) => {
  try {
    const appointments = await Appointment.find({ doctor: req.user!.id })
      .populate('patient', 'name email phone')
      .sort({ date: 1, time: 1 });

    res.status(200).json({ appointments });
  } catch (error) {
    console.error('Fetch doctor appointments error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching appointments' });
  }
});

// Create or replace the calling doctor's recurring weekly availability template.
router.post('/availability', async (req: AuthenticatedRequest, res) => {
  try {
    const { weeklySchedule, slotDurationMinutes, maxPatientsPerSlot } = req.body;

    if (!Array.isArray(weeklySchedule) || weeklySchedule.length === 0) {
      return res.status(400).json({ error: 'weeklySchedule must be a non-empty array' });
    }

    for (const entry of weeklySchedule) {
      const { dayOfWeek, startTime, endTime } = entry;
      if (
        typeof dayOfWeek !== 'number' ||
        dayOfWeek < 0 ||
        dayOfWeek > 6 ||
        typeof startTime !== 'string' ||
        typeof endTime !== 'string'
      ) {
        return res.status(400).json({
          error: 'Each weeklySchedule entry needs a numeric dayOfWeek (0-6), startTime, and endTime',
        });
      }
    }

    // A non-positive slotDurationMinutes would make slot generation loop
    // forever, and a non-positive maxPatientsPerSlot would make every slot
    // permanently unbookable — a plain truthiness check lets a negative
    // number slip through, so these need explicit range checks.
    if (
      slotDurationMinutes !== undefined &&
      (typeof slotDurationMinutes !== 'number' || slotDurationMinutes < 1)
    ) {
      return res.status(400).json({ error: 'slotDurationMinutes must be a positive number' });
    }

    if (
      maxPatientsPerSlot !== undefined &&
      (typeof maxPatientsPerSlot !== 'number' || maxPatientsPerSlot < 1)
    ) {
      return res.status(400).json({ error: 'maxPatientsPerSlot must be a positive number' });
    }

    const availability = await DoctorAvailability.findOneAndUpdate(
      { doctor: req.user!.id },
      {
        doctor: req.user!.id,
        weeklySchedule,
        ...(slotDurationMinutes !== undefined ? { slotDurationMinutes } : {}),
        ...(maxPatientsPerSlot !== undefined ? { maxPatientsPerSlot } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.status(200).json({ message: 'Availability saved', availability });
  } catch (error) {
    console.error('Save availability error:', error);
    res.status(500).json({ error: 'Something went wrong while saving availability' });
  }
});

// View the calling doctor's own availability template.
router.get('/availability', async (req: AuthenticatedRequest, res) => {
  try {
    const availability = await DoctorAvailability.findOne({ doctor: req.user!.id });

    if (!availability) {
      return res.status(404).json({ error: 'No availability template set yet' });
    }

    res.status(200).json({ availability });
  } catch (error) {
    console.error('Fetch availability error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching availability' });
  }
});

// Block a date (holiday) so no slots are offered for it.
router.post('/holidays', async (req: AuthenticatedRequest, res) => {
  try {
    const { date } = req.body;

    if (!date || isNaN(Date.parse(date))) {
      return res.status(400).json({ error: 'A valid date is required' });
    }

    const availability = await DoctorAvailability.findOne({ doctor: req.user!.id });
    if (!availability) {
      return res.status(400).json({ error: 'Set your availability template before blocking dates' });
    }

    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);

    const alreadyBlocked = availability.blockedDates.some(
      (blocked: any) => new Date(blocked).getTime() === normalized.getTime()
    );

    if (!alreadyBlocked) {
      availability.blockedDates.push(normalized);
      await availability.save();
    }

    res.status(200).json({ message: 'Date blocked', blockedDates: availability.blockedDates });
  } catch (error) {
    console.error('Block holiday error:', error);
    res.status(500).json({ error: 'Something went wrong while blocking the date' });
  }
});

// First-time activation — requires an availability template to already
// exist, per the PRD's "set up profile, then activate" flow.
router.patch('/activate', async (req: AuthenticatedRequest, res) => {
  try {
    const availability = await DoctorAvailability.findOne({ doctor: req.user!.id });
    if (!availability) {
      return res.status(400).json({ error: 'Set your availability template before activating' });
    }

    const doctor = await Doctor.findById(req.user!.id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    doctor.isActivated = true;
    await doctor.save();

    res.status(200).json({ message: 'Doctor activated', isActivated: doctor.isActivated });
  } catch (error) {
    console.error('Doctor activation error:', error);
    res.status(500).json({ error: 'Something went wrong while activating the doctor' });
  }
});

export default router;
