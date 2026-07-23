import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Doctor } from '../models/Doctor';
import { verifyToken, requireRole } from '../middleware/authMiddleware';
import { generateUniqueLoginId, generateTempPassword } from '../utils/credentialGenerator';

const router = Router();

// Every route below requires a valid admin token — applied once here
// rather than repeating verifyToken/requireRole on each route individually.
router.use(verifyToken, requireRole('admin'));

// List all doctors awaiting verification
router.get('/doctors/pending', async (req, res) => {
  try {
    const pendingDoctors = await Doctor.find({ verificationStatus: 'Pending' }).select(
      'name registrationNumber degree specialization experience documentPath createdAt'
    );
    res.status(200).json({ doctors: pendingDoctors });
  } catch (error) {
    console.error('Fetch pending doctors error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching pending doctors' });
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
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    doctor.loginId = loginId;
    doctor.password = hashedPassword;
    doctor.verificationStatus = 'Approved';
    await doctor.save();

    res.status(200).json({
      message: 'Doctor approved successfully',
      doctor: { id: doctor._id, name: doctor.name, loginId: doctor.loginId },
      // Returned once — in a real system this would be emailed, not shown in the response.
      temporaryPassword: tempPassword,
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