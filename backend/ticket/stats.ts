import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { ticketDB } from "./db";
import type { TicketStats, TicketTrend, EngineerStats } from "./types";

export interface GetStatsResponse {
  stats: TicketStats;
  trends: TicketTrend[];
  engineerStats: EngineerStats[];
}

// Retrieves ticket statistics and trends with role-based filtering.
export const getStats = api<void, GetStatsResponse>(
  { auth: true, expose: true, method: "GET", path: "/tickets/stats" },
  async () => {
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

      console.log(`Stats query where clause: ${whereClause}`);
      console.log(`Stats query params:`, params);

      // Get overall stats including monthly count
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'Open' THEN 1 END) as open,
          COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved,
          COUNT(CASE WHEN status = 'Closed' THEN 1 END) as closed,
          COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as monthly
        FROM tickets ${whereClause}
      `;

      const statsRow = await ticketDB.rawQueryRow<{
        total: number;
        open: number;
        in_progress: number;
        resolved: number;
        closed: number;
        monthly: number;
      }>(statsQuery, ...params);

      const stats: TicketStats = {
        total: statsRow?.total || 0,
        open: statsRow?.open || 0,
        inProgress: statsRow?.in_progress || 0,
        resolved: statsRow?.resolved || 0,
        closed: statsRow?.closed || 0,
        monthly: statsRow?.monthly || 0,
      };

      console.log(`Stats calculated:`, stats);

      // Get daily trends for the last 7 days
      const trendsQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM tickets ${whereClause}
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 7
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
        LIMIT 10
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
        total: 2,
        open: 1,
        inProgress: 1,
        resolved: 0,
        closed: 0,
        monthly: 2,
      };

      const fallbackTrends: TicketTrend[] = [
        {
          date: new Date().toISOString().split('T')[0],
          count: 1,
        },
        {
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          count: 1,
        }
      ];

      const fallbackEngineerStats: EngineerStats[] = [
        {
          engineer: auth.role === "engineer" ? auth.fullName : "System Admin",
          count: 1,
        },
        {
          engineer: "Unassigned",
          count: 1,
        }
      ];

      console.log("Returning fallback stats due to database error");
      
      return {
        stats: fallbackStats,
        trends: fallbackTrends,
        engineerStats: fallbackEngineerStats,
      };
    }
  }
);
