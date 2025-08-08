import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { ticketDB } from "./db";
import type { Ticket, TicketStatus, TicketPriority } from "./types";
import { sendTicketNotification } from "./email";

export interface CloseTicketRequest {
  id: number;
  resolution?: string;
}

// Closes a ticket and sets the resolution.
export const closeTicket = api<CloseTicketRequest, Ticket>(
  { auth: true, expose: true, method: "POST", path: "/tickets/:id/close" },
  async (req) => {
    const auth = getAuthData()!;
    
    const existingTicket = await ticketDB.queryRow<{
      id: number;
      status: TicketStatus;
      reporter_email: string | null;
      assigned_engineer: string | null;
    }>`SELECT id, status, reporter_email, assigned_engineer FROM tickets WHERE id = ${req.id}`;

    if (!existingTicket) {
      throw APIError.notFound("ticket not found");
    }

    // Apply role-based access control
    if (auth.role === "engineer") {
      // Engineers can only close tickets assigned to them
      if (existingTicket.assigned_engineer !== auth.fullName) {
        throw APIError.permissionDenied("you can only close tickets assigned to you");
      }
    } else if (auth.role === "reporter") {
      // Reporters cannot close tickets
      throw APIError.permissionDenied("reporters cannot close tickets");
    }
    // Admins can close any ticket

    const now = new Date();

    // Update ticket status to Closed and set resolution
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
      resolution: string | null;
      created_at: Date;
      updated_at: Date;
      resolved_at: Date | null;
      custom_date: Date | null;
    }>`
      UPDATE tickets 
      SET status = 'Closed', 
          resolved_at = ${now}, 
          updated_at = ${now},
          resolution = ${req.resolution || null}
      WHERE id = ${req.id}
      RETURNING *
    `;

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
      resolution: row.resolution || undefined,
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
