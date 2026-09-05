import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { fetchMe, updateProfile } from "../lib/api";
import type { User } from "../types/api";

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  roll_number: string;
  phone_number: string;
  location: string;
  institution: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        setUser(await fetchMe());
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
    setUser(await fetchMe());
  }

  async function loginWithGoogle() {
    await signInWithPopup(auth, googleProvider);
    setUser(await fetchMe());
  }

  async function register(payload: RegisterPayload) {
    await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    const created = await updateProfile({
      full_name: payload.full_name,
      roll_number: payload.roll_number,
      phone_number: payload.phone_number,
      location: payload.location,
      institution: payload.institution,
    });
    setUser(created);
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, isLoading, login, loginWithGoogle, register, logout, setUser }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
