import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { ticketDB } from "./db";
import type { SystemConfig } from "./types";

export interface UpdateSystemConfigRequest {
  systemName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface GetSystemConfigResponse {
  config: SystemConfig;
}

// Updates system configuration (admin only).
export const updateSystemConfig = api<UpdateSystemConfigRequest, SystemConfig>(
  { auth: true, expose: true, method: "PUT", path: "/system/config" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can update system configuration");
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (req.systemName !== undefined) {
      updates.push(`system_name = $${paramIndex}`);
      params.push(req.systemName);
      paramIndex++;
    }

    if (req.logoUrl !== undefined) {
      updates.push(`logo_url = $${paramIndex}`);
      params.push(req.logoUrl || null);
      paramIndex++;
    }

    if (req.faviconUrl !== undefined) {
      updates.push(`favicon_url = $${paramIndex}`);
      params.push(req.faviconUrl || null);
      paramIndex++;
    }

    if (req.primaryColor !== undefined) {
      updates.push(`primary_color = $${paramIndex}`);
      params.push(req.primaryColor);
      paramIndex++;
    }

    if (req.secondaryColor !== undefined) {
      updates.push(`secondary_color = $${paramIndex}`);
      params.push(req.secondaryColor);
      paramIndex++;
    }

    updates.push(`updated_at = $${paramIndex}`);
    params.push(new Date());
    paramIndex++;

    const query = `
      UPDATE system_config SET ${updates.join(", ")}
      WHERE id = 1
      RETURNING *
    `;

    const row = await ticketDB.rawQueryRow<{
      id: number;
      system_name: string;
      logo_url: string | null;
      favicon_url: string | null;
      primary_color: string;
      secondary_color: string;
      created_at: Date;
      updated_at: Date;
    }>(query, ...params);

    if (!row) {
      throw APIError.notFound("system configuration not found");
    }

    return {
      id: row.id,
      systemName: row.system_name,
      logoUrl: row.logo_url || undefined,
      faviconUrl: row.favicon_url || undefined,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

// Retrieves current system configuration (public).
export const getSystemConfig = api<void, GetSystemConfigResponse>(
  { expose: true, method: "GET", path: "/system/config" },
  async () => {
    const row = await ticketDB.queryRow<{
      id: number;
      system_name: string;
      logo_url: string | null;
      favicon_url: string | null;
      primary_color: string;
      secondary_color: string;
      created_at: Date;
      updated_at: Date;
    }>`SELECT * FROM system_config WHERE id = 1`;

    if (!row) {
      // Return default configuration if none exists
      return {
        config: {
          id: 1,
          systemName: "IDESOLUSI Helpdesk",
          primaryColor: "#3b82f6",
          secondaryColor: "#1e40af",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
    }

    return {
      config: {
        id: row.id,
        systemName: row.system_name,
        logoUrl: row.logo_url || undefined,
        faviconUrl: row.favicon_url || undefined,
        primaryColor: row.primary_color,
        secondaryColor: row.secondary_color,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    };
  }
);
