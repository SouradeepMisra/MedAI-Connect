export interface Doctor {
  _id: string;
  name: string;
  degree: string;
  specialization: string;
  experience: number;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
}

export interface Slot {
  time: string; // "HH:mm"
  maxPatients: number;
  bookedCount: number;
  isFull: boolean;
}

export interface Appointment {
  _id: string;
  patient: string;
  doctor: Doctor | string;
  slot: string;
  date: string;
  time: string;
  amount: number;
  status: 'Booked' | 'Cancelled' | 'Completed';
}
