import crypto from 'crypto';
import { Doctor } from '../models/Doctor';

// Generates a login ID like "DOC-4F9A21" — short, unique-enough, human-typeable
export function generateLoginId(): string {
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `DOC-${randomPart}`;
}

// Generates a random temporary password the doctor will be told to change later
export function generateTempPassword(): string {
  return crypto.randomBytes(6).toString('base64url');
}

// Keeps generating a loginId until an unused one is found — guards against
// the astronomically unlikely case of a collision, rather than assuming it away.
export async function generateUniqueLoginId(): Promise<string> {
  let loginId = generateLoginId();
  while (await Doctor.findOne({ loginId })) {
    loginId = generateLoginId();
  }
  return loginId;
}