import { secret } from "encore.dev/config";
import { ticketDB } from "./db";
import type { Ticket, SMTPConfig } from "./types";
import * as nodemailer from "nodemailer";

const defaultSMTPHost = secret("SMTPHost");
const defaultSMTPPort = secret("SMTPPort");
const defaultSMTPUser = secret("SMTPUser");
const defaultSMTPPass = secret("SMTPPass");

export async function sendTicketNotification(ticket: Ticket, action: "created" | "updated") {
  if (!ticket.reporterEmail) {
    console.log("No reporter email provided, skipping notification");
    return;
  }

  try {
    const config = await getSMTPConfig();
    if (!config) {
      console.log("No SMTP configuration found, trying environment variables");
      
      // Try to use environment variables as fallback
      const envHost = defaultSMTPHost();
      const envPort = defaultSMTPPort();
      const envUser = defaultSMTPUser();
      const envPass = defaultSMTPPass();
      
      if (!envHost || !envUser || !envPass) {
        console.log("No SMTP configuration available, email notification skipped");
        return;
      }
      
      // Use environment variables
      await sendEmailWithNodemailer({
        host: envHost,
        port: parseInt(envPort || "587"),
        username: envUser,
        password: envPass,
        fromEmail: envUser,
      }, ticket, action);
      
      return;
    }

    await sendEmailWithNodemailer(config, ticket, action);
    console.log(`Email notification sent successfully to: ${ticket.reporterEmail}`);

  } catch (error) {
    console.error("Failed to send email notification:", error);
    throw error;
  }
}

async function sendEmailWithNodemailer(config: SMTPConfig, ticket: Ticket, action: "created" | "updated") {
  const subject = action === "created" 
    ? `New Ticket Created: ${ticket.subject} (#${ticket.id})`
    : `Ticket Updated: ${ticket.subject} (#${ticket.id})`;

  const htmlBody = generateHTMLEmailBody(ticket, action);
  const textBody = generateTextEmailBody(ticket, action);

  // Create transporter
  const transporter = nodemailer.createTransporter({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // true for 465, false for other ports
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates for development
    },
  });

  // Verify connection configuration
  try {
    await transporter.verify();
    console.log("SMTP server connection verified successfully");
  } catch (error) {
    console.error("SMTP server connection failed:", error);
    throw new Error("SMTP server connection failed");
  }

  // Send mail
  const mailOptions = {
    from: `"IDESOLUSI Helpdesk" <${config.fromEmail}>`,
    to: ticket.reporterEmail,
    subject: subject,
    text: textBody,
    html: htmlBody,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("Email sent successfully:", info.messageId);
  
  return info;
}

