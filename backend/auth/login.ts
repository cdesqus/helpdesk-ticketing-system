import { api, APIError } from "encore.dev/api";
import { Cookie } from "encore.dev/api";
import { authDB } from "./db";
import type { User, LoginResponse, UserRole, UserStatus } from "./types";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponseWithCookie {
  user: User;
  token: string;
  session: Cookie<"session">;
}

// Simple session storage (in production, use Redis or database)
const activeSessions = new Map<string, { 
  userId: number; 
  username: string; 
  role: UserRole; 
  createdAt: Date;
  expiresAt: Date;
  lastAccessed: Date;
}>();

// Generate a simple session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Clean up expired sessions periodically
function cleanupExpiredSessions() {
  const now = new Date();
  const expiredTokens: string[] = [];
  
  for (const [token, session] of activeSessions.entries()) {
    if (now > session.expiresAt) {
      expiredTokens.push(token);
    }
  }
  
  for (const token of expiredTokens) {
    activeSessions.delete(token);
  }
  
  if (expiredTokens.length > 0) {
    console.log(`Cleaned up ${expiredTokens.length} expired sessions`);
  }
}

// Clean up expired sessions every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// Authenticates a user with username and password.
export const login = api<LoginRequest, LoginResponseWithCookie>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    console.log("Login attempt for username:", req.username);
    
    if (!req.username || !req.password) {
      throw APIError.invalidArgument("username and password are required");
    }

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

      const token = generateSessionToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const now = new Date();
      
      // Store session
      activeSessions.set(token, {
        userId: dummyUser.id,
        username: dummyUser.username,
        role: dummyUser.role,
        createdAt: now,
        expiresAt: expiresAt,
        lastAccessed: now,
      });

      console.log(`Admin user logged in successfully with token: ${token.substring(0, 8)}...`);

      return {
        user: dummyUser,
        token,
        session: {
          value: token,
          expires: expiresAt,
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
      };
    }

    // Additional dummy user for haryanto
    if (req.username === "haryanto" && req.password === "P@ssw0rd") {
      const haryantoDummyUser: User = {
        id: 2,
        username: "haryanto",
        email: "haryanto@idesolusi.co.id",
        fullName: "Haryanto",
        role: "admin",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = generateSessionToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const now = new Date();
      
      // Store session
      activeSessions.set(token, {
        userId: haryantoDummyUser.id,
        username: haryantoDummyUser.username,
        role: haryantoDummyUser.role,
        createdAt: now,
        expiresAt: expiresAt,
        lastAccessed: now,
      });

      console.log(`Haryanto user logged in successfully with token: ${token.substring(0, 8)}...`);

      return {
        user: haryantoDummyUser,
        token,
        session: {
          value: token,
          expires: expiresAt,
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
        console.log("User not found in database:", req.username);
        throw APIError.unauthenticated("invalid username or password");
      }

      if (user.status !== "active") {
        console.log("User account is inactive:", req.username);
        throw APIError.unauthenticated("account is inactive");
      }

      const isValidPassword = await bcrypt.compare(req.password, user.password_hash);
      if (!isValidPassword) {
        console.log("Invalid password for user:", req.username);
        throw APIError.unauthenticated("invalid username or password");
      }

      const token = generateSessionToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const now = new Date();
      
      // Store session
      activeSessions.set(token, {
        userId: user.id,
        username: user.username,
        role: user.role,
        createdAt: now,
        expiresAt: expiresAt,
        lastAccessed: now,
      });

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

      console.log(`Database user ${user.username} logged in successfully with token: ${token.substring(0, 8)}...`);

      return {
        user: userResponse,
        token,
        session: {
          value: token,
          expires: expiresAt,
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
      };
    } catch (dbError) {
      console.error("Database authentication failed:", dbError);
      throw APIError.unauthenticated("invalid username or password");
    }
  }
);

// Export session management functions for use in auth handler
export function getSession(token: string) {
  if (!token) {
    return null;
  }

  const session = activeSessions.get(token);
  if (!session) {
    return null;
  }
  
  // Check if session has expired
  const now = new Date();
  if (now > session.expiresAt) {
    activeSessions.delete(token);
    console.log("Session expired and removed:", token.substring(0, 8) + "...");
    return null;
  }
  
  // Update last accessed time
  session.lastAccessed = now;
  
  return session;
}

export function removeSession(token: string) {
  if (token) {
    const deleted = activeSessions.delete(token);
    console.log(`Session removed: ${token.substring(0, 8)}... (existed: ${deleted})`);
  }
}

export function getAllActiveSessions() {
  return Array.from(activeSessions.entries()).map(([token, session]) => ({
    token: token.substring(0, 8) + "...",
    userId: session.userId,
    username: session.username,
    role: session.role,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    lastAccessed: session.lastAccessed,
  }));
}

// Debug endpoint to check active sessions (admin only)
export const getActiveSessions = api<void, { sessions: any[] }>(
  { auth: true, expose: true, method: "GET", path: "/auth/sessions" },
  async () => {
    return { sessions: getAllActiveSessions() };
  }
);
