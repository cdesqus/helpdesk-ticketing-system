import { secret } from "encore.dev/config";
import { ticketDB } from "./db";
import type { Ticket, SMTPConfig } from "./types";
import * as nodemailer from "nodemailer";

const defaultSMTPHost = secret("SMTPHost");
const defaultSMTPPort = secret("SMTPPort");
const defaultSMTPUser = secret("SMTPUser");
const defaultSMTPPass = secret("SMTPPass");

export async function sendTicketNotification(ticket: Ticket, action: "created" | "updated") {
  const startTime = Date.now();
  const logPrefix = `[EMAIL-${ticket.id}]`;
  
  console.log(`${logPrefix} Starting email notification process for ticket #${ticket.id} (${action})`);
  
  if (!ticket.reporterEmail) {
    console.log(`${logPrefix} No reporter email provided, skipping notification`);
    return { success: false, reason: "No reporter email provided" };
  }

  console.log(`${logPrefix} Reporter email: ${ticket.reporterEmail}`);

  try {
    // Get SMTP configuration
    console.log(`${logPrefix} Fetching SMTP configuration...`);
    const config = await getSMTPConfig();
    
    if (!config) {
      console.log(`${logPrefix} No SMTP configuration found in database, trying environment variables`);
      
      // Try to use environment variables as fallback
      const envHost = defaultSMTPHost();
      const envPort = defaultSMTPPort();
      const envUser = defaultSMTPUser();
      const envPass = defaultSMTPPass();
      
      console.log(`${logPrefix} Environment variables check:`, {
        hasHost: !!envHost,
        hasPort: !!envPort,
        hasUser: !!envUser,
        hasPass: !!envPass,
        host: envHost || 'NOT_SET',
        port: envPort || 'NOT_SET',
        user: envUser || 'NOT_SET'
      });
      
      if (!envHost || !envUser || !envPass) {
        const missingVars = [];
        if (!envHost) missingVars.push('SMTP_HOST');
        if (!envUser) missingVars.push('SMTP_USER');
        if (!envPass) missingVars.push('SMTP_PASS');
        
        console.error(`${logPrefix} Missing environment variables: ${missingVars.join(', ')}`);
        console.log(`${logPrefix} Email notification skipped - no SMTP configuration available`);
        return { success: false, reason: `Missing SMTP configuration: ${missingVars.join(', ')}` };
      }
      
      // Use environment variables with SSL/TLS defaults
      const envConfig: SMTPConfig = {
        provider: "environment",
        host: envHost,
        port: parseInt(envPort || "587"),
        username: envUser,
        password: envPass,
        fromEmail: envUser,
        useSSL: parseInt(envPort || "587") === 465,
        useTLS: parseInt(envPort || "587") !== 465,
      };
      
      console.log(`${logPrefix} Using environment variables for SMTP:`, {
        host: envConfig.host,
        port: envConfig.port,
        username: envConfig.username,
        fromEmail: envConfig.fromEmail,
        useSSL: envConfig.useSSL,
        useTLS: envConfig.useTLS
      });
      
      const result = await sendEmailWithNodemailer(envConfig, ticket, action, logPrefix);
      const duration = Date.now() - startTime;
      console.log(`${logPrefix} Email notification completed in ${duration}ms`);
      return result;
    }

    console.log(`${logPrefix} Using database SMTP configuration:`, {
      provider: config.provider,
      host: config.host,
      port: config.port,
      username: config.username,
      fromEmail: config.fromEmail,
      useSSL: config.useSSL,
      useTLS: config.useTLS
    });

    const result = await sendEmailWithNodemailer(config, ticket, action, logPrefix);
    const duration = Date.now() - startTime;
    console.log(`${logPrefix} Email notification completed in ${duration}ms`);
    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} Email notification failed after ${duration}ms:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ticketId: ticket.id,
      reporterEmail: ticket.reporterEmail,
      action
    });
    
    return { 
      success: false, 
      reason: error instanceof Error ? error.message : String(error),
      duration 
    };
  }
}

