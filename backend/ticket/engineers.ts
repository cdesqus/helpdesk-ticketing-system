import { api } from "encore.dev/api";
import { ticketDB } from "./db";
import type { Engineer } from "./types";

export interface ListEngineersResponse {
  engineers: Engineer[];
}

// Retrieves all engineers.
export const listEngineers = api<void, ListEngineersResponse>(
  { expose: true, method: "GET", path: "/engineers" },
  async () => {
    const rows = await ticketDB.queryAll<{
      id: number;
      name: string;
      email: string;
      created_at: Date;
    }>`SELECT * FROM engineers ORDER BY name`;

    const engineers: Engineer[] = rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at,
    }));

    return { engineers };
  }
);

export interface CreateEngineerRequest {
  name: string;
  email: string;
}

// Creates a new engineer.
export const createEngineer = api<CreateEngineerRequest, Engineer>(
  { expose: true, method: "POST", path: "/engineers" },
  async (req) => {
    const row = await ticketDB.queryRow<{
      id: number;
      name: string;
      email: string;
      created_at: Date;
    }>`
      INSERT INTO engineers (name, email)
      VALUES (${req.name}, ${req.email})
      RETURNING *
    `;

    if (!row) {
      throw new Error("Failed to create engineer");
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at,
    };
  }
);
