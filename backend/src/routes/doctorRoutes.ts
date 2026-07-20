import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Doctor } from '../models/Doctor';

const router = Router();

// Generates a login ID like "DOC-4F9A21" — short, unique-enough, human-typeable
function generateLoginId(): string {
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `DOC-${randomPart}`;
}

// Generates a random temporary password the doctor will be told to change later
function generateTempPassword(): string {
  return crypto.randomBytes(6).toString('base64url'); // URL-safe, no confusing symbols
}

router.post('/', async (req, res) => {
  try {
    const { name, registrationNumber, degree, specialization, experience } = req.body;

    if (!name || !registrationNumber || !degree || !specialization || experience === undefined) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingDoctor = await Doctor.findOne({ registrationNumber });
    if (existingDoctor) {
      return res.status(409).json({ error: 'A doctor with this registration number already exists' });
    }

    // Keep generating a loginId until we find one that isn't already taken —
    // collisions are extremely unlikely with this randomness, but this loop
    // guarantees correctness rather than just hoping.
    let loginId = generateLoginId();
    while (await Doctor.findOne({ loginId })) {
      loginId = generateLoginId();
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newDoctor = new Doctor({
      name,
      registrationNumber,
      degree,
      specialization,
      experience,
      loginId,
      password: hashedPassword,
    });

    await newDoctor.save();

    res.status(201).json({
      message: 'Doctor created successfully',
      doctor: {
        id: newDoctor._id,
        name: newDoctor.name,
        specialization: newDoctor.specialization,
        loginId: newDoctor.loginId,
      },
      // Only returned this one time — the admin must record/share this now.
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    console.error('Doctor creation error:', error);
    res.status(500).json({ error: 'Something went wrong while creating the doctor' });
  }
});

export default router;