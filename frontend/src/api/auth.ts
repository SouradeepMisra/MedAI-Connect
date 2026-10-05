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

export function requestPasswordReset(input: { email: string }) {
  return apiRequest<{ message: string }>('/api/auth/patient/forgot-password', {
    method: 'POST',
    body: input,
  });
}

export function resetPassword(input: { token: string; password: string }) {
  return apiRequest<{ message: string }>('/api/auth/patient/reset-password', {
    method: 'POST',
    body: input,
  });
}
