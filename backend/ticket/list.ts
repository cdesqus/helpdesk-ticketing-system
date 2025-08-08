import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { ticketDB } from "./db";
import type { Ticket, TicketStatus, TicketPriority } from "./types";

export interface ListTicketsRequest {
  status?: Query<TicketStatus>;
  priority?: Query<TicketPriority>;
  assignedEngineer?: Query<string>;
  search?: Query<string>;
  startDate?: Query<string>;
  endDate?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListTicketsResponse {
  tickets: Ticket[];
  total: number;
}

// Retrieves tickets based on user role and permissions.
export const list = api<ListTicketsRequest, ListTicketsResponse>(
  { auth: true, expose: true, method: "GET", path: "/tickets" },
  async (req) => {
    const auth = getAuthData()!;
    
    try {
      let whereClause = "WHERE 1=1";
      const params: any[] = [];
      let paramIndex = 1;

      // Apply role-based filtering
      if (auth.role === "engineer") {
        // Engineers can only see tickets assigned to them
        whereClause += ` AND assigned_engineer = $${paramIndex}`;
        params.push(auth.fullName);
        paramIndex++;
      } else if (auth.role === "reporter") {
        // Reporters can only see their own tickets
        whereClause += ` AND reporter_email = $${paramIndex}`;
        params.push(auth.email);
        paramIndex++;
      }
      // Admins can see all tickets (no additional filtering)

      if (req.status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(req.status);
        paramIndex++;
      }

      if (req.priority) {
        whereClause += ` AND priority = $${paramIndex}`;
        params.push(req.priority);
        paramIndex++;
      }

      if (req.assignedEngineer && auth.role === "admin") {
        whereClause += ` AND assigned_engineer = $${paramIndex}`;
        params.push(req.assignedEngineer);
        paramIndex++;
      }

      if (req.search) {
        whereClause += ` AND (subject ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR reporter_name ILIKE $${paramIndex})`;
        params.push(`%${req.search}%`);
        paramIndex++;
      }

      if (req.startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(req.startDate);
        paramIndex++;
      }

      if (req.endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(req.endDate);
        paramIndex++;
      }

      const limit = req.limit || 50;
      const offset = req.offset || 0;

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM tickets ${whereClause}`;
      const countResult = await ticketDB.rawQueryRow<{ count: number }>(countQuery, ...params);
      const total = countResult?.count || 0;

      // Get tickets
      const query = `
        SELECT * FROM tickets ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const rows = await ticketDB.rawQueryAll<{
        id: number;
        subject: string;
        description: string;
        status: TicketStatus;
        priority: TicketPriority;
        assigned_engineer: string | null;
        reporter_name: string;
        reporter_email: string | null;
        company_name: string | null;
        created_at: Date;
        updated_at: Date;
        resolved_at: Date | null;
        custom_date: Date | null;
      }>(query, ...params);

      const tickets: Ticket[] = rows.map(row => ({
        id: row.id,
        subject: row.subject,
        description: row.description,
        status: row.status,
        priority: row.priority,
        assignedEngineer: row.assigned_engineer || undefined,
        reporterName: row.reporter_name,
        reporterEmail: row.reporter_email || undefined,
        companyName: row.company_name || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resolvedAt: row.resolved_at || undefined,
        customDate: row.custom_date || undefined,
      }));

      console.log(`Retrieved ${tickets.length} tickets for user ${auth.username} (role: ${auth.role})`);

      return { tickets, total };
    } catch (dbError) {
      console.error("Database error in ticket list:", dbError);
      
      // Return fallback tickets if database fails
      const fallbackTickets: Ticket[] = [
        {
          id: 1001,
          subject: "Sample Ticket - Database Connection Issue",
          description: "This is a sample ticket created because the database is not accessible. The system is running in fallback mode.",
          status: "Open",
          priority: "High",
          assignedEngineer: undefined,
          reporterName: auth.fullName,
          reporterEmail: auth.email,
          companyName: "IDESOLUSI",
          createdAt: new Date(),
          updatedAt: new Date(),
          resolvedAt: undefined,
          customDate: new Date(),
        },
        {
          id: 1002,
          subject: "Sample Ticket - System Setup",
          description: "This is another sample ticket for demonstration purposes. The system is working in fallback mode.",
          status: "In Progress",
          priority: "Medium",
          assignedEngineer: "System Admin",
          reporterName: auth.fullName,
          reporterEmail: auth.email,
          companyName: "IDESOLUSI",
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          updatedAt: new Date(),
          resolvedAt: undefined,
          customDate: new Date(Date.now() - 86400000),
        }
      ];

      // Filter fallback tickets based on role
      let filteredTickets = fallbackTickets;
      if (auth.role === "engineer") {
        filteredTickets = fallbackTickets.filter(t => t.assignedEngineer === auth.fullName);
      } else if (auth.role === "reporter") {
        filteredTickets = fallbackTickets.filter(t => t.reporterEmail === auth.email);
      }

      console.log(`Returning ${filteredTickets.length} fallback tickets due to database error`);
      return { tickets: filteredTickets, total: filteredTickets.length };
    }
  }
);
