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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
}

type MatchVerdict = 'match' | 'mismatch' | 'uncertain';

export interface AiVerification {
  status: 'NotRun' | 'Completed' | 'Failed';
  modelUsed?: string;
  extractedName?: string;
  extractedRegistrationNumber?: string;
  extractedDegree?: string;
  nameMatch?: MatchVerdict;
  registrationNumberMatch?: MatchVerdict;
  degreeMatch?: MatchVerdict;
  concerns?: string[];
  summary?: string;
  errorMessage?: string;
  checkedAt?: string;
}

export interface PendingDoctor {
  _id: string;
  name: string;
  registrationNumber: string;
  degree: string;
  specialization: string;
  experience: number;
  documentPath: string;
  createdAt: string;
  aiVerification?: { status: AiVerification['status'] };
}

export interface DoctorDetail {
  _id: string;
  name: string;
  registrationNumber: string;
  degree: string;
  specialization: string;
  experience: number;
  loginId?: string;
  documentPath: string;
  verificationStatus: 'Pending' | 'Approved' | 'Rejected';
  isActivated: boolean;
  aiVerification?: AiVerification;
}
