import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Admin } from '../types';

// Separate storage key from the patient AuthContext so an admin session and
// a patient session can coexist in the same browser without colliding.
const STORAGE_KEY = 'medai_admin_auth';

interface StoredAuth {
  token: string;
  admin: Admin;
}

interface AdminAuthContextValue {
  token: string | null;
  admin: Admin | null;
  login: (token: string, admin: Admin) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => readStoredAuth());

  useEffect(() => {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  const login = (token: string, admin: Admin) => setAuth({ token, admin });
  const logout = () => setAuth(null);

  return (
    <AdminAuthContext.Provider
      value={{ token: auth?.token ?? null, admin: auth?.admin ?? null, login, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
