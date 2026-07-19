export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  isAvailable: boolean;
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientName: string;
  scheduledAt: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}
