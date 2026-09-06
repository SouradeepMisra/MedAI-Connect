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

export default router;
