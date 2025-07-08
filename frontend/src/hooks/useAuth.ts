import { useCallback } from "react";

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function useAuth() {
  const token = localStorage.getItem("token");
  const isAuthenticated = !!token;
  const currentUser = token ? parseJwt(token) : null;

  const login = useCallback((token: string) => {
    localStorage.setItem("token", token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }, []);

  // Helper for authenticated fetch
  const authFetch = useCallback(
    (input: RequestInfo, init: RequestInit = {}) => {
      const token = localStorage.getItem("token");
      const apiUrl = process.env.REACT_APP_API_URL || '';
      let url = typeof input === 'string' && input.startsWith('/') ? apiUrl + input : input;
      return fetch(url, {
        ...init,
        headers: {
          ...(init.headers || {}),
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
    },
    []
  );

  return { isAuthenticated, login, logout, authFetch, currentUser };
} 