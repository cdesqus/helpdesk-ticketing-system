import { api, APIError, Gateway } from "encore.dev/api";
import { Header, Cookie } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { authDB } from "./db";
import type { AuthData, UserRole, UserStatus } from "./types";
import { getSession } from "./login";

interface AuthParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"session">;
}

const auth = authHandler<AuthParams, AuthData>(
  async (data) => {
    // Extract token from authorization header or session cookie
    const token = data.authorization?.replace("Bearer ", "") ?? data.session?.value;
    
    if (!token) {
      console.log("No authentication token provided");
      throw APIError.unauthenticated("missing authentication token");
    }

    try {
      console.log("Checking session for token:", token.substring(0, 8) + "...");
      
      // Check session storage first
      const session = getSession(token);
      if (!session) {
        console.log("Session not found or expired for token:", token.substring(0, 8) + "...");
        throw APIError.unauthenticated("invalid or expired session");
      }

      console.log("Session found for user:", session.username, "role:", session.role);

      // Check if this is the dummy admin user
      if (session.userId === 1 && session.username === "admin") {
        return {
          userID: "1",
          username: "admin",
          email: "admin@idesolusi.co.id",
          fullName: "System Administrator",
          role: "admin",
        };
      }

      // Check if this is the dummy haryanto user
      if (session.userId === 2 && session.username === "haryanto") {
        return {
          userID: "2",
          username: "haryanto",
          email: "haryanto@idesolusi.co.id",
          fullName: "Haryanto",
          role: "admin",
        };
      }

      // Try database lookup for other users
      try {
        const user = await authDB.queryRow<{
          id: number;
          username: string;
          email: string;
          full_name: string;
          role: UserRole;
          status: UserStatus;
        }>`SELECT id, username, email, full_name, role, status FROM users WHERE id = ${session.userId}`;

        if (!user) {
          console.log("User not found in database for session user ID:", session.userId);
          throw APIError.unauthenticated("user not found");
        }

        if (user.status !== "active") {
          console.log("User account is inactive:", user.username);
          throw APIError.unauthenticated("user account is inactive");
        }

        console.log("Database user authenticated:", user.username, "role:", user.role);

        return {
          userID: user.id.toString(),
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        };
      } catch (dbError) {
        console.error("Database error in auth handler:", dbError);
        
        // If database fails but session is valid, allow dummy users
        if (session.username === "admin") {
          console.log("Database failed, falling back to dummy admin user");
          return {
            userID: "1",
            username: "admin",
            email: "admin@idesolusi.co.id",
            fullName: "System Administrator",
            role: "admin",
          };
        }
        if (session.username === "haryanto") {
          console.log("Database failed, falling back to dummy haryanto user");
          return {
            userID: "2",
            username: "haryanto",
            email: "haryanto@idesolusi.co.id",
            fullName: "Haryanto",
            role: "admin",
          };
        }
        
        // For other users, if database is unavailable, we can't validate
        console.log("Database unavailable and not a dummy user, rejecting authentication");
        throw APIError.unauthenticated("authentication service temporarily unavailable");
      }
    } catch (err) {
      if (err instanceof APIError) {
        throw err;
      }
      console.error("Auth handler error:", err);
      throw APIError.unauthenticated("authentication failed");
    }
  }
);

export const gw = new Gateway({ authHandler: auth });
