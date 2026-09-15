import { apiRequest } from './client';
import type { Doctor, Slot } from '../types';

export function listDoctors(params: { search?: string; specialization?: string } = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.specialization) query.set('specialization', params.specialization);
  const queryString = query.toString();

  return apiRequest<{ doctors: Doctor[] }>(`/api/doctors${queryString ? `?${queryString}` : ''}`);
}

export function getDoctor(doctorId: string) {
  return apiRequest<{ doctor: Doctor }>(`/api/doctors/${doctorId}`);
}

export function getSlots(doctorId: string, date: string) {
  return apiRequest<{ date: string; slots: Slot[] }>(
    `/api/appointments/slots?doctorId=${doctorId}&date=${date}`
  );
}
