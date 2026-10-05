import type { Admin } from '../types';
import { createAuthContext } from './createAuthContext';

// Separate storage key from the patient AuthContext so an admin session and
// a patient session can coexist in the same browser without colliding.
const { Provider, useAuthContext } = createAuthContext<Admin>('medai_admin_auth');

export const AdminAuthProvider = Provider;

export function useAdminAuth() {
  const { token, user, login, logout } = useAuthContext('useAdminAuth must be used within an AdminAuthProvider');
  return { token, admin: user, login, logout };
}
