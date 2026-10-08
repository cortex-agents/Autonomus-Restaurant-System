"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isAuthenticated, refreshToken, logout, setAuthData } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { clearQueryCache } from "@/components/providers/QueryClientProvider";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticatedState, setIsAuthenticatedState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = isAuthenticated();
      setIsAuthenticatedState(authenticated);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();

      clearQueryCache(); // new session -> no data from a previous restaurant
      // Store tokens
      const payload = JSON.parse(atob(data.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      setAuthData({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: payload.exp,
      });

      setIsAuthenticatedState(true);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutHandler = () => {
    logout();
    clearQueryCache();
    setIsAuthenticatedState(false);
  };

  const refreshTokenHandler = async () => {
    const refreshed = await refreshToken();
    setIsAuthenticatedState(refreshed); // Update state based on refresh result
    return refreshed;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: isAuthenticatedState,
        isLoading,
        login,
        logout: logoutHandler,
        refreshToken: refreshTokenHandler,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};