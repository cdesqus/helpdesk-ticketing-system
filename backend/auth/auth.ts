import { api, APIError, Gateway } from "encore.dev/api";
import { Header, Cookie } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { authDB } from "./db";
import type { AuthData, UserRole, UserStatus } from "./types";

interface AuthParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"session">;
}

const auth = authHandler<AuthParams, AuthData>(
  async (data) => {

    // Extract token from authorization header or session cookie
    const token = data.authorization?.replace("Bearer ", "") ?? data.session?.value;
    
    if (!token) {
      throw APIError.unauthenticated("missing authentication token");
    }

    try {
      
      // Check session in database
      const session = await authDB.queryRow<{
        token: string;
        user_id: number;
        username: string;
        role: UserRole;
        created_at: Date;
        expires_at: Date;
        last_accessed: Date;
      }>`SELECT * FROM user_sessions WHERE token = ${token}`;

      if (!session) {
        throw APIError.unauthenticated("invalid or expired session");
      }
      
      const now = new Date();
      
      if (now > session.expires_at) {
        await authDB.exec`DELETE FROM user_sessions WHERE token = ${token}`;
        throw APIError.unauthenticated("session expired");
      }

      // Update last accessed time
      await authDB.exec`UPDATE user_sessions SET last_accessed = ${now} WHERE token = ${token}`;

      if (session.user_id === 1 && session.username === "admin") {
        return {
          userID: "1",
          username: "admin",
          email: "admin@idesolusi.co.id",
          fullName: "System Administrator",
          role: "admin",
        };
      }

      if (session.user_id === 2 && session.username === "haryanto") {
        return {
          userID: "2",
          username: "haryanto",
          email: "haryanto@idesolusi.co.id",
          fullName: "Haryanto",
          role: "admin",
        };
      }

      try {
        const user = await authDB.queryRow<{
          id: number;
          username: string;
          email: string;
          full_name: string;
          role: UserRole;
          status: UserStatus;
        }>`SELECT id, username, email, full_name, role, status FROM users WHERE id = ${session.user_id}`;

        if (!user) {
          return {
            userID: session.user_id.toString(),
            username: session.username,
            email: `${session.username}@idesolusi.co.id`,
            fullName: session.username,
            role: session.role,
          };
        }

        if (user.status !== "active") {
          throw APIError.unauthenticated("user account is inactive");
        }

        return {
          userID: user.id.toString(),
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        };
      } catch (dbError) {
        console.error("Auth handler: Database error:", dbError);
        return {
          userID: session.user_id.toString(),
          username: session.username,
          email: `${session.username}@idesolusi.co.id`,
          fullName: session.username,
          role: session.role,
        };
      }
    } catch (err) {
      if (err instanceof APIError) {
        throw err;
      }
      console.error("Auth handler: Unexpected error:", err);
      throw APIError.unauthenticated("authentication failed");
    }
  }
);

export { auth };
export const gw = new Gateway({ authHandler: auth });
