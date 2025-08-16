'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  doctorId: number | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (doctorId: number, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check for existing authentication on mount
    const savedDoctorId = localStorage.getItem('doctorId');
    const savedUsername = localStorage.getItem('username');
    
    if (savedDoctorId && savedUsername) {
      setDoctorId(parseInt(savedDoctorId));
      setUsername(savedUsername);
      setIsAuthenticated(true);
    }
  }, []);

  const login = (doctorId: number, username: string) => {
    // Save to localStorage
    localStorage.setItem('doctorId', doctorId.toString());
    localStorage.setItem('username', username);
    
    // Set cookies for middleware
    document.cookie = `doctor-id=${doctorId}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
    document.cookie = `auth-token=authenticated; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
    
    // Update state
    setDoctorId(doctorId);
    setUsername(username);
    setIsAuthenticated(true);
    
    // Redirect to dashboard
    router.push('/dashboard/home');
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('doctorId');
    localStorage.removeItem('username');
    
    // Clear cookies
    document.cookie = 'doctor-id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    
    // Update state
    setDoctorId(null);
    setUsername(null);
    setIsAuthenticated(false);
    
    // Redirect to login
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{
      doctorId,
      username,
      isAuthenticated,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
