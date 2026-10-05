import { createAuthContext } from './createAuthContext';

// Shape of the doctor object returned by POST /api/auth/doctor/login —
// distinct from DoctorDetail (the fuller GET /profile shape), since login
// only returns a small subset up front.
interface DoctorLoginInfo {
  id: string;
  name: string;
  specialization: string;
  isActivated: boolean;
}

// Separate storage key from the patient/admin AuthContexts so all three
// sessions can coexist in the same browser without colliding.
const { Provider, useAuthContext } = createAuthContext<DoctorLoginInfo>('medai_doctor_auth');

export const DoctorAuthProvider = Provider;

export function useDoctorAuth() {
  const { token, user, login, logout } = useAuthContext('useDoctorAuth must be used within a DoctorAuthProvider');
  return { token, doctor: user, login, logout };
}
