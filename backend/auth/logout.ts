import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { removeSession } from "./login";

export interface LogoutRequest {
  token: string;
}

export interface LogoutResponse {
  message: string;
}

// Logs out a user by invalidating their session.
export const logout = api<LogoutRequest, LogoutResponse>(
  { auth: true, expose: true, method: "POST", path: "/auth/logout" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Remove the session from storage
    removeSession(req.token);
    
    return {
      message: "Successfully logged out"
    };
  }
);
