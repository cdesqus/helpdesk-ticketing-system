import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { assetDB } from "./db";
import type { AssetStats, AssetCategory, AssetStatus } from "./types";

export interface GetAssetStatsResponse {
  stats: AssetStats;
}

// Retrieves asset statistics with role-based filtering.
export const getAssetStats = api<void, GetAssetStatsResponse>(
  { auth: true, expose: true, method: "GET", path: "/assets/stats" },
  async () => {
    const auth = getAuthData()!;
    
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    // Apply role-based filtering
    if (auth.role === "reporter") {
      // Reporters can only see stats for assets assigned to them
      whereClause += ` AND (assigned_user_email = $${paramIndex} OR assigned_user = $${paramIndex})`;
      params.push(auth.email);
      paramIndex++;
    }
    // Admins and engineers can see all asset stats

    // Get total assets
    const totalQuery = `SELECT COUNT(*) as count FROM assets ${whereClause}`;
    const totalResult = await assetDB.rawQueryRow<{ count: number }>(totalQuery, ...params);
    const totalAssets = totalResult?.count || 0;

    // Get assets by category
    const categoryQuery = `
      SELECT category, COUNT(*) as count 
      FROM assets ${whereClause}
      GROUP BY category 
      ORDER BY count DESC
    `;
    const categoryRows = await assetDB.rawQueryAll<{
      category: AssetCategory;
      count: number;
    }>(categoryQuery, ...params);

    // Get assets by status
    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM assets ${whereClause}
      GROUP BY status 
      ORDER BY count DESC
    `;
    const statusRows = await assetDB.rawQueryAll<{
      status: AssetStatus;
      count: number;
    }>(statusQuery, ...params);

    // Get assets by user
    const userQuery = `
      SELECT 
        COALESCE(assigned_user, 'Unassigned') as user, 
        COUNT(*) as count 
      FROM assets ${whereClause}
      GROUP BY assigned_user 
      ORDER BY count DESC
      LIMIT 10
    `;
    const userRows = await assetDB.rawQueryAll<{
      user: string;
      count: number;
    }>(userQuery, ...params);

    // Get warranty expiring soon (within 30 days)
    const warrantyQuery = `
      SELECT COUNT(*) as count 
      FROM assets ${whereClause}
      AND warranty_expiry_date IS NOT NULL 
      AND warranty_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      AND warranty_expiry_date >= CURRENT_DATE
    `;
    const warrantyResult = await assetDB.rawQueryRow<{ count: number }>(warrantyQuery, ...params);
    const warrantyExpiringSoon = warrantyResult?.count || 0;

    // Get audit progress
    const auditedAssetsQuery = `
      SELECT COUNT(DISTINCT asset_id) as count 
      FROM asset_audits aa
      JOIN assets a ON aa.asset_id = a.id
      ${whereClause.replace('WHERE 1=1', 'WHERE 1=1')}
    `;
    const auditedAssetsResult = await assetDB.rawQueryRow<{ count: number }>(auditedAssetsQuery, ...params);
    const auditedAssets = auditedAssetsResult?.count || 0;

    const validAssetsQuery = `
      SELECT COUNT(DISTINCT asset_id) as count 
      FROM asset_audits aa
      JOIN assets a ON aa.asset_id = a.id
      ${whereClause.replace('WHERE 1=1', 'WHERE aa.status = \'valid\' AND 1=1')}
    `;
    const validAssetsResult = await assetDB.rawQueryRow<{ count: number }>(validAssetsQuery, ...params);
    const validAssets = validAssetsResult?.count || 0;

    const invalidAssetsQuery = `
      SELECT COUNT(DISTINCT asset_id) as count 
      FROM asset_audits aa
      JOIN assets a ON aa.asset_id = a.id
      ${whereClause.replace('WHERE 1=1', 'WHERE aa.status = \'invalid\' AND 1=1')}
    `;
    const invalidAssetsResult = await assetDB.rawQueryRow<{ count: number }>(invalidAssetsQuery, ...params);
    const invalidAssets = invalidAssetsResult?.count || 0;

    const stats: AssetStats = {
      totalAssets,
      assetsByCategory: categoryRows.map(row => ({
        category: row.category,
        count: row.count,
      })),
      assetsByStatus: statusRows.map(row => ({
        status: row.status,
        count: row.count,
      })),
      assetsByUser: userRows.map(row => ({
        user: row.user,
        count: row.count,
      })),
      warrantyExpiringSoon,
      auditProgress: {
        totalAssets,
        auditedAssets,
        validAssets,
        invalidAssets,
      },
    };

    return { stats };
  }
);
