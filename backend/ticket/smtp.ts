import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { ticketDB } from "./db";
import type { SMTPConfig } from "./types";
import nodemailer from "nodemailer";

export interface ConfigureSMTPRequest {
  provider: string;
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
}

export interface TestSMTPRequest {
  testEmail: string;
}

export interface TestSMTPResponse {
  success: boolean;
  message: string;
}

// Configures SMTP settings for email notifications.
export const configureSMTP = api<ConfigureSMTPRequest, SMTPConfig>(
  { auth: true, expose: true, method: "POST", path: "/smtp/configure" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can configure SMTP settings");
    }

    console.log("Saving SMTP configuration with data:", {
      provider: req.provider,
      host: req.host,
      port: req.port,
      username: req.username,
      fromEmail: req.fromEmail,
      hasPassword: !!req.password
    });

    try {
      // Delete existing configuration
      console.log("Deleting existing SMTP configuration...");
      await ticketDB.exec`DELETE FROM smtp_config`;
      console.log("Existing configuration deleted");

      // Insert new configuration
      console.log("Inserting new SMTP configuration...");
      const row = await ticketDB.queryRow<{
        id: number;
        provider: string;
        host: string;
        port: number;
        username: string;
        password: string;
        from_email: string;
      }>`
        INSERT INTO smtp_config (provider, host, port, username, password, from_email, created_at, updated_at)
        VALUES (${req.provider}, ${req.host}, ${req.port}, ${req.username}, ${req.password}, ${req.fromEmail}, NOW(), NOW())
        RETURNING *
      `;

      if (!row) {
        console.error("Failed to insert SMTP configuration - no row returned");
        throw new Error("Failed to configure SMTP - database insert failed");
      }

      console.log("SMTP configuration saved successfully:", {
        id: row.id,
        provider: row.provider,
        host: row.host,
        port: row.port,
        fromEmail: row.from_email
      });

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
      console.error("Failed to save SMTP configuration:", error);
      
      if (error instanceof Error && error.message.includes("database")) {
        throw APIError.internal(`Database error: ${error.message}`);
      }
      
      throw APIError.internal(`Failed to save SMTP settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

// Tests SMTP configuration.
export const testSMTP = api<TestSMTPRequest, TestSMTPResponse>(
  { auth: true, expose: true, method: "POST", path: "/smtp/test" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can test SMTP settings");
    }

    try {
      // Get current SMTP configuration
      const config = await getSMTPConfigFromDB();
      if (!config) {
        throw APIError.notFound("No SMTP configuration found. Please configure SMTP settings first.");
      }

      // Send test email
      await sendTestEmail(config, req.testEmail);

      return {
        success: true,
        message: `Test email sent successfully to ${req.testEmail}`,
      };
    } catch (error) {
      console.error("SMTP test failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "SMTP test failed",
      };
    }
  }
);

export interface GetSMTPConfigResponse {
  config: SMTPConfig | null;
}

// Retrieves current SMTP configuration.
export const getSMTPConfig = api<void, GetSMTPConfigResponse>(
  { auth: true, expose: true, method: "GET", path: "/smtp/config" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can view SMTP configuration");
    }

    const config = await getSMTPConfigFromDB();
    return { config };
  }
);

async function getSMTPConfigFromDB(): Promise<SMTPConfig | null> {
  try {
    console.log("Fetching SMTP configuration from database...");
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
      console.log("No SMTP configuration found in database");
      return null;
    }

    console.log("SMTP configuration found:", {
      id: row.id,
      provider: row.provider,
      host: row.host,
      port: row.port,
      fromEmail: row.from_email
    });

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
    console.error("Failed to get SMTP config from database:", error);
    return null;
  }
}

async function sendTestEmail(config: SMTPConfig, testEmail: string): Promise<void> {
  console.log("Sending test email to:", testEmail);
  
  try {
    console.log("Creating nodemailer transporter for test email...");
    const transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.username,
        pass: config.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });

    const mailOptions = {
      from: `"IDESOLUSI Helpdesk" <${config.fromEmail}>`,
      to: testEmail,
      subject: "SMTP Configuration Test - IDESOLUSI Helpdesk",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px; text-align: center;">
            <h1>SMTP Test Successful!</h1>
          </div>
          <div style="padding: 20px; background-color: #f8f9fa; margin-top: 20px; border-radius: 8px;">
            <h2>Congratulations!</h2>
            <p>Your SMTP configuration is working correctly. This test email confirms that:</p>
            <ul>
              <li>✅ SMTP server connection is successful</li>
              <li>✅ Authentication credentials are valid</li>
              <li>✅ Email delivery is functioning</li>
            </ul>
            <p>Your helpdesk system is now ready to send email notifications to users.</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 14px;">
            <p><strong>IDESOLUSI Helpdesk System</strong></p>
            <p>Test email sent at ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
      text: `
SMTP Configuration Test - IDESOLUSI Helpdesk

Congratulations! Your SMTP configuration is working correctly.

This test email confirms that:
✅ SMTP server connection is successful
✅ Authentication credentials are valid  
✅ Email delivery is functioning

Your helpdesk system is now ready to send email notifications to users.

---
IDESOLUSI Helpdesk System
Test email sent at ${new Date().toLocaleString()}
      `,
    };

    console.log("Sending test email with nodemailer...");
    const info = await transporter.sendMail(mailOptions);
    console.log(`Test email sent successfully to: ${testEmail}`, {
      messageId: info.messageId,
      response: info.response
    });
  } catch (error) {
    console.error("Failed to send test email:", error);
    throw new Error(`Failed to send test email: ${error instanceof Error ? error.message : String(error)}`);
  }
}
