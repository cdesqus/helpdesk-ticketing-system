import { secret } from "encore.dev/config";
import { ticketDB } from "./db";
import type { Ticket, SMTPConfig } from "./types";

const defaultSMTPHost = secret("SMTPHost");
const defaultSMTPPort = secret("SMTPPort");
const defaultSMTPUser = secret("SMTPUser");
const defaultSMTPPass = secret("SMTPPass");

export async function sendTicketNotification(ticket: Ticket, action: "created" | "updated") {
  if (!ticket.reporterEmail) {
    return;
  }

  try {
    const config = await getSMTPConfig();
    if (!config) {
      console.log("No SMTP configuration found, using default settings");
      return;
    }

    const subject = action === "created" 
      ? `New Ticket Created: ${ticket.subject} (#${ticket.id})`
      : `Ticket Updated: ${ticket.subject} (#${ticket.id})`;

    const body = generateEmailBody(ticket, action);

    // In a real implementation, you would use a proper email library like nodemailer
    // For now, we'll just log the email that would be sent
    console.log(`Email would be sent to: ${ticket.reporterEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    console.log(`From: ${config.fromEmail}`);
    console.log(`SMTP Config: ${config.host}:${config.port}`);

  } catch (error) {
    console.error("Failed to send email notification:", error);
    throw error;
  }
}

function generateEmailBody(ticket: Ticket, action: "created" | "updated"): string {
  const actionText = action === "created" ? "created" : "updated";
  
  return `
Dear ${ticket.reporterName},

Your support ticket has been ${actionText}.

Ticket Details:
- Ticket ID: #${ticket.id}
- Subject: ${ticket.subject}
- Status: ${ticket.status}
- Priority: ${ticket.priority}
- Assigned Engineer: ${ticket.assignedEngineer || "Not assigned"}
- Created: ${ticket.createdAt.toLocaleString()}
- Last Updated: ${ticket.updatedAt.toLocaleString()}

Description:
${ticket.description}

You can track the progress of your ticket by contacting our support team.

Best regards,
Helpdesk Support Team
helpdesk@idesolusi.co.id
  `.trim();
}

async function getSMTPConfig(): Promise<SMTPConfig | null> {
  const row = await ticketDB.queryRow<{
    id: number;
    provider: string;
    host: string;
    port: number;
    username: string;
    password: string;
    from_email: string;
  }>`SELECT * FROM smtp_config ORDER BY created_at DESC LIMIT 1`;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    provider: row.provider,
    host: row.host,
    port: row.port,
    username: row.username,
    password: row.password,
    fromEmail: row.from_email,
  };
}
