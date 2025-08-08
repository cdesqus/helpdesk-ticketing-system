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

  // Auto-refresh session every 30 minutes
  useEffect(() => {
    if (token) {
      const refreshInterval = setInterval(async () => {
        try {
          console.log("Auto-refreshing session...");
          const authenticatedBackend = backend.with({
            auth: () => Promise.resolve({ authorization: `Bearer ${token}` })
          });
          
          await authenticatedBackend.auth.refreshSession();
          console.log("Session auto-refreshed successfully");
        } catch (error) {
          console.error("Auto-refresh failed:", error);
          // If refresh fails, try to get current user to check if session is still valid
          try {
            const currentUser = await authenticatedBackend.auth.getCurrentUser();
            console.log("Session still valid for user:", currentUser.username);
          } catch (userError) {
            console.error("Session invalid, logging out:", userError);
            logout();
          }
        }
      }, 30 * 60 * 1000); // 30 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [token]);

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
        
        // Verify session is still valid in the background
        setTimeout(() => {
          refreshAuth();
        }, 1000);
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

// Returns the authenticated backend client with automatic retry on 401
export function useBackend() {
  const { token, user, logout } = useAuth();
  
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

  // Create a proxy to handle 401 errors automatically
  const backendProxy = new Proxy(authenticatedBackend, {
    get(target, prop) {
      const originalMethod = target[prop];
      
      if (typeof originalMethod === 'object' && originalMethod !== null) {
        // Handle nested objects (like ticket.list, auth.getCurrentUser, etc.)
        return new Proxy(originalMethod, {
          get(nestedTarget, nestedProp) {
            const nestedMethod = nestedTarget[nestedProp];
            
            if (typeof nestedMethod === 'function') {
              return async (...args: any[]) => {
                try {
                  return await nestedMethod.apply(nestedTarget, args);
                } catch (error: any) {
                  if (error?.status === 401) {
                    console.error("401 Unauthorized - Session expired, logging out");
                    logout();
                    throw new Error("Session expired. Please log in again.");
                  }
                  throw error;
                }
              };
            }
            
            return nestedMethod;
          }
        });
      }
      
      if (typeof originalMethod === 'function') {
        return async (...args: any[]) => {
          try {
            return await originalMethod.apply(target, args);
          } catch (error: any) {
            if (error?.status === 401) {
              console.error("401 Unauthorized - Session expired, logging out");
              logout();
              throw new Error("Session expired. Please log in again.");
            }
            throw error;
          }
        };
      }
      
      return originalMethod;
    }
  });
  
  console.log("Returning authenticated backend client with auto-logout on 401");
  return backendProxy;
}
