import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Separate storage key from the patient/admin AuthContexts so all three
// sessions can coexist in the same browser without colliding.
const STORAGE_KEY = 'medai_doctor_auth';

// Shape of the doctor object returned by POST /api/auth/doctor/login —
// distinct from DoctorDetail (the fuller GET /profile shape), since login
// only returns a small subset up front.
interface DoctorLoginInfo {
  id: string;
  name: string;
  specialization: string;
  isActivated: boolean;
}

interface StoredAuth {
  token: string;
  doctor: DoctorLoginInfo;
}

interface DoctorAuthContextValue {
  token: string | null;
  doctor: DoctorLoginInfo | null;
  login: (token: string, doctor: DoctorLoginInfo) => void;
  logout: () => void;
}

const DoctorAuthContext = createContext<DoctorAuthContextValue | undefined>(undefined);

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function DoctorAuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => readStoredAuth());

  useEffect(() => {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  const login = (token: string, doctor: DoctorLoginInfo) => setAuth({ token, doctor });
  const logout = () => setAuth(null);

  return (
    <DoctorAuthContext.Provider
      value={{ token: auth?.token ?? null, doctor: auth?.doctor ?? null, login, logout }}
    >
      {children}
    </DoctorAuthContext.Provider>
  );
}

export function useDoctorAuth(): DoctorAuthContextValue {
  const context = useContext(DoctorAuthContext);
  if (!context) {
    throw new Error('useDoctorAuth must be used within a DoctorAuthProvider');
  }
  return context;
}
