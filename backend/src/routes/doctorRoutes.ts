import { Router } from 'express';
import bcrypt from 'bcryptjs';

import { Doctor } from '../models/Doctor';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.post('/register', upload.single('document'), async (req, res) => {
  try {
    const { name, registrationNumber, degree, specialization, experience, password } = req.body;

    if (!name || !registrationNumber || !degree || !specialization || !experience || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'A registration document is required' });
    }

    const existingDoctor = await Doctor.findOne({ registrationNumber });
    if (existingDoctor) {
      return res.status(409).json({ error: 'A doctor with this registration number already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newDoctor = new Doctor({
      name,
      registrationNumber,
      degree,
      specialization,
      experience,
      password: hashedPassword,
      documentPath: req.file.path,
      verificationStatus: 'Pending',
    });

    await newDoctor.save();

    res.status(201).json({
      message: 'Registration submitted. Your account is pending admin verification.',
      doctor: {
        id: newDoctor._id,
        name: newDoctor.name,
        verificationStatus: newDoctor.verificationStatus,
      },
    });
  } catch (error) {
    console.error('Doctor registration error:', error);
    res.status(500).json({ error: 'Something went wrong during registration' });
  }
});

const PUBLIC_DOCTOR_FIELDS = 'name degree specialization experience';

// Public — patients browsing/searching for a doctor to book with. Only ever
// exposes doctors who are both admin-approved and have activated their
// profile (set up availability) — never a pending or rejected record.
router.get('/', async (req, res) => {
  try {
    const { search, specialization } = req.query;

    const filter: Record<string, unknown> = {
      verificationStatus: 'Approved',
      isActivated: true,
    };

    if (typeof search === 'string' && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    if (typeof specialization === 'string' && specialization.trim()) {
      filter.specialization = { $regex: `^${specialization.trim()}$`, $options: 'i' };
    }

    const doctors = await Doctor.find(filter).select(PUBLIC_DOCTOR_FIELDS);
    res.status(200).json({ doctors });
  } catch (error) {
    console.error('List doctors error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching doctors' });
  }
});

// Public — a single doctor's profile, same Approved + isActivated scoping.
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      _id: req.params.id,
      verificationStatus: 'Approved',
      isActivated: true,
    }).select(PUBLIC_DOCTOR_FIELDS);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.status(200).json({ doctor });
  } catch (error) {
    console.error('Fetch doctor error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching the doctor' });
  }
});

export default router;
