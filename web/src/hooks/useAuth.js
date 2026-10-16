import { useState, useEffect } from "react";
import { api, getToken, getStoredUser } from "../api.js";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    setUser(getToken() ? getStoredUser() : null);
    setBooted(true);
  }, []);

  const login = async (email, password) => {
    const u = await api.login(email, password);
    setUser(u);
    return u;
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return { user, booted, login, logout };
}
