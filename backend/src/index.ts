// import express from 'express';
// import dotenv from 'dotenv';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(express.json());

// app.get('/api/health', (req, res) => {
//   res.json({ status: 'ok', service: 'medai-connect-backend' });
// });

// app.listen(PORT, () => {
//   console.log(`Backend running on port ${PORT}`);
// });

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import multer from 'multer';
import patientRoutes from './routes/patientRoutes';
import doctorRoutes from './routes/doctorRoutes';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import doctorAvailabilityRoutes from './routes/doctorAvailabilityRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import chatRoutes from './routes/chatRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || '';

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorAvailabilityRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'medai-connect-backend' });
});

// Every route in this app wraps its own logic in try/catch and never calls
// next(err) itself — the only errors that currently reach here are Multer's,
// from upload.single('document') on doctor registration (fileFilter's
// rejection, or the size limit). Both already carry a message written to be
// shown to a user, so surfacing them is intentional and scoped to that —
// this isn't a blanket "expose any thrown error" handler, since nothing else
// in the app currently routes an error here.
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File must be 5MB or smaller' : err.message;
    return res.status(400).json({ error: message });
  }
  if (err instanceof Error) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

async function startServer() {
  try {
    // Connect to MongoDB first — no point accepting requests
    // if the database isn't reachable yet.
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    // Fail loudly and stop the process rather than running
    // in a broken, silently-failing state.
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
}

startServer();