async function sendEmailWithNodemailer(config: SMTPConfig, ticket: Ticket, action: "created" | "updated", logPrefix: string) {
  const subject = action === "created" 
    ? `New Ticket Created: ${ticket.subject} (#${ticket.id})`
    : `Ticket Updated: ${ticket.subject} (#${ticket.id})`;

  console.log(`${logPrefix} Preparing email:`, {
    to: ticket.reporterEmail,
    subject: subject,
    action: action
  });

  const htmlBody = generateHTMLEmailBody(ticket, action);
  const textBody = generateTextEmailBody(ticket, action);

  console.log(`${logPrefix} Email content generated - HTML: ${htmlBody.length} chars, Text: ${textBody.length} chars`);

  // Create transporter with SSL/TLS configuration
  console.log(`${logPrefix} Creating SMTP transporter...`);
  
  // Determine security settings
  const isSecure = config.port === 465 || config.useSSL;
  const requireTLS = config.useTLS !== false; // Default to true
  
  const transporterConfig = {
    host: config.host,
    port: config.port,
    secure: isSecure, // true for 465 (SSL), false for other ports
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates for development
      ciphers: 'SSLv3',
    },
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    requireTLS: requireTLS, // Require TLS for non-SSL connections
  };

  // Additional TLS settings for different providers
  if (config.provider === 'gmail') {
    transporterConfig.tls = {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    };
  } else if (config.provider === 'office365') {
    transporterConfig.tls = {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    };
  }

  console.log(`${logPrefix} Transporter config:`, {
    host: transporterConfig.host,
    port: transporterConfig.port,
    secure: transporterConfig.secure,
    requireTLS: transporterConfig.requireTLS,
    username: transporterConfig.auth.user,
    connectionTimeout: transporterConfig.connectionTimeout,
    greetingTimeout: transporterConfig.greetingTimeout,
    socketTimeout: transporterConfig.socketTimeout
  });

  console.log(`${logPrefix} Creating nodemailer transporter...`);
  const transporter = nodemailer.createTransport(transporterConfig);

  // Verify connection configuration
  console.log(`${logPrefix} Verifying SMTP connection...`);
  try {
    const verifyStart = Date.now();
    await transporter.verify();
    const verifyDuration = Date.now() - verifyStart;
    console.log(`${logPrefix} SMTP server connection verified successfully in ${verifyDuration}ms`);
  } catch (error) {
    console.error(`${logPrefix} SMTP server connection verification failed:`, {
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      command: (error as any)?.command,
      response: (error as any)?.response,
      responseCode: (error as any)?.responseCode
    });
    throw new Error(`SMTP connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Prepare mail options
  const mailOptions = {
    from: `"IDESOLUSI Helpdesk" <${config.fromEmail}>`,
    to: ticket.reporterEmail,
    subject: subject,
    text: textBody,
    html: htmlBody,
  };

  console.log(`${logPrefix} Mail options prepared:`, {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject,
    hasText: !!mailOptions.text,
    hasHtml: !!mailOptions.html
  });

  // Send mail
  console.log(`${logPrefix} Sending email...`);
  try {
    const sendStart = Date.now();
    const info = await transporter.sendMail(mailOptions);
    const sendDuration = Date.now() - sendStart;
    
    console.log(`${logPrefix} Email sent successfully in ${sendDuration}ms:`, {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending,
      envelope: info.envelope
    });
    
    // Log successful delivery
    await logEmailDelivery(ticket.id, ticket.reporterEmail!, action, 'success', {
      messageId: info.messageId,
      response: info.response,
      duration: sendDuration,
      security: isSecure ? 'SSL' : (requireTLS ? 'TLS' : 'None')
    });
    
    return { 
      success: true, 
      messageId: info.messageId, 
      response: info.response,
      duration: sendDuration
    };
  } catch (error) {
    console.error(`${logPrefix} Failed to send email:`, {
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      command: (error as any)?.command,
      response: (error as any)?.response,
      responseCode: (error as any)?.responseCode
    });
    
    // Log failed delivery
    await logEmailDelivery(ticket.id, ticket.reporterEmail!, action, 'failed', {
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code
    });
    
    throw error;
  }
}

async function logEmailDelivery(ticketId: number, email: string, action: string, status: 'success' | 'failed', details: any) {
  try {
    await ticketDB.exec`
      INSERT INTO email_logs (ticket_id, recipient_email, action, status, details, created_at)
      VALUES (${ticketId}, ${email}, ${action}, ${status}, ${JSON.stringify(details)}, NOW())
    `;
    console.log(`[EMAIL-${ticketId}] Email delivery logged: ${status}`);
  } catch (error) {
    console.error(`[EMAIL-${ticketId}] Failed to log email delivery:`, error);
  }
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
        .security-badge { background-color: #10b981; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Secure Ticket ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</h1>
            <p>Your support ticket has been ${actionText}</p>
            <span class="security-badge">SSL/TLS Encrypted</span>
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
                <h4 style="margin-top: 0; color: #1976d2;">🔐 What happens next?</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    ${action === "created" ? `
                    <li>Our support team will review your ticket securely</li>
                    <li>An engineer will be assigned to help resolve your issue</li>
                    <li>You'll receive encrypted email updates as progress is made</li>
                    <li>You can reply to this email to add additional information</li>
                    ` : `
                    <li>Your ticket has been updated with new information</li>
                    <li>Our team is working on resolving your issue</li>
                    <li>You'll continue to receive secure updates as progress is made</li>
                    <li>You can reply to this email if you have questions</li>
                    `}
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>🔒 IDESOLUSI Helpdesk System</strong></p>
            <p>This email was sent securely using SSL/TLS encryption.</p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
            <p>For urgent matters, please contact our support team directly.</p>
            <p style="font-size: 12px; color: #999;">
                Secure email sent at ${new Date().toLocaleString()}
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
🔒 IDESOLUSI HELPDESK - SECURE TICKET ${actionText.toUpperCase()}

Dear ${ticket.reporterName},

Your support ticket has been ${actionText} securely.

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

🔐 WHAT HAPPENS NEXT:
=====================
${action === "created" ? `
• Our support team will review your ticket securely
• An engineer will be assigned to help resolve your issue
• You'll receive encrypted email updates as progress is made
• You can reply to this email to add additional information
` : `
• Your ticket has been updated with new information
• Our team is working on resolving your issue
• You'll continue to receive secure updates as progress is made
• You can reply to this email if you have questions
`}

Best regards,
IDESOLUSI Helpdesk Support Team

---
🔒 This email was sent securely using SSL/TLS encryption.
This is an automated message. Please do not reply directly to this email.
For urgent matters, please contact our support team directly.

Secure email sent at ${new Date().toLocaleString()}
  `.trim();
}

async function getSMTPConfig(): Promise<SMTPConfig | null> {
  try {
    console.log("[SMTP-CONFIG] Fetching SMTP configuration from database...");
    const row = await ticketDB.queryRow<{
      id: number;
      provider: string;
      host: string;
      port: number;
      username: string;
      password: string;
      from_email: string;
      use_ssl?: boolean;
      use_tls?: boolean;
    }>`SELECT * FROM smtp_config ORDER BY created_at DESC LIMIT 1`;

    if (!row) {
      console.log("[SMTP-CONFIG] No SMTP configuration found in database");
      return null;
    }

    console.log("[SMTP-CONFIG] SMTP configuration found:", {
      id: row.id,
      provider: row.provider,
      host: row.host,
      port: row.port,
      username: row.username,
      fromEmail: row.from_email,
      useSSL: row.use_ssl,
      useTLS: row.use_tls
    });

    return {
      id: row.id,
      provider: row.provider,
      host: row.host,
      port: row.port,
      username: row.username,
      password: row.password,
      fromEmail: row.from_email,
      useSSL: row.use_ssl || false,
      useTLS: row.use_tls !== false, // Default to true if not specified
    };
  } catch (error) {
    console.error("[SMTP-CONFIG] Failed to get SMTP config from database:", error);
    return null;
  }
}
