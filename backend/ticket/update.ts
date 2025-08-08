import { api, APIError } from "encore.dev/api";
import { ticketDB } from "./db";
import type { Ticket, TicketStatus, TicketPriority } from "./types";
import { sendTicketNotification } from "./email";

export interface UpdateTicketRequest {
  id: number;
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedEngineer?: string;
  reporterName?: string;
  reporterEmail?: string;
  companyName?: string;
  customDate?: Date;
}

// Updates an existing ticket.
export const update = api<UpdateTicketRequest, Ticket>(
  { expose: true, method: "PUT", path: "/tickets/:id" },
  async (req) => {
    const existingTicket = await ticketDB.queryRow<{
      id: number;
      status: TicketStatus;
      reporter_email: string | null;
    }>`SELECT id, status, reporter_email FROM tickets WHERE id = ${req.id}`;

    if (!existingTicket) {
      throw APIError.notFound("ticket not found");
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (req.subject !== undefined) {
      updates.push(`subject = $${paramIndex}`);
      params.push(req.subject);
      paramIndex++;
    }

    if (req.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(req.description);
      paramIndex++;
    }

    if (req.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(req.status);
      paramIndex++;

      if (req.status === "Resolved" || req.status === "Closed") {
        updates.push(`resolved_at = $${paramIndex}`);
        params.push(new Date());
        paramIndex++;
      }
    }

    if (req.priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      params.push(req.priority);
      paramIndex++;
    }

    if (req.assignedEngineer !== undefined) {
      updates.push(`assigned_engineer = $${paramIndex}`);
      params.push(req.assignedEngineer || null);
      paramIndex++;
    }

    if (req.reporterName !== undefined) {
      updates.push(`reporter_name = $${paramIndex}`);
      params.push(req.reporterName);
      paramIndex++;
    }

    if (req.reporterEmail !== undefined) {
      updates.push(`reporter_email = $${paramIndex}`);
      params.push(req.reporterEmail || null);
      paramIndex++;
    }

    if (req.companyName !== undefined) {
      updates.push(`company_name = $${paramIndex}`);
      params.push(req.companyName || null);
      paramIndex++;
    }

    if (req.customDate !== undefined) {
      updates.push(`custom_date = $${paramIndex}`);
      params.push(req.customDate);
      paramIndex++;
    }

    updates.push(`updated_at = $${paramIndex}`);
    params.push(new Date());
    paramIndex++;

    const query = `
      UPDATE tickets SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    params.push(req.id);

    const row = await ticketDB.rawQueryRow<{
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

    if (!row) {
      throw APIError.notFound("ticket not found");
    }

    const ticket: Ticket = {
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
    };

    // Send email notification if status changed and reporter has email
    if (req.status && req.status !== existingTicket.status && existingTicket.reporter_email) {
      try {
        await sendTicketNotification(ticket, "updated");
      } catch (error) {
        console.error("Failed to send email notification:", error);
      }
    }

    return ticket;
  }
);
