import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { ticketDB } from "./db";
import type { SMTPConfig } from "./types";
import * as nodemailer from "nodemailer";

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

    try {
      // Test the SMTP configuration before saving
      await testSMTPConnection(req);

      // Delete existing configuration
      await ticketDB.exec`DELETE FROM smtp_config`;

      // Insert new configuration
      const row = await ticketDB.queryRow<{
        id: number;
        provider: string;
        host: string;
        port: number;
        username: string;
        password: string;
        from_email: string;
      }>`
        INSERT INTO smtp_config (provider, host, port, username, password, from_email)
        VALUES (${req.provider}, ${req.host}, ${req.port}, ${req.username}, ${req.password}, ${req.fromEmail})
        RETURNING *
      `;

      if (!row) {
        throw new Error("Failed to configure SMTP");
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
      console.error("Failed to configure SMTP:", error);
      if (error instanceof Error && error.message.includes("SMTP connection test failed")) {
        throw APIError.invalidArgument("SMTP configuration test failed. Please check your settings.");
      }
      throw APIError.internal("Failed to configure SMTP settings");
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
      const config = await getSMTPConfig();
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

async function testSMTPConnection(config: ConfigureSMTPRequest): Promise<void> {
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
  });

  try {
    await transporter.verify();
    console.log("SMTP connection test successful");
  } catch (error) {
    console.error("SMTP connection test failed:", error);
    throw new Error("SMTP connection test failed");
  }
}

async function sendTestEmail(config: SMTPConfig, testEmail: string): Promise<void> {
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

  await transporter.sendMail(mailOptions);
  console.log(`Test email sent successfully to: ${testEmail}`);
}
