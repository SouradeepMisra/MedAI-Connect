import { Router } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { Doctor } from '../models/Doctor';
import { verifyToken, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware';
import { generateUniqueLoginId, generateTempPassword } from '../utils/credentialGenerator';
import { verifyDoctorDocument } from '../services/aiVerificationService';

const router = Router();

const DOCUMENT_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

// Every route below requires a valid admin token — applied once here
// rather than repeating verifyToken/requireRole on each route individually.
router.use(verifyToken, requireRole('admin'));

// List all doctors awaiting verification
router.get('/doctors/pending', async (req, res) => {
  try {
    const pendingDoctors = await Doctor.find({ verificationStatus: 'Pending' }).select(
      'name registrationNumber degree specialization experience documentPath createdAt aiVerification.status'
    );
    res.status(200).json({ doctors: pendingDoctors });
  } catch (error) {
    console.error('Fetch pending doctors error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching pending doctors' });
  }
});

// Full detail for a single doctor — used when an admin opens one review,
// to see submitted profile data alongside any AI verification results.
router.get('/doctors/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).select('-password');

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.status(200).json({ doctor });
  } catch (error) {
    console.error('Fetch doctor detail error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching the doctor' });
  }
});

// Streams the doctor's uploaded document — admin-auth protected rather than
// public static serving, since these are potentially sensitive registration
// certificates. The frontend fetches this with an Authorization header and
// renders the bytes as a blob, since a plain <img src> can't send one.
router.get('/doctors/:id/document', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor || !fs.existsSync(doctor.documentPath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const ext = path.extname(doctor.documentPath).toLowerCase();
    const contentType = DOCUMENT_CONTENT_TYPES[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.sendFile(path.resolve(doctor.documentPath));
  } catch (error) {
    console.error('Fetch doctor document error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching the document' });
  }
});

// Runs the AI document check on-demand (an admin explicitly triggers this
// while reviewing a doctor) and persists the result. Re-running overwrites
// the previous result. This never changes verificationStatus itself —
// approve/reject stays a manual admin decision either way.
router.post('/doctors/:id/verify-document', async (req: AuthenticatedRequest, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const result = await verifyDoctorDocument(doctor);

    doctor.aiVerification = {
      ...result,
      checkedAt: new Date(),
      checkedBy: req.user?.id,
    } as any;
    await doctor.save();

    res.status(200).json({ message: 'AI verification complete', aiVerification: doctor.aiVerification });
  } catch (error) {
    console.error('AI document verification route error:', error);
    res.status(500).json({ error: 'Something went wrong while running the AI verification' });
  }
});

// Approve a doctor — generates their login credentials
router.patch('/doctors/:id/approve', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    if (doctor.verificationStatus !== 'Pending') {
      return res.status(409).json({ error: `Doctor is already ${doctor.verificationStatus}` });
    }

    const loginId = await generateUniqueLoginId();
    doctor.loginId = loginId;

    // Self-registered doctors already chose and hashed their own password at
    // registration — only generate a temp one for the (currently unused, but
    // schema-supported) case of a doctor with no password set yet, so
    // approval never discards a password the doctor already chose.
    let tempPassword: string | undefined;
    if (!doctor.password) {
      tempPassword = generateTempPassword();
      doctor.password = await bcrypt.hash(tempPassword, 10);
    }

    doctor.verificationStatus = 'Approved';
    await doctor.save();

    res.status(200).json({
      message: 'Doctor approved successfully',
      doctor: { id: doctor._id, name: doctor.name, loginId: doctor.loginId },
      // Only present when a temp password was actually generated — in a real
      // system this would be emailed, not shown in the response. Otherwise
      // the doctor logs in with the password they chose at registration.
      ...(tempPassword ? { temporaryPassword: tempPassword } : {}),
    });
  } catch (error) {
    console.error('Doctor approval error:', error);
    res.status(500).json({ error: 'Something went wrong while approving the doctor' });
  }
});

// Reject a doctor — keeps the record (for audit purposes) rather than deleting it
router.patch('/doctors/:id/reject', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    if (doctor.verificationStatus !== 'Pending') {
      return res.status(409).json({ error: `Doctor is already ${doctor.verificationStatus}` });
    }

    doctor.verificationStatus = 'Rejected';
    await doctor.save();

    res.status(200).json({ message: 'Doctor rejected', doctor: { id: doctor._id, name: doctor.name } });
  } catch (error) {
    console.error('Doctor rejection error:', error);
    res.status(500).json({ error: 'Something went wrong while rejecting the doctor' });
  }
});

export default router;