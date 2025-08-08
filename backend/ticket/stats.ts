import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { ticketDB } from "./db";
import type { TicketStats, TicketTrend, EngineerStats } from "./types";

export interface GetStatsRequest {
  startDate?: Query<string>;
  endDate?: Query<string>;
}

export interface GetStatsResponse {
  stats: TicketStats;
  trends: TicketTrend[];
  engineerStats: EngineerStats[];
}

// Retrieves ticket statistics and trends.
export const getStats = api<GetStatsRequest, GetStatsResponse>(
  { expose: true, method: "GET", path: "/tickets/stats" },
  async (req) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (req.startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(req.startDate);
      paramIndex++;
    }

    if (req.endDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(req.endDate);
      paramIndex++;
    }

    // Get overall stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'Closed' THEN 1 END) as closed
      FROM tickets ${whereClause}
    `;

    const statsRow = await ticketDB.rawQueryRow<{
      total: number;
      open: number;
      in_progress: number;
      resolved: number;
      closed: number;
    }>(statsQuery, ...params);

    const stats: TicketStats = {
      total: statsRow?.total || 0,
      open: statsRow?.open || 0,
      inProgress: statsRow?.in_progress || 0,
      resolved: statsRow?.resolved || 0,
      closed: statsRow?.closed || 0,
    };

    // Get daily trends
    const trendsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM tickets ${whereClause}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const trendRows = await ticketDB.rawQueryAll<{
      date: Date;
      count: number;
    }>(trendsQuery, ...params);

    const trends: TicketTrend[] = trendRows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: row.count,
    }));

    // Get engineer stats
    const engineerQuery = `
      SELECT 
        COALESCE(assigned_engineer, 'Unassigned') as engineer,
        COUNT(*) as count
      FROM tickets ${whereClause}
      GROUP BY assigned_engineer
      ORDER BY count DESC
    `;

    const engineerRows = await ticketDB.rawQueryAll<{
      engineer: string;
      count: number;
    }>(engineerQuery, ...params);

    const engineerStats: EngineerStats[] = engineerRows.map(row => ({
      engineer: row.engineer,
      count: row.count,
    }));

    return { stats, trends, engineerStats };
  }
);
