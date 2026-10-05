import { apiRequest, API_BASE_URL, handleUnauthorized } from './client';
import type { Admin, AiVerification, DoctorDetail, PendingDoctor } from '../types';

export function adminLogin(input: { email: string; password: string }) {
  return apiRequest<{ message: string; token: string; admin: Admin }>('/api/auth/admin/login', {
    method: 'POST',
    body: input,
  });
}

export function listPendingDoctors(token: string) {
  return apiRequest<{ doctors: PendingDoctor[] }>('/api/admin/doctors/pending', { token });
}

export function getDoctorDetail(token: string, doctorId: string) {
  return apiRequest<{ doctor: DoctorDetail }>(`/api/admin/doctors/${doctorId}`, { token });
}

export function runVerification(token: string, doctorId: string) {
  return apiRequest<{ message: string; aiVerification: AiVerification }>(
    `/api/admin/doctors/${doctorId}/verify-document`,
    { method: 'POST', token }
  );
}

export function approveDoctor(token: string, doctorId: string) {
  return apiRequest<{
    message: string;
    doctor: { id: string; name: string; loginId: string };
    temporaryPassword?: string;
  }>(`/api/admin/doctors/${doctorId}/approve`, { method: 'PATCH', token });
}

export function rejectDoctor(token: string, doctorId: string) {
  return apiRequest<{ message: string; doctor: { id: string; name: string } }>(
    `/api/admin/doctors/${doctorId}/reject`,
    { method: 'PATCH', token }
  );
}

// Binary response, not JSON — can't go through apiRequest. A plain <img src>
// can't send an Authorization header, so the caller fetches the bytes here
// and renders them via URL.createObjectURL instead.
export async function getDoctorDocumentBlob(
  token: string,
  doctorId: string
): Promise<{ blob: Blob; contentType: string }> {
  const path = `/api/admin/doctors/${doctorId}/document`;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized(path);
    throw new Error('Failed to load document');
  }

  const blob = await response.blob();
  return { blob, contentType: response.headers.get('Content-Type') ?? 'application/octet-stream' };
}
