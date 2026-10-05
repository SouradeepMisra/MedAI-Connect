import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface StoredAuth<TUser> {
  token: string;
  user: TUser;
}

export interface AuthContextValue<TUser> {
  token: string | null;
  user: TUser | null;
  login: (token: string, user: TUser) => void;
  logout: () => void;
}

// Builds one role's auth context/provider/hook. The patient, admin, and doctor
// sessions are structurally identical (a token + user object persisted to their
// own localStorage key, read back on mount) and only differ in storage key and
// user shape — this factory is instantiated once per role instead of
// duplicating the same provider/localStorage/hook code three times.
export function createAuthContext<TUser>(storageKey: string) {
  const Context = createContext<AuthContextValue<TUser> | undefined>(undefined);

  function readStoredAuth(): StoredAuth<TUser> | null {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as StoredAuth<TUser>) : null;
    } catch {
      return null;
    }
  }

  function Provider({ children }: { children: ReactNode }) {
    const [auth, setAuth] = useState<StoredAuth<TUser> | null>(() => readStoredAuth());

    useEffect(() => {
      if (auth) {
        localStorage.setItem(storageKey, JSON.stringify(auth));
      } else {
        localStorage.removeItem(storageKey);
      }
    }, [auth]);

    const login = (token: string, user: TUser) => setAuth({ token, user });
    const logout = () => setAuth(null);

    return (
      <Context.Provider value={{ token: auth?.token ?? null, user: auth?.user ?? null, login, logout }}>
        {children}
      </Context.Provider>
    );
  }

  function useAuthContext(missingProviderMessage: string): AuthContextValue<TUser> {
    const context = useContext(Context);
    if (!context) {
      throw new Error(missingProviderMessage);
    }
    return context;
  }

  return { Provider, useAuthContext };
}
