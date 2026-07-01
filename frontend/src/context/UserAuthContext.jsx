import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { userAuthApi } from '../api';

const UserAuthContext = createContext(null);

const TOKEN_KEY = 'user_token';
const REFRESH_KEY = 'user_refresh_token';

export function UserAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const res = await userAuthApi.me();
      setUser(res.data);
      return res.data;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (username, password, captchaToken) => {
    const res = await userAuthApi.login(username, password, captchaToken);
    localStorage.setItem(TOKEN_KEY, res.data.access_token);
    if (res.data.refresh_token) {
      localStorage.setItem(REFRESH_KEY, res.data.refresh_token);
    }
    const me = await userAuthApi.me();
    setUser(me.data);
    return me.data;
  }, []);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    try {
      await userAuthApi.logout(refresh);
    } catch {
      /* ignore */
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, loadUser, setUser, isAuthenticated: !!user }),
    [user, loading, login, logout, loadUser]
  );

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
  return ctx;
}
