import { api, APIError } from "encore.dev/api";
import { Cookie } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { authDB } from "./db";
import type { User, LoginResponse, UserRole, UserStatus } from "./types";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

const jwtSecret = secret("JWTSecret");

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponseWithCookie {
  user: User;
  token: string;
  session: Cookie<"session">;
}

// Authenticates a user with username and password.
export const login = api<LoginRequest, LoginResponseWithCookie>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    // Temporary dummy admin login
    if (req.username === "admin" && req.password === "admin123") {
      const dummyUser: User = {
        id: 1,
        username: "admin",
        email: "admin@idesolusi.co.id",
        fullName: "System Administrator",
        role: "admin",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = jwt.sign(
        { userId: dummyUser.id, username: dummyUser.username, role: dummyUser.role },
        jwtSecret(),
        { expiresIn: "24h" }
      );

      return {
        user: dummyUser,
        token,
        session: {
          value: token,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
      };
    }

    // Try database authentication as fallback
    try {
      const user = await authDB.queryRow<{
        id: number;
        username: string;
        password_hash: string;
        email: string;
        full_name: string;
        role: UserRole;
        status: UserStatus;
        created_at: Date;
        updated_at: Date;
      }>`SELECT * FROM users WHERE username = ${req.username}`;

      if (!user) {
        throw APIError.unauthenticated("invalid username or password");
      }

      if (user.status !== "active") {
        throw APIError.unauthenticated("account is inactive");
      }

      const isValidPassword = await bcrypt.compare(req.password, user.password_hash);
      if (!isValidPassword) {
        throw APIError.unauthenticated("invalid username or password");
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        jwtSecret(),
        { expiresIn: "24h" }
      );

      const userResponse: User = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };

      return {
        user: userResponse,
        token,
        session: {
          value: token,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
      };
    } catch (dbError) {
      // If database fails, still allow dummy admin login
      console.log("Database authentication failed, using dummy admin only");
      throw APIError.unauthenticated("invalid username or password");
    }
  }
);
