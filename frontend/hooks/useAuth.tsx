import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import backend from "~backend/client";
import type { User } from "~backend/auth/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = async () => {
    const storedToken = localStorage.getItem("auth_token");
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      // Verify the token is still valid by fetching current user
      const authenticatedBackend = backend.with({
        auth: () => Promise.resolve({ authorization: `Bearer ${storedToken}` })
      });
      
      const currentUser = await authenticatedBackend.auth.getCurrentUser();
      setUser(currentUser);
      setToken(storedToken);
      console.log("Auth refreshed successfully for user:", currentUser.username);
    } catch (error) {
      console.error("Auth refresh failed:", error);
      // Clear invalid session
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check for existing session on app load
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");
    
    console.log("Checking stored auth data:", { hasToken: !!storedToken, hasUser: !!storedUser });
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        console.log("Restored session for user:", parsedUser.username);
        
        // Don't verify immediately on load to avoid 401 errors
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      console.log("Attempting login for user:", username);
      const response = await backend.auth.login({ username, password });
      
      console.log("Login response received:", { 
        user: response.user.username, 
        hasToken: !!response.token 
      });
      
      setUser(response.user);
      setToken(response.token);
      
      localStorage.setItem("auth_token", response.token);
      localStorage.setItem("auth_user", JSON.stringify(response.user));
      
      console.log("Login successful for user:", response.user.username);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        console.log("Logging out user...");
        // Call logout endpoint to invalidate session on server
        const authenticatedBackend = backend.with({
          auth: () => Promise.resolve({ authorization: `Bearer ${token}` })
        });
        await authenticatedBackend.auth.logout({ token });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local state regardless of server response
      console.log("Clearing local session data");
      setUser(null);
      setToken(null);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
  };

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user && !!token,
    refreshAuth,
  };

  console.log("Auth context value:", { 
    hasUser: !!user, 
    hasToken: !!token, 
    isLoading, 
    isAuthenticated: value.isAuthenticated,
    username: user?.username,
    role: user?.role
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Returns the authenticated backend client
export function useBackend() {
  const { token, user } = useAuth();
  
  console.log("useBackend called:", { hasToken: !!token, username: user?.username });
  
  if (!token) {
    console.log("No token available, returning unauthenticated backend client");
    return backend;
  }
  
  const authenticatedBackend = backend.with({
    auth: () => {
      console.log("Using auth token for request:", token.substring(0, 8) + "...");
      return Promise.resolve({ authorization: `Bearer ${token}` });
    }
  });
  
  console.log("Returning authenticated backend client");
  return authenticatedBackend;
}
