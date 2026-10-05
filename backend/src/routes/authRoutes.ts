import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin';
import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { getJwtSecret } from '../utils/jwtSecret';
import { sendPasswordResetEmail } from '../services/emailService';

const router = Router();

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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
      getJwtSecret(),
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
      getJwtSecret(),
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
      getJwtSecret(),
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

const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.';

// Always responds with the same generic message regardless of whether the
// email matches an account — revealing that would let an attacker enumerate
// registered emails. Only sends anything when it does match.
router.post('/patient/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const patient = await Patient.findOne({ email });
    if (patient) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      patient.passwordResetTokenHash = hashResetToken(rawToken);
      patient.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await patient.save();

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

      try {
        await sendPasswordResetEmail(patient.email, resetUrl);
      } catch (emailError) {
        // The account genuinely can't proceed without this email, so unlike
        // the generic "account not found" case above, this is a real error —
        // but the response still shouldn't say why, to avoid leaking config
        // details to the client.
        console.error('Password reset email send failed:', emailError);
        return res.status(500).json({ error: 'Something went wrong while sending the reset email' });
      }
    }

    res.status(200).json({ message: FORGOT_PASSWORD_GENERIC_MESSAGE });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/patient/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const patient = await Patient.findOne({
      passwordResetTokenHash: hashResetToken(token),
      passwordResetExpires: { $gt: new Date() },
    });

    if (!patient) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    patient.password = await bcrypt.hash(password, 10);
    patient.passwordResetTokenHash = undefined;
    patient.passwordResetExpires = undefined;
    await patient.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Something went wrong while resetting the password' });
  }
});

export default router;