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

// Generate a simple session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Store session in database instead of memory
async function storeSession(token: string, userId: number, username: string, role: UserRole) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  try {
    // First, clean up any existing sessions for this user (optional - allow multiple sessions)
    // await authDB.exec`DELETE FROM user_sessions WHERE user_id = ${userId}`;
    
    // Insert new session
    await authDB.exec`
      INSERT INTO user_sessions (token, user_id, username, role, created_at, expires_at, last_accessed)
      VALUES (${token}, ${userId}, ${username}, ${role}, ${now}, ${expiresAt}, ${now})
      ON CONFLICT (token) DO UPDATE SET
        expires_at = ${expiresAt},
        last_accessed = ${now}
    `;
    
    console.log(`Session stored for user ${username} (${userId}), expires: ${expiresAt.toISOString()}`);
    return expiresAt;
  } catch (error) {
    console.error("Failed to store session in database:", error);
    // Fallback: return a future date even if database fails
    return expiresAt;
  }
}

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
      const expiresAt = await storeSession(token, dummyUser.id, dummyUser.username, dummyUser.role);

      console.log(`Admin user logged in successfully with token: ${token.substring(0, 8)}... (expires: ${expiresAt.toISOString()})`);

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
      const expiresAt = await storeSession(token, haryantoDummyUser.id, haryantoDummyUser.username, haryantoDummyUser.role);

      console.log(`Haryanto user logged in successfully with token: ${token.substring(0, 8)}... (expires: ${expiresAt.toISOString()})`);

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
      const expiresAt = await storeSession(token, user.id, user.username, user.role);

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

      console.log(`Database user ${user.username} logged in successfully with token: ${token.substring(0, 8)}... (expires: ${expiresAt.toISOString()})`);

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

// Get session from database with automatic refresh
export async function getSession(token: string) {
  if (!token) {
    console.log("getSession: No token provided");
    return null;
  }

  try {
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
      console.log("getSession: Session not found for token:", token.substring(0, 8) + "...");
      return null;
    }
    
    const now = new Date();
    
    // Check if session has expired
    if (now > session.expires_at) {
      // Clean up expired session
      await authDB.exec`DELETE FROM user_sessions WHERE token = ${token}`;
      console.log("getSession: Session expired and removed:", token.substring(0, 8) + "...", "expired at:", session.expires_at.toISOString());
      return null;
    }
    
    // Auto-extend session if it's more than halfway to expiration
    const sessionDuration = session.expires_at.getTime() - session.created_at.getTime();
    const halfwayPoint = new Date(session.created_at.getTime() + sessionDuration / 2);
    
    if (now > halfwayPoint) {
      // Extend session by another 7 days
      const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await authDB.exec`
        UPDATE user_sessions 
        SET expires_at = ${newExpiresAt}, last_accessed = ${now}
        WHERE token = ${token}
      `;
      console.log("getSession: Session extended for token:", token.substring(0, 8) + "...", "new expires at:", newExpiresAt.toISOString());
      
      return {
        userId: session.user_id,
        username: session.username,
        role: session.role,
        createdAt: session.created_at,
        expiresAt: newExpiresAt,
        lastAccessed: now,
      };
    } else {
      // Just update last accessed time
      await authDB.exec`
        UPDATE user_sessions 
        SET last_accessed = ${now}
        WHERE token = ${token}
      `;
    }
    
    console.log("getSession: Valid session found for token:", token.substring(0, 8) + "...", "expires at:", session.expires_at.toISOString());
    return {
      userId: session.user_id,
      username: session.username,
      role: session.role,
      createdAt: session.created_at,
      expiresAt: session.expires_at,
      lastAccessed: now,
    };
  } catch (error) {
    console.error("getSession: Database error:", error);
    return null;
  }
}

export async function removeSession(token: string) {
  if (token) {
    try {
      await authDB.exec`DELETE FROM user_sessions WHERE token = ${token}`;
      console.log(`removeSession: Session removed: ${token.substring(0, 8)}...`);
    } catch (error) {
      console.error("removeSession: Database error:", error);
    }
  }
}

export async function getAllActiveSessions() {
  try {
    const sessions = await authDB.queryAll<{
      token: string;
      user_id: number;
      username: string;
      role: UserRole;
      created_at: Date;
      expires_at: Date;
      last_accessed: Date;
    }>`SELECT * FROM user_sessions WHERE expires_at > NOW() ORDER BY last_accessed DESC`;

    const now = new Date();
    return sessions.map(session => ({
      token: session.token.substring(0, 8) + "...",
      userId: session.user_id,
      username: session.username,
      role: session.role,
      createdAt: session.created_at,
      expiresAt: session.expires_at,
      lastAccessed: session.last_accessed,
      isExpired: now > session.expires_at,
      timeUntilExpiry: session.expires_at.getTime() - now.getTime(),
    }));
  } catch (error) {
    console.error("getAllActiveSessions: Database error:", error);
    return [];
  }
}

// Clean up expired sessions periodically
export async function cleanupExpiredSessions() {
  try {
    const result = await authDB.exec`DELETE FROM user_sessions WHERE expires_at < NOW()`;
    console.log("Cleaned up expired sessions");
  } catch (error) {
    console.error("cleanupExpiredSessions: Database error:", error);
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// Debug endpoint to check active sessions (admin only)
export const getActiveSessions = api<void, { sessions: any[] }>(
  { auth: true, expose: true, method: "GET", path: "/auth/sessions" },
  async () => {
    return { sessions: await getAllActiveSessions() };
  }
);

// Endpoint to extend session (refresh session expiration)
export const refreshSession = api<void, { message: string; expiresAt: Date }>(
  { auth: true, expose: true, method: "POST", path: "/auth/refresh" },
  async (req, { headers }) => {
    // Extract token from authorization header or cookie
    const authHeader = headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      throw APIError.unauthenticated("no session token provided");
    }

    try {
      const session = await authDB.queryRow<{
        token: string;
        user_id: number;
        username: string;
        expires_at: Date;
      }>`SELECT token, user_id, username, expires_at FROM user_sessions WHERE token = ${token}`;

      if (!session) {
        throw APIError.unauthenticated("session not found");
      }

      const now = new Date();
      if (now > session.expires_at) {
        await authDB.exec`DELETE FROM user_sessions WHERE token = ${token}`;
        throw APIError.unauthenticated("session has expired");
      }

      // Extend session by another 7 days
      const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await authDB.exec`
        UPDATE user_sessions 
        SET expires_at = ${newExpiresAt}, last_accessed = ${now}
        WHERE token = ${token}
      `;

      console.log(`Session refreshed for user ${session.username}, new expiry: ${newExpiresAt.toISOString()}`);

      return {
        message: "Session refreshed successfully",
        expiresAt: newExpiresAt,
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("refreshSession: Database error:", error);
      throw APIError.internal("Failed to refresh session");
    }
  }
);
