import { api, APIError } from "encore.dev/api";
import { ticketDB } from "./db";
import type { SMTPConfig } from "./types";

export interface ConfigureSMTPRequest {
  provider: string;
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
}

// Configures SMTP settings for email notifications.
export const configureSMTP = api<ConfigureSMTPRequest, SMTPConfig>(
  { expose: true, method: "POST", path: "/smtp/configure" },
  async (req) => {
    // Delete existing configuration
    await ticketDB.exec`DELETE FROM smtp_config`;

    // Insert new configuration
    const row = await ticketDB.queryRow<{
      id: number;
      provider: string;
      host: string;
      port: number;
      username: string;
      password: string;
      from_email: string;
    }>`
      INSERT INTO smtp_config (provider, host, port, username, password, from_email)
      VALUES (${req.provider}, ${req.host}, ${req.port}, ${req.username}, ${req.password}, ${req.fromEmail})
      RETURNING *
    `;

    if (!row) {
      throw new Error("Failed to configure SMTP");
    }

    return {
      id: row.id,
      provider: row.provider,
      host: row.host,
      port: row.port,
      username: row.username,
      password: row.password,
      fromEmail: row.from_email,
    };
  }
);

export interface GetSMTPConfigResponse {
  config: SMTPConfig | null;
}

// Retrieves current SMTP configuration.
export const getSMTPConfig = api<void, GetSMTPConfigResponse>(
  { expose: true, method: "GET", path: "/smtp/config" },
  async () => {
    const row = await ticketDB.queryRow<{
      id: number;
      provider: string;
      host: string;
      port: number;
      username: string;
      password: string;
      from_email: string;
    }>`SELECT * FROM smtp_config ORDER BY created_at DESC LIMIT 1`;

    if (!row) {
      return { config: null };
    }

    const config: SMTPConfig = {
      id: row.id,
      provider: row.provider,
      host: row.host,
      port: row.port,
      username: row.username,
      password: row.password,
      fromEmail: row.from_email,
    };

    return { config };
  }
);
