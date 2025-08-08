import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { ticketDB } from "./db";

export interface EmailLog {
  id: number;
  ticketId: number;
  recipientEmail: string;
  action: string;
  status: 'success' | 'failed';
  details: any;
  createdAt: Date;
}

export interface ListEmailLogsRequest {
  ticketId?: Query<number>;
  status?: Query<'success' | 'failed'>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListEmailLogsResponse {
  logs: EmailLog[];
  total: number;
}

export interface EmailStatsResponse {
  totalSent: number;
  totalFailed: number;
  successRate: number;
  recentLogs: EmailLog[];
}

// Retrieves email delivery logs (admin only).
export const listEmailLogs = api<ListEmailLogsRequest, ListEmailLogsResponse>(
  { auth: true, expose: true, method: "GET", path: "/email-logs" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can view email logs");
    }

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (req.ticketId) {
      whereClause += ` AND ticket_id = $${paramIndex}`;
      params.push(req.ticketId);
      paramIndex++;
    }

    if (req.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(req.status);
      paramIndex++;
    }

    const limit = req.limit || 50;
    const offset = req.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM email_logs ${whereClause}`;
    const countResult = await ticketDB.rawQueryRow<{ count: number }>(countQuery, ...params);
    const total = countResult?.count || 0;

    // Get logs
    const query = `
      SELECT * FROM email_logs ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await ticketDB.rawQueryAll<{
      id: number;
      ticket_id: number;
      recipient_email: string;
      action: string;
      status: 'success' | 'failed';
      details: any;
      created_at: Date;
    }>(query, ...params);

    const logs: EmailLog[] = rows.map(row => ({
      id: row.id,
      ticketId: row.ticket_id,
      recipientEmail: row.recipient_email,
      action: row.action,
      status: row.status,
      details: row.details,
      createdAt: row.created_at,
    }));

    return { logs, total };
  }
);

// Retrieves email delivery statistics (admin only).
export const getEmailStats = api<void, EmailStatsResponse>(
  { auth: true, expose: true, method: "GET", path: "/email-stats" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can view email statistics");
    }

    // Get overall stats
    const statsRow = await ticketDB.queryRow<{
      total_sent: number;
      total_failed: number;
    }>`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as total_failed
      FROM email_logs
    `;

    const totalSent = statsRow?.total_sent || 0;
    const totalFailed = statsRow?.total_failed || 0;
    const successRate = totalSent > 0 ? ((totalSent - totalFailed) / totalSent) * 100 : 0;

    // Get recent logs
    const recentRows = await ticketDB.queryAll<{
      id: number;
      ticket_id: number;
      recipient_email: string;
      action: string;
      status: 'success' | 'failed';
      details: any;
      created_at: Date;
    }>`
      SELECT * FROM email_logs
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const recentLogs: EmailLog[] = recentRows.map(row => ({
      id: row.id,
      ticketId: row.ticket_id,
      recipientEmail: row.recipient_email,
      action: row.action,
      status: row.status,
      details: row.details,
      createdAt: row.created_at,
    }));

    return {
      totalSent,
      totalFailed,
      successRate: Math.round(successRate * 100) / 100,
      recentLogs,
    };
  }
);

// Clears old email logs (admin only).
export const clearOldEmailLogs = api<{ daysOld: number }, { deletedCount: number }>(
  { auth: true, expose: true, method: "DELETE", path: "/email-logs/cleanup" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can clear email logs");
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - req.daysOld);

    // Count logs to be deleted
    const countResult = await ticketDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM email_logs WHERE created_at < ${cutoffDate}
    `;
    const deletedCount = countResult?.count || 0;

    // Delete old logs
    await ticketDB.exec`DELETE FROM email_logs WHERE created_at < ${cutoffDate}`;

    console.log(`Deleted ${deletedCount} email logs older than ${req.daysOld} days`);

    return { deletedCount };
  }
);
