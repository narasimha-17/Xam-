import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { TOKEN_STORAGE_KEY, fetchMe, loginRequest, registerRequest, type RegisterPayload } from "../lib/api";
import type { User } from "../types/api";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_STORAGE_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const token = await loginRequest(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, token.access_token);
    setUser(token.user);
  }

  async function register(payload: RegisterPayload) {
    const token = await registerRequest(payload);
    localStorage.setItem(TOKEN_STORAGE_KEY, token.access_token);
    setUser(token.user);
  }

  function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, setUser }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
