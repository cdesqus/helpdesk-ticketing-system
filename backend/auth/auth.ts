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
    console.log("Auth handler called with data:", {
      hasAuthorization: !!data.authorization,
      hasSession: !!data.session,
      authorizationPrefix: data.authorization?.substring(0, 20) + "...",
      sessionPrefix: data.session?.value?.substring(0, 8) + "...",
    });

    // Extract token from authorization header or session cookie
    const token = data.authorization?.replace("Bearer ", "") ?? data.session?.value;
    
    if (!token) {
      console.log("Auth handler: No authentication token provided");
      throw APIError.unauthenticated("missing authentication token");
    }

    try {
      console.log("Auth handler: Checking session for token:", token.substring(0, 8) + "...");
      
      // Check session storage first - AWAIT the async function
      const session = await getSession(token);
      if (!session) {
        console.log("Auth handler: Session not found or expired for token:", token.substring(0, 8) + "...");
        throw APIError.unauthenticated("invalid or expired session");
      }

      console.log("Auth handler: Session found for user:", session.username, "role:", session.role, "expires:", session.expiresAt.toISOString());

      // Always return the session data for dummy users (don't check database)
      if (session.userId === 1 && session.username === "admin") {
        console.log("Auth handler: Returning dummy admin user");
        return {
          userID: "1",
          username: "admin",
          email: "admin@idesolusi.co.id",
          fullName: "System Administrator",
          role: "admin",
        };
      }

      if (session.userId === 2 && session.username === "haryanto") {
        console.log("Auth handler: Returning dummy haryanto user");
        return {
          userID: "2",
          username: "haryanto",
          email: "haryanto@idesolusi.co.id",
          fullName: "Haryanto",
          role: "admin",
        };
      }

      // For other users, try database lookup but don't fail if database is unavailable
      try {
        console.log("Auth handler: Looking up user in database for session user ID:", session.userId);
        const user = await authDB.queryRow<{
          id: number;
          username: string;
          email: string;
          full_name: string;
          role: UserRole;
          status: UserStatus;
        }>`SELECT id, username, email, full_name, role, status FROM users WHERE id = ${session.userId}`;

        if (!user) {
          console.log("Auth handler: User not found in database for session user ID:", session.userId);
          // Don't fail, use session data
          return {
            userID: session.userId.toString(),
            username: session.username,
            email: `${session.username}@idesolusi.co.id`,
            fullName: session.username,
            role: session.role,
          };
        }

        if (user.status !== "active") {
          console.log("Auth handler: User account is inactive:", user.username);
          throw APIError.unauthenticated("user account is inactive");
        }

        console.log("Auth handler: Database user authenticated:", user.username, "role:", user.role);

        return {
          userID: user.id.toString(),
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        };
      } catch (dbError) {
        console.error("Auth handler: Database error:", dbError);
        
        // If database fails, use session data as fallback
        console.log("Auth handler: Database failed, using session data as fallback");
        return {
          userID: session.userId.toString(),
          username: session.username,
          email: `${session.username}@idesolusi.co.id`,
          fullName: session.username,
          role: session.role,
        };
      }
    } catch (err) {
      if (err instanceof APIError) {
        console.log("Auth handler: APIError thrown:", err.message);
        throw err;
      }
      console.error("Auth handler: Unexpected error:", err);
      throw APIError.unauthenticated("authentication failed");
    }
  }
);

export { auth };
export const gw = new Gateway({ authHandler: auth });
