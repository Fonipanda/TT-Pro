import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = localStorage.getItem("tt_token");
    if (!token) { setLoading(false); return; }
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
    } catch { localStorage.removeItem("tt_token"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("tt_token", r.data.access_token);
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async (email, password, name) => {
    const r = await api.post("/auth/register", { email, password, name });
    localStorage.setItem("tt_token", r.data.access_token);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem("tt_token");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh: load }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
