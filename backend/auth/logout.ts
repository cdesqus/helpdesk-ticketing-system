import { api } from "encore.dev/api";
import { Header, Cookie } from "encore.dev/api";
import { removeSession } from "./login";

export interface LogoutRequest {
  token?: string;
}

export interface LogoutResponse {
  message: string;
}

interface LogoutParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"session">;
}

// Logs out a user by invalidating their session.
export const logout = api<LogoutParams & LogoutRequest, LogoutResponse>(
  { expose: true, method: "POST", path: "/auth/logout" },
  async (req) => {
    // Get token from multiple sources
    const token = req.token || 
                  req.authorization?.replace("Bearer ", "") || 
                  req.session?.value;
    
    if (token) {
      // Remove the session from storage
      removeSession(token);
      console.log(`User logged out, token: ${token.substring(0, 8)}...`);
    } else {
      console.log("Logout called without token");
    }
    
    return {
      message: "Successfully logged out"
    };
  }
);
