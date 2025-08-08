import { api } from "encore.dev/api";
import { ticketDB } from "./db";
import type { Ticket, TicketStatus, TicketPriority } from "./types";
import { sendTicketNotification } from "./email";

export interface CreateTicketRequest {
  subject: string;
  description: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedEngineer?: string;
  reporterName: string;
  reporterEmail?: string;
  companyName?: string;
  customDate?: Date;
}

// Creates a new ticket.
export const create = api<CreateTicketRequest, Ticket>(
  { expose: true, method: "POST", path: "/tickets" },
  async (req) => {
    const now = new Date();
    const customDate = req.customDate || now;
    
    // Handle "unassigned" value from frontend
    const assignedEngineer = req.assignedEngineer === "unassigned" ? null : req.assignedEngineer;
    
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
      INSERT INTO tickets (
        subject, description, status, priority, assigned_engineer,
        reporter_name, reporter_email, company_name, custom_date, created_at, updated_at
      ) VALUES (
        ${req.subject}, ${req.description}, ${req.status || "Open"}, ${req.priority || "Medium"},
        ${assignedEngineer || null}, ${req.reporterName}, ${req.reporterEmail || null},
        ${req.companyName || null}, ${customDate}, ${customDate}, ${now}
      )
      RETURNING *
    `;

    if (!row) {
      throw new Error("Failed to create ticket");
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

    // Send email notification
    if (req.reporterEmail) {
      try {
        await sendTicketNotification(ticket, "created");
      } catch (error) {
        console.error("Failed to send email notification:", error);
      }
    }

    return ticket;
  }
);
