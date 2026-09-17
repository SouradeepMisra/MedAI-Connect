import { apiRequest } from './client';
import type { Appointment, DoctorAvailability, DoctorDetail, WeeklyScheduleEntry } from '../types';

interface DoctorLoginInfo {
  id: string;
  name: string;
  specialization: string;
  isActivated: boolean;
}

export function doctorLogin(input: { loginId: string; password: string }) {
  return apiRequest<{ message: string; token: string; doctor: DoctorLoginInfo }>(
    '/api/auth/doctor/login',
    { method: 'POST', body: input }
  );
}

export function getProfile(token: string) {
  return apiRequest<{ doctor: DoctorDetail }>('/api/doctor/profile', { token });
}

export function getAvailability(token: string) {
  // 404 (no template yet) is a normal, expected state here, not an error to
  // surface — callers treat "no template" as null rather than a failure.
  return apiRequest<{ availability: DoctorAvailability }>('/api/doctor/availability', { token }).catch(
    () => ({ availability: null as unknown as DoctorAvailability })
  );
}

export function saveAvailability(
  token: string,
  input: {
    weeklySchedule: WeeklyScheduleEntry[];
    slotDurationMinutes?: number;
    maxPatientsPerSlot?: number;
  }
) {
  return apiRequest<{ message: string; availability: DoctorAvailability }>('/api/doctor/availability', {
    method: 'POST',
    token,
    body: input,
  });
}

export function blockHoliday(token: string, date: string) {
  return apiRequest<{ message: string; blockedDates: string[] }>('/api/doctor/holidays', {
    method: 'POST',
    token,
    body: { date },
  });
}

export function activateDoctor(token: string) {
  return apiRequest<{ message: string; isActivated: boolean }>('/api/doctor/activate', {
    method: 'PATCH',
    token,
  });
}

export function getDoctorAppointments(token: string) {
  return apiRequest<{ appointments: Appointment[] }>('/api/doctor/appointments', { token });
}
