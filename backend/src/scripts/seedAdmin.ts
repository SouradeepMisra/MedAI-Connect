import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin';

dotenv.config();

async function seedAdmin() {
  await mongoose.connect(process.env.MONGODB_URI || '');

  const existing = await Admin.findOne({ email: 'admin@medai.com' });
  if (existing) {
    console.log('Admin already exists — skipping.');
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash('ChangeThisPassword123', 10);

  await Admin.create({
    name: 'Super Admin',
    email: 'admin@medai.com',
    password: hashedPassword,
  });

  console.log('Admin created: admin@medai.com / ChangeThisPassword123');
  await mongoose.disconnect();
}

seedAdmin();