"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getAuthHeaders, isAuthenticated, refreshToken, logout } from "@/lib/auth";

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
      const response = await fetch("/api/auth/login", {
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

      // Store tokens
      localStorage.setItem(
        "auth_data",
        JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at:
            Math.floor(Date.now() / 1000) + data.expires_in,
          email: email, // Store email for user info
          restaurant_id: data.restaurant_id || "1", // Store restaurant ID
        })
      );

      setIsAuthenticatedState(true);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutHandler = () => {
    logout();
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