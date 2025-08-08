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
  useSSL?: boolean;
  useTLS?: boolean;
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
      useSSL: req.useSSL,
      useTLS: req.useTLS,
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
        use_ssl: boolean;
        use_tls: boolean;
      }>`
        INSERT INTO smtp_config (provider, host, port, username, password, from_email, use_ssl, use_tls, created_at, updated_at)
        VALUES (${req.provider}, ${req.host}, ${req.port}, ${req.username}, ${req.password}, ${req.fromEmail}, ${req.useSSL || false}, ${req.useTLS || true}, NOW(), NOW())
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
        useSSL: row.use_ssl,
        useTLS: row.use_tls,
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
      use_ssl?: boolean;
      use_tls?: boolean;
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
    console.error("Failed to get SMTP config from database:", error);
    return null;
  }
}

async function sendTestEmail(config: SMTPConfig, testEmail: string): Promise<void> {
  console.log("Sending test email to:", testEmail);
  console.log("SMTP config for test:", {
    host: config.host,
    port: config.port,
    useSSL: config.useSSL,
    useTLS: config.useTLS,
    secure: config.port === 465 || config.useSSL
  });
  
  try {
    console.log("Creating nodemailer transporter for test email...");
    
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
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      requireTLS: requireTLS, // Require TLS for non-SSL connections
    };

    // Additional TLS settings for different providers
    if (config.provider === 'gmail') {
      transporterConfig.tls = {
        ...transporterConfig.tls,
        servername: 'smtp.gmail.com',
      };
    } else if (config.provider === 'office365') {
      transporterConfig.tls = {
        ...transporterConfig.tls,
        servername: 'smtp.office365.com',
      };
    }

    console.log("Final transporter config:", {
      host: transporterConfig.host,
      port: transporterConfig.port,
      secure: transporterConfig.secure,
      requireTLS: transporterConfig.requireTLS,
      username: transporterConfig.auth.user
    });

    const transporter = nodemailer.createTransporter(transporterConfig);

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
              <li>✅ SSL/TLS encryption is working properly</li>
              <li>✅ Authentication credentials are valid</li>
              <li>✅ Email delivery is functioning</li>
            </ul>
            <p>Your helpdesk system is now ready to send secure email notifications to users.</p>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #1976d2;">Connection Details:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #1976d2;">
                <li>Host: ${config.host}</li>
                <li>Port: ${config.port}</li>
                <li>Security: ${isSecure ? 'SSL' : (requireTLS ? 'TLS' : 'None')}</li>
                <li>Provider: ${config.provider}</li>
              </ul>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 14px;">
            <p><strong>IDESOLUSI Helpdesk System</strong></p>
            <p>Secure email test sent at ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
      text: `
SMTP Configuration Test - IDESOLUSI Helpdesk

Congratulations! Your SMTP configuration is working correctly.

This test email confirms that:
✅ SMTP server connection is successful
✅ SSL/TLS encryption is working properly
✅ Authentication credentials are valid  
✅ Email delivery is functioning

Connection Details:
- Host: ${config.host}
- Port: ${config.port}
- Security: ${isSecure ? 'SSL' : (requireTLS ? 'TLS' : 'None')}
- Provider: ${config.provider}

Your helpdesk system is now ready to send secure email notifications to users.

---
IDESOLUSI Helpdesk System
Secure email test sent at ${new Date().toLocaleString()}
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
