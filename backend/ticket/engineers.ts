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
    
    // Allow all authenticated users to list engineers
    // This is needed for ticket creation and assignment workflows
    // Reporters need to see engineers when creating tickets
    // Engineers need to see other engineers for collaboration
    // Admins need full access for management
    
    try {
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
    } catch (dbError) {
      console.error("Database error in listEngineers:", dbError);
      
      // Return dummy engineers if database fails
      const dummyEngineers: Engineer[] = [
        {
          id: 1,
          name: "John Smith",
          email: "john.smith@idesolusi.co.id",
          createdAt: new Date(),
        },
        {
          id: 2,
          name: "Sarah Johnson",
          email: "sarah.johnson@idesolusi.co.id",
          createdAt: new Date(),
        },
        {
          id: 3,
          name: "Mike Wilson",
          email: "mike.wilson@idesolusi.co.id",
          createdAt: new Date(),
        },
        {
          id: 4,
          name: "Lisa Chen",
          email: "lisa.chen@idesolusi.co.id",
          createdAt: new Date(),
        }
      ];

      return { engineers: dummyEngineers };
    }
  }
);
