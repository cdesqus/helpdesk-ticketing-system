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
  sortField?: Query<"id" | "created_at">;
  sortOrder?: Query<"asc" | "desc">;
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
    console.log(`Listing tickets for user: ${auth.username} (role: ${auth.role})`);
    
    try {
      let whereClause = "WHERE 1=1";
      const params: any[] = [];
      let paramIndex = 1;

      // Apply role-based filtering
      if (auth.role === "engineer") {
        // Engineers can see all tickets, but if no specific engineer filter is applied,
        // default to showing only their assigned tickets
        if (!req.assignedEngineer) {
          // Default filter: show only tickets assigned to this engineer
          whereClause += ` AND assigned_engineer = $${paramIndex}`;
          params.push(auth.fullName);
          paramIndex++;
        } else if (req.assignedEngineer !== "all") {
          // Specific engineer filter applied
          if (req.assignedEngineer === "Unassigned") {
            whereClause += ` AND assigned_engineer IS NULL`;
          } else {
            whereClause += ` AND assigned_engineer = $${paramIndex}`;
            params.push(req.assignedEngineer);
            paramIndex++;
          }
        }
        // If assignedEngineer is "all", don't add any engineer filter (show all tickets)
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

      // For admin role, apply engineer filter if specified
      if (auth.role === "admin" && req.assignedEngineer) {
        if (req.assignedEngineer === "Unassigned") {
          whereClause += ` AND assigned_engineer IS NULL`;
        } else if (req.assignedEngineer !== "all") {
          whereClause += ` AND assigned_engineer = $${paramIndex}`;
          params.push(req.assignedEngineer);
          paramIndex++;
        }
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
      const sortField = req.sortField || "created_at";
      const sortOrder = req.sortOrder || "desc";

      // Validate sort parameters
      const validSortFields = ["id", "created_at"];
      const validSortOrders = ["asc", "desc"];
      
      if (!validSortFields.includes(sortField)) {
        throw new Error(`Invalid sort field: ${sortField}`);
      }
      
      if (!validSortOrders.includes(sortOrder)) {
        throw new Error(`Invalid sort order: ${sortOrder}`);
      }

      console.log(`Query where clause: ${whereClause}`);
      console.log(`Query params:`, params);
      console.log(`Sort: ${sortField} ${sortOrder}, Limit: ${limit}, Offset: ${offset}`);

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM tickets ${whereClause}`;
      console.log(`Count query: ${countQuery}`);
      
      const countResult = await ticketDB.rawQueryRow<{ count: number }>(countQuery, ...params);
      const total = countResult?.count || 0;
      console.log(`Total tickets found: ${total}`);

      // Get tickets with sorting
      const query = `
        SELECT * FROM tickets ${whereClause}
        ORDER BY ${sortField} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      console.log(`Main query: ${query}`);
      console.log(`Final params:`, params);

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
        resolution: string | null;
        created_at: Date;
        updated_at: Date;
        resolved_at: Date | null;
        custom_date: Date | null;
      }>(query, ...params);

      console.log(`Database returned ${rows.length} rows`);

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
        resolution: row.resolution || undefined,
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
          assignedEngineer: auth.role === "engineer" ? auth.fullName : undefined,
          reporterName: auth.fullName,
          reporterEmail: auth.email,
          companyName: "IDESOLUSI",
          resolution: undefined,
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
          assignedEngineer: auth.role === "engineer" ? auth.fullName : "System Admin",
          reporterName: auth.fullName,
          reporterEmail: auth.email,
          companyName: "IDESOLUSI",
          resolution: undefined,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          updatedAt: new Date(),
          resolvedAt: undefined,
          customDate: new Date(Date.now() - 86400000),
        }
      ];

      // Filter fallback tickets based on role
      let filteredTickets = fallbackTickets;
      if (auth.role === "engineer") {
        // For engineers, if no specific filter, show only their assigned tickets
        if (!req.assignedEngineer) {
          filteredTickets = fallbackTickets.filter(t => t.assignedEngineer === auth.fullName);
        }
      } else if (auth.role === "reporter") {
        filteredTickets = fallbackTickets.filter(t => t.reporterEmail === auth.email);
      }

      // Apply sorting to fallback tickets
      const sortField = req.sortField || "created_at";
      const sortOrder = req.sortOrder || "desc";
      
      filteredTickets.sort((a, b) => {
        let aValue, bValue;
        
        if (sortField === "id") {
          aValue = a.id;
          bValue = b.id;
        } else {
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
        }
        
        if (sortOrder === "asc") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });

      console.log(`Returning ${filteredTickets.length} fallback tickets due to database error`);
      return { tickets: filteredTickets, total: filteredTickets.length };
    }
  }
);
