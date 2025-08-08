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

    return { users };
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

    const passwordHash = await bcrypt.hash(req.newPassword, 10);
    const now = new Date();

    const result = await authDB.exec`
      UPDATE users SET password_hash = ${passwordHash}, updated_at = ${now}
      WHERE id = ${req.id}
    `;
  }
);

// Gets current user info.
export const getCurrentUser = api<void, User>(
  { auth: true, expose: true, method: "GET", path: "/auth/me" },
  async () => {
    const auth = getAuthData()!;
    
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
  }
);
