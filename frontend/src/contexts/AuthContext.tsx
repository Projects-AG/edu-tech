import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { authApi, type LoginPayload, type RegisterPayload } from "../api/auth";

interface Tokens {
  access_token: string;
  refresh_token: string;
}

interface UserPayload {
  sub: string;
  institution_id: string;
  roles: string[];
}

interface AuthContextType {
  user: UserPayload | null;
  tokens: Tokens | null;
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeToken(token: string): UserPayload | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { sub: payload.sub, institution_id: payload.institution_id, roles: payload.roles };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<Tokens | null>(() => {
    const stored = localStorage.getItem("tokens");
    return stored ? JSON.parse(stored) : null;
  });
  const [user, setUser] = useState<UserPayload | null>(() =>
    tokens ? decodeToken(tokens.access_token) : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tokens) {
      localStorage.setItem("tokens", JSON.stringify(tokens));
      setUser(decodeToken(tokens.access_token));
    } else {
      localStorage.removeItem("tokens");
      setUser(null);
    }
  }, [tokens]);

  const login = async (data: LoginPayload) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      setTokens(res.data);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterPayload) => {
    setLoading(true);
    try {
      await authApi.register(data);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setTokens(null);
    localStorage.removeItem("tokens");
  };

  return (
    <AuthContext.Provider value={{ user, tokens, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
