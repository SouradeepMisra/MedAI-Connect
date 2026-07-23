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
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import patientRoutes from './routes/patientRoutes';
import doctorRoutes from './routes/doctorRoutes';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || '';

app.use(express.json());
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'medai-connect-backend' });
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