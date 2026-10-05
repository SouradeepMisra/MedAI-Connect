import type { Patient } from '../types';
import { createAuthContext } from './createAuthContext';

const { Provider, useAuthContext } = createAuthContext<Patient>('medai_patient_auth');

export const AuthProvider = Provider;

export function useAuth() {
  const { token, user, login, logout } = useAuthContext('useAuth must be used within an AuthProvider');
  return { token, patient: user, login, logout };
}
