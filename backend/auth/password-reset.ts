import { api, APIError } from "encore.dev/api";
import { authDB } from "./db";
import type { PasswordResetToken } from "./types";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

// Initiates password reset process.
export const forgotPassword = api<ForgotPasswordRequest, ForgotPasswordResponse>(
  { expose: true, method: "POST", path: "/auth/forgot-password" },
  async (req) => {
    const user = await authDB.queryRow<{
      id: number;
      email: string;
      full_name: string;
    }>`SELECT id, email, full_name FROM users WHERE email = ${req.email} AND status = 'active'`;

    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: "If the email exists, a password reset link has been sent." };
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Invalidate any existing tokens for this user
    await authDB.exec`UPDATE password_reset_tokens SET used = true WHERE user_id = ${user.id}`;

    // Create new reset token
    await authDB.exec`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt})
    `;

    // In a real implementation, you would send an email here
    console.log(`Password reset token for ${user.email}: ${token}`);
    console.log(`Reset link: http://localhost:3000/reset-password?token=${token}`);

    return { message: "If the email exists, a password reset link has been sent." };
  }
);

// Resets password using token.
export const resetPassword = api<ResetPasswordRequest, ForgotPasswordResponse>(
  { expose: true, method: "POST", path: "/auth/reset-password" },
  async (req) => {
    const resetToken = await authDB.queryRow<{
      id: number;
      user_id: number;
      expires_at: Date;
      used: boolean;
    }>`
      SELECT id, user_id, expires_at, used 
      FROM password_reset_tokens 
      WHERE token = ${req.token}
    `;

    if (!resetToken) {
      throw APIError.invalidArgument("invalid or expired reset token");
    }

    if (resetToken.used) {
      throw APIError.invalidArgument("reset token has already been used");
    }

    if (new Date() > resetToken.expires_at) {
      throw APIError.invalidArgument("reset token has expired");
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(req.newPassword, 10);
    const now = new Date();

    // Update user password
    await authDB.exec`
      UPDATE users 
      SET password_hash = ${passwordHash}, updated_at = ${now}
      WHERE id = ${resetToken.user_id}
    `;

    // Mark token as used
    await authDB.exec`
      UPDATE password_reset_tokens 
      SET used = true 
      WHERE id = ${resetToken.id}
    `;

    return { message: "Password has been reset successfully." };
  }
);
