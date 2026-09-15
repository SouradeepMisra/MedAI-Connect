import { apiRequest } from './client';
import type { Patient } from '../types';

export function registerPatient(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  return apiRequest<{ message: string; patient: Patient }>('/api/patients/register', {
    method: 'POST',
    body: input,
  });
}

export function loginPatient(input: { identifier: string; password: string }) {
  return apiRequest<{ message: string; token: string; patient: Patient }>(
    '/api/auth/patient/login',
    { method: 'POST', body: input }
  );
}
