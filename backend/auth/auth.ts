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
    const token = data.authorization?.replace("Bearer ", "") ?? data.session?.value;
    if (!token) {
      throw APIError.unauthenticated("missing token");
    }

    try {
      // Check session storage first
      const session = getSession(token);
      if (session) {
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

          if (!user || user.status !== "active") {
            throw APIError.unauthenticated("user not found or inactive");
          }

          return {
            userID: user.id.toString(),
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
          };
        } catch (dbError) {
          // If database fails but session is valid, allow dummy users
          if (session.username === "admin") {
            return {
              userID: "1",
              username: "admin",
              email: "admin@idesolusi.co.id",
              fullName: "System Administrator",
              role: "admin",
            };
          }
          if (session.username === "haryanto") {
            return {
              userID: "2",
              username: "haryanto",
              email: "haryanto@idesolusi.co.id",
              fullName: "Haryanto",
              role: "admin",
            };
          }
          throw APIError.unauthenticated("user not found");
        }
      }

      throw APIError.unauthenticated("invalid session");
    } catch (err) {
      throw APIError.unauthenticated("invalid token", err);
    }
  }
);

export const gw = new Gateway({ authHandler: auth });