function generateHTMLEmailBody(ticket: Ticket, action: "created" | "updated"): string {
  const actionText = action === "created" ? "created" : "updated";
  const actionColor = action === "created" ? "#10b981" : "#3b82f6";
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background-color: ${actionColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { padding: 20px; }
        .ticket-info { background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .ticket-info h3 { margin-top: 0; color: #495057; }
        .info-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px 0; border-bottom: 1px solid #e9ecef; }
        .info-label { font-weight: bold; color: #6c757d; }
        .info-value { color: #495057; }
        .description { background-color: #ffffff; border: 1px solid #e9ecef; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; border-top: 1px solid #e9ecef; margin-top: 20px; }
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status-open { background-color: #dc3545; color: white; }
        .status-progress { background-color: #ffc107; color: black; }
        .status-resolved { background-color: #28a745; color: white; }
        .status-closed { background-color: #6c757d; color: white; }
        .priority-urgent { color: #dc3545; font-weight: bold; }
        .priority-high { color: #fd7e14; font-weight: bold; }
        .priority-medium { color: #ffc107; font-weight: bold; }
        .priority-low { color: #28a745; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Ticket ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</h1>
            <p>Your support ticket has been ${actionText}</p>
        </div>
        
        <div class="content">
            <div class="ticket-info">
                <h3>Ticket Information</h3>
                <div class="info-row">
                    <span class="info-label">Ticket ID:</span>
                    <span class="info-value">#${ticket.id}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Subject:</span>
                    <span class="info-value">${ticket.subject}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value">
                        <span class="status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}">${ticket.status}</span>
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">Priority:</span>
                    <span class="info-value priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Assigned Engineer:</span>
                    <span class="info-value">${ticket.assignedEngineer || "Not assigned yet"}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Reporter:</span>
                    <span class="info-value">${ticket.reporterName}</span>
                </div>
                ${ticket.companyName ? `
                <div class="info-row">
                    <span class="info-label">Company:</span>
                    <span class="info-value">${ticket.companyName}</span>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="info-label">Created:</span>
                    <span class="info-value">${new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Last Updated:</span>
                    <span class="info-value">${new Date(ticket.updatedAt).toLocaleString()}</span>
                </div>
                ${ticket.resolvedAt ? `
                <div class="info-row">
                    <span class="info-label">Resolved:</span>
                    <span class="info-value">${new Date(ticket.resolvedAt).toLocaleString()}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="description">
                <h3>Description:</h3>
                <p style="white-space: pre-wrap; margin: 0;">${ticket.description}</p>
            </div>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #1976d2;">What happens next?</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    ${action === "created" ? `
                    <li>Our support team will review your ticket</li>
                    <li>An engineer will be assigned to help resolve your issue</li>
                    <li>You'll receive updates via email as progress is made</li>
                    <li>You can reply to this email to add additional information</li>
                    ` : `
                    <li>Your ticket has been updated with new information</li>
                    <li>Our team is working on resolving your issue</li>
                    <li>You'll continue to receive updates as progress is made</li>
                    <li>You can reply to this email if you have questions</li>
                    `}
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>IDESOLUSI Helpdesk System</strong></p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
            <p>For urgent matters, please contact our support team directly.</p>
            <p style="font-size: 12px; color: #999;">
                Email sent at ${new Date().toLocaleString()}
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

function generateTextEmailBody(ticket: Ticket, action: "created" | "updated"): string {
  const actionText = action === "created" ? "created" : "updated";
  
  return `
IDESOLUSI HELPDESK - TICKET ${actionText.toUpperCase()}

Dear ${ticket.reporterName},

Your support ticket has been ${actionText}.

TICKET DETAILS:
===============
Ticket ID: #${ticket.id}
Subject: ${ticket.subject}
Status: ${ticket.status}
Priority: ${ticket.priority}
Assigned Engineer: ${ticket.assignedEngineer || "Not assigned yet"}
Reporter: ${ticket.reporterName}
${ticket.companyName ? `Company: ${ticket.companyName}` : ''}
Created: ${new Date(ticket.createdAt).toLocaleString()}
Last Updated: ${new Date(ticket.updatedAt).toLocaleString()}
${ticket.resolvedAt ? `Resolved: ${new Date(ticket.resolvedAt).toLocaleString()}` : ''}

DESCRIPTION:
============
${ticket.description}

WHAT HAPPENS NEXT:
==================
${action === "created" ? `
• Our support team will review your ticket
• An engineer will be assigned to help resolve your issue
• You'll receive updates via email as progress is made
• You can reply to this email to add additional information
` : `
• Your ticket has been updated with new information
• Our team is working on resolving your issue
• You'll continue to receive updates as progress is made
• You can reply to this email if you have questions
`}

Best regards,
IDESOLUSI Helpdesk Support Team

---
This is an automated message. Please do not reply directly to this email.
For urgent matters, please contact our support team directly.

Email sent at ${new Date().toLocaleString()}
  `.trim();
}

async function getSMTPConfig(): Promise<SMTPConfig | null> {
  try {
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
  } catch (error) {
    console.error("Failed to get SMTP config:", error);
    return null;
  }
}
