import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
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

// Retrieves all tickets with optional filtering.
export const list = api<ListTicketsRequest, ListTicketsResponse>(
  { expose: true, method: "GET", path: "/tickets" },
  async (req) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

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

    if (req.assignedEngineer) {
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

    const countQuery = `SELECT COUNT(*) as count FROM tickets ${whereClause}`;
    const countResult = await ticketDB.rawQueryRow<{ count: number }>(countQuery, ...params);
    const total = countResult?.count || 0;

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

    return { tickets, total };
  }
);
