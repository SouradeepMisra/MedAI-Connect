import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Patient } from '../types';

const STORAGE_KEY = 'medai_patient_auth';

interface StoredAuth {
  token: string;
  patient: Patient;
}

interface AuthContextValue {
  token: string | null;
  patient: Patient | null;
  login: (token: string, patient: Patient) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => readStoredAuth());

  useEffect(() => {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  const login = (token: string, patient: Patient) => setAuth({ token, patient });
  const logout = () => setAuth(null);

  return (
    <AuthContext.Provider
      value={{ token: auth?.token ?? null, patient: auth?.patient ?? null, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
