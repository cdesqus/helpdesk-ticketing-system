import { api, APIError, Gateway } from "encore.dev/api";
import { Header, Cookie } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import { authDB } from "./db";
import type { AuthData, UserRole, UserStatus } from "./types";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

const jwtSecret = secret("JWTSecret");

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
      const payload = jwt.verify(token, jwtSecret()) as any;
      
      // Check if this is the dummy admin user
      if (payload.userId === 1 && payload.username === "admin") {
        return {
          userID: "1",
          username: "admin",
          email: "admin@idesolusi.co.id",
          fullName: "System Administrator",
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
        }>`SELECT id, username, email, full_name, role, status FROM users WHERE id = ${payload.userId}`;

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
        // If database fails but token is valid, allow dummy admin
        if (payload.username === "admin") {
          return {
            userID: "1",
            username: "admin",
            email: "admin@idesolusi.co.id",
            fullName: "System Administrator",
            role: "admin",
          };
        }
        throw APIError.unauthenticated("user not found");
      }
    } catch (err) {
      throw APIError.unauthenticated("invalid token", err);
    }
  }
);

export const gw = new Gateway({ authHandler: auth });
