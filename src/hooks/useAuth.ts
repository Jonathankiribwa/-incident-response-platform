import { useState, useEffect, useCallback } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: null | { email: string };
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<null | { email: string }>(null);

  useEffect(() => {
    // Simulate loading user from localStorage or API
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    if (token && email) {
      setIsAuthenticated(true);
      setUser({ email });
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // In a real app, validate credentials with backend here
    if (email && password) {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('userEmail', email);
      setIsAuthenticated(true);
      setUser({ email });
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
  };
} 