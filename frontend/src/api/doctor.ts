import { apiRequest, API_BASE_URL } from './client';
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

// Multipart (file upload), so it can't go through apiRequest the way every
// other call here does — apiRequest force-sets Content-Type: application/json
// and JSON.stringifies the body. Same reasoning as getDoctorDocumentBlob in
// api/admin.ts for the reverse (binary) direction: a plain fetch with its own
// small { error } -> thrown Error normalization instead.
export async function registerDoctor(
  formData: FormData
): Promise<{ message: string; doctor: { id: string; name: string; verificationStatus: string } }> {
  const response = await fetch(`${API_BASE_URL}/api/doctors/register`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed with status ${response.status}`);
  }

  return data;
}

export function getProfile(token: string) {
  return apiRequest<{ doctor: DoctorDetail }>('/api/doctor/profile', { token });
}

// Multipart, same reasoning as registerDoctor above — bypasses apiRequest's
// forced JSON content-type.
export async function updateDoctorProfile(
  token: string,
  formData: FormData
): Promise<{ message: string; bio?: string; photoUrl: string | null }> {
  const response = await fetch(`${API_BASE_URL}/api/doctor/profile`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed with status ${response.status}`);
  }

  return data;
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
