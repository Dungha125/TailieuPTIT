import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { userApi, userAuthApi } from '../api';

const UserAuthContext = createContext(null);

const TOKEN_KEY = 'user_token';
const REFRESH_KEY = 'user_refresh_token';

export function UserAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkIds, setBookmarkIds] = useState(new Set());

  const refreshBookmarks = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setBookmarkIds(new Set());
      return;
    }
    try {
      const res = await userApi.bookmarkIds();
      setBookmarkIds(new Set(res.data));
    } catch {
      setBookmarkIds(new Set());
    }
  }, []);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setBookmarkIds(new Set());
      setLoading(false);
      return null;
    }
    try {
      const res = await userAuthApi.me();
      setUser(res.data);
      await refreshBookmarks();
      return res.data;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      setUser(null);
      setBookmarkIds(new Set());
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshBookmarks]);

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
    await refreshBookmarks();
    return me.data;
  }, [refreshBookmarks]);

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
    setBookmarkIds(new Set());
  }, []);

  const isBookmarked = useCallback((documentId) => bookmarkIds.has(documentId), [bookmarkIds]);

  const toggleBookmark = useCallback(async (documentId, folderId = null) => {
    if (bookmarkIds.has(documentId)) {
      await userApi.removeBookmark(documentId);
      setBookmarkIds((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
      return false;
    }
    await userApi.addBookmark({ document_id: documentId, folder_id: folderId ?? undefined });
    setBookmarkIds((prev) => new Set(prev).add(documentId));
    return true;
  }, [bookmarkIds]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      loadUser,
      setUser,
      isAuthenticated: !!user,
      bookmarkIds,
      isBookmarked,
      toggleBookmark,
      refreshBookmarks,
    }),
    [user, loading, login, logout, loadUser, bookmarkIds, isBookmarked, toggleBookmark, refreshBookmarks]
  );

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
  return ctx;
}
