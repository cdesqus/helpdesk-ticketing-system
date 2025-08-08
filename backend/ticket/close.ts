import { api, APIError } from "encore.dev/api";
import { ticketDB } from "./db";
import type { Ticket, TicketStatus, TicketPriority } from "./types";
import { sendTicketNotification } from "./email";

export interface CloseTicketRequest {
  id: number;
  reason?: string;
}

// Closes a ticket and optionally adds a closing comment.
export const closeTicket = api<CloseTicketRequest, Ticket>(
  { expose: true, method: "POST", path: "/tickets/:id/close" },
  async (req) => {
    const existingTicket = await ticketDB.queryRow<{
      id: number;
      status: TicketStatus;
      reporter_email: string | null;
    }>`SELECT id, status, reporter_email FROM tickets WHERE id = ${req.id}`;

    if (!existingTicket) {
      throw APIError.notFound("ticket not found");
    }

    const now = new Date();

    // Update ticket status to Closed
    const row = await ticketDB.queryRow<{
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
    }>`
      UPDATE tickets 
      SET status = 'Closed', resolved_at = ${now}, updated_at = ${now}
      WHERE id = ${req.id}
      RETURNING *
    `;

    if (!row) {
      throw APIError.notFound("ticket not found");
    }

    // Add closing comment if reason provided
    if (req.reason) {
      await ticketDB.exec`
        INSERT INTO ticket_comments (
          ticket_id, author_name, content, is_internal, created_at, updated_at
        ) VALUES (
          ${req.id}, 'System', ${`Ticket closed. Reason: ${req.reason}`}, false, ${now}, ${now}
        )
      `;
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

    // Send email notification if reporter has email
    if (existingTicket.reporter_email) {
      try {
        await sendTicketNotification(ticket, "updated");
      } catch (error) {
        console.error("Failed to send email notification:", error);
      }
    }

    return ticket;
  }
);
