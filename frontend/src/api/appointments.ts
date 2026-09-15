import { apiRequest } from './client';
import type { Appointment } from '../types';

export function bookAppointment(
  token: string,
  input: { doctorId: string; date: string; time: string; amount: number }
) {
  return apiRequest<{ message: string; appointment: Appointment }>('/api/appointments/book', {
    method: 'POST',
    token,
    body: input,
  });
}

export function getMyAppointments(token: string) {
  return apiRequest<{ appointments: Appointment[] }>('/api/appointments/my', { token });
}
