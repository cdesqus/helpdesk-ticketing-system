import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { authDB } from "../auth/db";
import type { Engineer } from "./types";

export interface ListEngineersResponse {
  engineers: Engineer[];
}

// Retrieves all engineers from the auth system.
export const listEngineers = api<void, ListEngineersResponse>(
  { auth: true, expose: true, method: "GET", path: "/engineers" },
  async () => {
    const auth = getAuthData()!;
    
    // Only admins and engineers can list engineers
    if (auth.role === "reporter") {
      throw APIError.permissionDenied("reporters cannot list engineers");
    }

    const rows = await authDB.queryAll<{
      id: number;
      full_name: string;
      email: string;
      created_at: Date;
    }>`SELECT id, full_name as name, email, created_at FROM users WHERE role = 'engineer' AND status = 'active' ORDER BY full_name`;

    const engineers: Engineer[] = rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at,
    }));

    return { engineers };
  }
);
