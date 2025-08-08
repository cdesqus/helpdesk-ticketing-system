import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { authDB } from "./db";
import type { User, UserRole, UserStatus } from "./types";
import * as bcrypt from "bcrypt";

export interface CreateUserRequest {
  username: string;
  password: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  id: number;
  username?: string;
  email?: string;
  fullName?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface ChangePasswordRequest {
  id: number;
  newPassword: string;
}

export interface DeleteUserRequest {
  id: number;
}

export interface ListUsersResponse {
  users: User[];
}

// Creates a new user (admin only).
export const createUser = api<CreateUserRequest, User>(
  { auth: true, expose: true, method: "POST", path: "/auth/users" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can create users");
    }

    try {
      // Check if username or email already exists
      const existingUser = await authDB.queryRow`
        SELECT id FROM users WHERE username = ${req.username} OR email = ${req.email}
      `;
      if (existingUser) {
        throw APIError.alreadyExists("username or email already exists");
      }

      const passwordHash = await bcrypt.hash(req.password, 10);
      const now = new Date();

      const row = await authDB.queryRow<{
        id: number;
        username: string;
        email: string;
        full_name: string;
        role: UserRole;
        status: UserStatus;
        created_at: Date;
        updated_at: Date;
      }>`
        INSERT INTO users (username, password_hash, email, full_name, role, created_at, updated_at)
        VALUES (${req.username}, ${passwordHash}, ${req.email}, ${req.fullName}, ${req.role}, ${now}, ${now})
        RETURNING id, username, email, full_name, role, status, created_at, updated_at
      `;

      if (!row) {
        throw new Error("Failed to create user");
      }

      return {
        id: row.id,
        username: row.username,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (dbError) {
      console.error("Database error in createUser:", dbError);
      throw APIError.internal("database error - user creation temporarily unavailable");
    }
  }
);

// Lists all users (admin only).
export const listUsers = api<void, ListUsersResponse>(
  { auth: true, expose: true, method: "GET", path: "/auth/users" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can list users");
    }

    try {
      const rows = await authDB.queryAll<{
        id: number;
        username: string;
        email: string;
        full_name: string;
        role: UserRole;
        status: UserStatus;
        created_at: Date;
        updated_at: Date;
      }>`SELECT id, username, email, full_name, role, status, created_at, updated_at FROM users ORDER BY created_at DESC`;

      const users: User[] = rows.map(row => ({
        id: row.id,
        username: row.username,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Add dummy users if database is empty or not accessible
      if (users.length === 0 || !users.find(u => u.username === "admin")) {
        users.unshift({
          id: 1,
          username: "admin",
          email: "admin@idesolusi.co.id",
          fullName: "System Administrator",
          role: "admin",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      if (!users.find(u => u.username === "haryanto")) {
        users.unshift({
          id: 2,
          username: "haryanto",
          email: "haryanto@idesolusi.co.id",
          fullName: "Haryanto",
          role: "admin",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return { users };
    } catch (dbError) {
      console.error("Database error in listUsers:", dbError);
      // Return dummy users if database fails
      return {
        users: [
          {
            id: 1,
            username: "admin",
            email: "admin@idesolusi.co.id",
            fullName: "System Administrator",
            role: "admin",
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 2,
            username: "haryanto",
            email: "haryanto@idesolusi.co.id",
            fullName: "Haryanto",
            role: "admin",
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ]
      };
    }
  }
);

// Updates a user (admin only).
export const updateUser = api<UpdateUserRequest, User>(
  { auth: true, expose: true, method: "PUT", path: "/auth/users/:id" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can update users");
    }

    // Don't allow updating the dummy admin users
    if (req.id === 1 || req.id === 2) {
      throw APIError.invalidArgument("cannot update system administrator");
    }

    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (req.username !== undefined) {
        // Check if username already exists for another user
        const existingUser = await authDB.queryRow`
          SELECT id FROM users WHERE username = ${req.username} AND id != ${req.id}
        `;
        if (existingUser) {
          throw APIError.alreadyExists("username already exists");
        }
        updates.push(`username = $${paramIndex}`);
        params.push(req.username);
        paramIndex++;
      }

      if (req.email !== undefined) {
        // Check if email already exists for another user
        const existingUser = await authDB.queryRow`
          SELECT id FROM users WHERE email = ${req.email} AND id != ${req.id}
        `;
        if (existingUser) {
          throw APIError.alreadyExists("email already exists");
        }
        updates.push(`email = $${paramIndex}`);
        params.push(req.email);
        paramIndex++;
      }

      if (req.fullName !== undefined) {
        updates.push(`full_name = $${paramIndex}`);
        params.push(req.fullName);
        paramIndex++;
      }

      if (req.role !== undefined) {
        updates.push(`role = $${paramIndex}`);
        params.push(req.role);
        paramIndex++;
      }

      if (req.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        params.push(req.status);
        paramIndex++;
      }

      updates.push(`updated_at = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;

      const query = `
        UPDATE users SET ${updates.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING id, username, email, full_name, role, status, created_at, updated_at
      `;
      params.push(req.id);

      const row = await authDB.rawQueryRow<{
        id: number;
        username: string;
        email: string;
        full_name: string;
        role: UserRole;
        status: UserStatus;
        created_at: Date;
        updated_at: Date;
      }>(query, ...params);

      if (!row) {
        throw APIError.notFound("user not found");
      }

      return {
        id: row.id,
        username: row.username,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (dbError) {
      console.error("Database error in updateUser:", dbError);
      throw APIError.internal("database error - user update temporarily unavailable");
    }
  }
);

// Changes a user's password (admin only).
export const changePassword = api<ChangePasswordRequest, void>(
  { auth: true, expose: true, method: "POST", path: "/auth/users/:id/password" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can change passwords");
    }

    // Don't allow changing dummy admin passwords
    if (req.id === 1 || req.id === 2) {
      throw APIError.invalidArgument("cannot change system administrator password");
    }

    try {
      const passwordHash = await bcrypt.hash(req.newPassword, 10);
      const now = new Date();

      const result = await authDB.exec`
        UPDATE users SET password_hash = ${passwordHash}, updated_at = ${now}
        WHERE id = ${req.id}
      `;
    } catch (dbError) {
      console.error("Database error in changePassword:", dbError);
      throw APIError.internal("database error - password change temporarily unavailable");
    }
  }
);

// Deletes a user (admin only).
export const deleteUser = api<DeleteUserRequest, void>(
  { auth: true, expose: true, method: "DELETE", path: "/auth/users/:id" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can delete users");
    }

    // Don't allow deleting the dummy admin users
    if (req.id === 1 || req.id === 2) {
      throw APIError.invalidArgument("cannot delete system administrator");
    }

    // Don't allow deleting yourself
    if (req.id.toString() === auth.userID) {
      throw APIError.invalidArgument("cannot delete your own account");
    }

    try {
      // Check if user exists
      const existingUser = await authDB.queryRow<{
        id: number;
        username: string;
      }>`SELECT id, username FROM users WHERE id = ${req.id}`;

      if (!existingUser) {
        throw APIError.notFound("user not found");
      }

      // Delete the user
      await authDB.exec`DELETE FROM users WHERE id = ${req.id}`;

      console.log(`User ${existingUser.username} (ID: ${req.id}) deleted by admin ${auth.username}`);
    } catch (dbError) {
      console.error("Database error in deleteUser:", dbError);
      throw APIError.internal("database error - user deletion temporarily unavailable");
    }
  }
);

// Gets current user info.
export const getCurrentUser = api<void, User>(
  { auth: true, expose: true, method: "GET", path: "/auth/me" },
  async () => {
    const auth = getAuthData()!;
    
    // Return dummy admin user if it's the system admin
    if (auth.userID === "1" && auth.username === "admin") {
      return {
        id: 1,
        username: "admin",
        email: "admin@idesolusi.co.id",
        fullName: "System Administrator",
        role: "admin",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Return dummy haryanto user
    if (auth.userID === "2" && auth.username === "haryanto") {
      return {
        id: 2,
        username: "haryanto",
        email: "haryanto@idesolusi.co.id",
        fullName: "Haryanto",
        role: "admin",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    try {
      const row = await authDB.queryRow<{
        id: number;
        username: string;
        email: string;
        full_name: string;
        role: UserRole;
        status: UserStatus;
        created_at: Date;
        updated_at: Date;
      }>`SELECT id, username, email, full_name, role, status, created_at, updated_at FROM users WHERE id = ${parseInt(auth.userID)}`;

      if (!row) {
        throw APIError.notFound("user not found");
      }

      return {
        id: row.id,
        username: row.username,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (dbError) {
      console.error("Database error in getCurrentUser:", dbError);
      // Fallback to auth data if database fails
      return {
        id: parseInt(auth.userID),
        username: auth.username,
        email: auth.email,
        fullName: auth.fullName,
        role: auth.role,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }
);
