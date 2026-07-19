import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Patient } from '../models/Patient';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Basic validation — make sure nothing required is missing
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if a patient with this email or phone already exists
    const existingPatient = await Patient.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingPatient) {
      return res.status(409).json({ error: 'Email or phone already registered' });
    }

    // Hash the password before storing — never save plain text passwords
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newPatient = new Patient({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    await newPatient.save();

    // Respond without sending the password back, even hashed
    res.status(201).json({
      message: 'Patient registered successfully',
      patient: {
        id: newPatient._id,
        name: newPatient.name,
        email: newPatient.email,
        phone: newPatient.phone,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Something went wrong during registration' });
  }
});

export default router;