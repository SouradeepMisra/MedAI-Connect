import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin';
import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';

const router = Router();

router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      // Deliberately vague — don't reveal whether the email exists or not
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, admin.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET || '',
      { expiresIn: '8h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Something went wrong during login' });
  }
});

router.post('/doctor/login', async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Login ID and password are required' });
    }

    const doctor = await Doctor.findOne({ loginId });
    if (!doctor) {
      return res.status(401).json({ error: 'Invalid login ID or password' });
    }

    if (!doctor.password) {
      return res.status(401).json({ error: 'Invalid login ID or password' });
    }

    const passwordMatches = await bcrypt.compare(password, doctor.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid login ID or password' });
    }

    const token = jwt.sign(
      { id: doctor._id, role: 'doctor' },
      process.env.JWT_SECRET || '',
      { expiresIn: '8h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization,
        isActivated: doctor.isActivated,
      },
    });
  } catch (error) {
    console.error('Doctor login error:', error);
    res.status(500).json({ error: 'Something went wrong during login' });
  }
});

router.post('/patient/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = email or phone

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/phone and password are required' });
    }

    const patient = await Patient.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!patient) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, patient.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: patient._id, role: 'patient' },
      process.env.JWT_SECRET || '',
      { expiresIn: '8h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      patient: { id: patient._id, name: patient.name, email: patient.email },
    });
  } catch (error) {
    console.error('Patient login error:', error);
    res.status(500).json({ error: 'Something went wrong during login' });
  }
});

export default router;