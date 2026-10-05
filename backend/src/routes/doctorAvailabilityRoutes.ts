import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { Doctor } from '../models/Doctor';
import { DoctorAvailability } from '../models/DoctorAvailability';
import { Appointment } from '../models/Appointment';
import { verifyToken, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware';
import { uploadPhoto } from '../middleware/uploadMiddleware';

const PHOTO_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/doctor-photos');
const MAX_BIO_LENGTH = 1000;

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

    res.status(200).json({
      doctor: {
        ...doctor.toObject(),
        photoUrl: doctor.photoFilename ? `/uploads/doctor-photos/${doctor.photoFilename}` : null,
      },
    });
  } catch (error) {
    console.error('Fetch doctor profile error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching the profile' });
  }
});

// Self-service bio/photo update — set either, both, or neither in a single
// request (whichever form fields/files are present get applied).
router.patch('/profile', uploadPhoto.single('photo'), async (req: AuthenticatedRequest, res) => {
  try {
    const doctor = await Doctor.findById(req.user!.id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    if (typeof req.body.bio === 'string') {
      const trimmedBio = req.body.bio.trim();
      if (trimmedBio.length > MAX_BIO_LENGTH) {
        return res.status(400).json({ error: `Bio must be ${MAX_BIO_LENGTH} characters or fewer` });
      }
      doctor.bio = trimmedBio;
    }

    if (req.file) {
      const previousFilename = doctor.photoFilename;
      doctor.photoFilename = req.file.filename;

      if (previousFilename) {
        // Best-effort cleanup — an orphaned old photo file is harmless, so a
        // failure here shouldn't fail the request that just succeeded.
        fs.unlink(path.join(PHOTO_UPLOAD_DIR, previousFilename), () => {});
      }
    }

    await doctor.save();

    res.status(200).json({
      message: 'Profile updated',
      bio: doctor.bio,
      photoUrl: doctor.photoFilename ? `/uploads/doctor-photos/${doctor.photoFilename}` : null,
    });
  } catch (error) {
    console.error('Update doctor profile error:', error);
    res.status(500).json({ error: 'Something went wrong while updating the profile' });
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

// Upserts a doctor's availability template, and copes with the classic
// concurrent-upsert duplicate-key race on a doctor's very first save (two
// near-simultaneous inserts, one throws E11000 against the unique index on
// doctor). Unlike ensureSlot/ensureChatLog, a retry here can't just re-fetch
// the winner's document — this request's submitted values are the point of
// the call, so on a race it retries as a plain (non-upsert) update instead,
// applying this request's values for correct last-write-wins behavior
// rather than silently discarding them in favor of whichever insert
// happened to land first.
async function saveAvailability(
  doctorId: string,
  update: Record<string, unknown>
): Promise<InstanceType<typeof DoctorAvailability>> {
  try {
    return await DoctorAvailability.findOneAndUpdate(
      { doctor: doctorId },
      { doctor: doctorId, ...update },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      const retried = await DoctorAvailability.findOneAndUpdate({ doctor: doctorId }, update, {
        new: true,
        runValidators: true,
      });
      // The E11000 we just caught means a document with this doctor id
      // definitely exists, so this retry should never miss — but the
      // update's own return type is nullable, and surfacing a clear error
      // beats either an unsafe assertion or a silent `undefined` downstream.
      if (!retried) {
        throw new Error('Availability document unexpectedly missing after a duplicate-key retry');
      }
      return retried;
    }
    throw error;
  }
}

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

    const update = {
      weeklySchedule,
      ...(slotDurationMinutes !== undefined ? { slotDurationMinutes } : {}),
      ...(maxPatientsPerSlot !== undefined ? { maxPatientsPerSlot } : {}),
    };

    const availability = await saveAvailability(req.user!.id, update);

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
