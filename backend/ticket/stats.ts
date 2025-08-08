import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
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

// Retrieves ticket statistics and trends with role-based filtering.
export const getStats = api<GetStatsRequest, GetStatsResponse>(
  { auth: true, expose: true, method: "GET", path: "/tickets/stats" },
  async (req) => {
    const auth = getAuthData()!;
    console.log(`Getting stats for user: ${auth.username} (role: ${auth.role})`);
    
    try {
      let whereClause = "WHERE 1=1";
      const params: any[] = [];
      let paramIndex = 1;

      // Apply role-based filtering
      if (auth.role === "engineer") {
        // Engineers can only see stats for tickets assigned to them
        whereClause += ` AND assigned_engineer = $${paramIndex}`;
        params.push(auth.fullName);
        paramIndex++;
      } else if (auth.role === "reporter") {
        // Reporters can only see stats for their own tickets
        whereClause += ` AND reporter_email = $${paramIndex}`;
        params.push(auth.email);
        paramIndex++;
      }
      // Admins can see all ticket stats (no additional filtering)

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

      console.log(`Stats query where clause: ${whereClause}`);
      console.log(`Stats query params:`, params);

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

      console.log(`Stats calculated:`, stats);

      // Get daily trends for the last 30 days
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

      console.log(`Trends calculated: ${trends.length} data points`);

      // Get engineer stats
      const engineerQuery = `
        SELECT 
          COALESCE(assigned_engineer, 'Unassigned') as engineer,
          COUNT(*) as count
        FROM tickets ${whereClause}
        GROUP BY assigned_engineer
        ORDER BY count DESC
        LIMIT 20
      `;

      const engineerRows = await ticketDB.rawQueryAll<{
        engineer: string;
        count: number;
      }>(engineerQuery, ...params);

      const engineerStats: EngineerStats[] = engineerRows.map(row => ({
        engineer: row.engineer,
        count: row.count,
      }));

      console.log(`Engineer stats calculated: ${engineerStats.length} engineers`);

      return { stats, trends, engineerStats };
    } catch (dbError) {
      console.error("Database error in getStats:", dbError);
      
      // Return fallback stats if database fails
      const fallbackStats: TicketStats = {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
      };

      const fallbackTrends: TicketTrend[] = [];
      const fallbackEngineerStats: EngineerStats[] = [];

      console.log("Returning fallback stats due to database error");
      
      return {
        stats: fallbackStats,
        trends: fallbackTrends,
        engineerStats: fallbackEngineerStats,
      };
    }
  }
);
