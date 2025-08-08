export type UserRole = "admin" | "engineer" | "reporter";
export type UserStatus = "active" | "inactive";

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthData {
  userID: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface PasswordResetToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}
