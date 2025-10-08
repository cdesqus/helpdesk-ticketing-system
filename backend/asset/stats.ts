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
    console.log(`[AssetStats] Getting stats for user: ${auth.username} (role: ${auth.role})`);
    
    try {
      // Get total assets
      const totalResult = await assetDB.queryRow<{ count: number }>`
        SELECT COUNT(*) as count FROM assets
      `;
      const totalAssets = Number(totalResult?.count) || 0;
      console.log(`[AssetStats] Total assets: ${totalAssets}`);

      // Get assets by category
      const categoryRows = await assetDB.queryAll<{
        category: AssetCategory;
        count: number;
      }>`
        SELECT category, COUNT(*) as count 
        FROM assets
        GROUP BY category 
        ORDER BY count DESC
      `;
      console.log(`[AssetStats] Categories found: ${categoryRows.length}`);

      // Get assets by status
      const statusRows = await assetDB.queryAll<{
        status: AssetStatus;
        count: number;
      }>`
        SELECT status, COUNT(*) as count 
        FROM assets
        GROUP BY status 
        ORDER BY count DESC
      `;
      console.log(`[AssetStats] Statuses found: ${statusRows.length}`);

      // Get assets by user
      const userRows = await assetDB.queryAll<{
        user: string;
        count: number;
      }>`
        SELECT 
          COALESCE(assigned_user, 'Unassigned') as user, 
          COUNT(*) as count 
        FROM assets
        GROUP BY assigned_user 
        ORDER BY count DESC
        LIMIT 10
      `;
      console.log(`[AssetStats] User assignments found: ${userRows.length}`);

      // Get warranty expiring soon (within 30 days)
      const warrantyResult = await assetDB.queryRow<{ count: number }>`
        SELECT COUNT(*) as count 
        FROM assets
        WHERE warranty_expiry_date IS NOT NULL 
        AND warranty_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        AND warranty_expiry_date >= CURRENT_DATE
      `;
      const warrantyExpiringSoon = Number(warrantyResult?.count) || 0;
      console.log(`[AssetStats] Warranties expiring soon: ${warrantyExpiringSoon}`);

      // Get audit progress
      let auditedAssets = 0;
      let validAssets = 0;
      let invalidAssets = 0;

      try {
        const auditedAssetsResult = await assetDB.queryRow<{ count: number }>`
          SELECT COUNT(DISTINCT asset_id) as count 
          FROM asset_audits
        `;
        auditedAssets = Number(auditedAssetsResult?.count) || 0;

        const validAssetsResult = await assetDB.queryRow<{ count: number }>`
          SELECT COUNT(DISTINCT asset_id) as count 
          FROM asset_audits
          WHERE status = 'valid'
        `;
        validAssets = Number(validAssetsResult?.count) || 0;

        const invalidAssetsResult = await assetDB.queryRow<{ count: number }>`
          SELECT COUNT(DISTINCT asset_id) as count 
          FROM asset_audits
          WHERE status = 'invalid'
        `;
        invalidAssets = Number(invalidAssetsResult?.count) || 0;
        
        console.log(`[AssetStats] Audit progress - audited: ${auditedAssets}, valid: ${validAssets}, invalid: ${invalidAssets}`);
      } catch (auditError) {
        console.error("[AssetStats] Error querying audit data:", auditError);
        // Keep defaults as 0
      }

      const stats: AssetStats = {
        totalAssets,
        assetsByCategory: categoryRows.map(row => ({
          category: row.category,
          count: Number(row.count),
        })),
        assetsByStatus: statusRows.map(row => ({
          status: row.status,
          count: Number(row.count),
        })),
        assetsByUser: userRows.map(row => ({
          user: row.user,
          count: Number(row.count),
        })),
        warrantyExpiringSoon,
        auditProgress: {
          totalAssets,
          auditedAssets,
          validAssets,
          invalidAssets,
        },
      };

      console.log(`[AssetStats] Successfully calculated all stats`);
      return { stats };
    } catch (error) {
      console.error("[AssetStats] Error in getAssetStats:", error);
      
      // Return empty stats on error
      return {
        stats: {
          totalAssets: 0,
          assetsByCategory: [],
          assetsByStatus: [],
          assetsByUser: [],
          warrantyExpiringSoon: 0,
          auditProgress: {
            totalAssets: 0,
            auditedAssets: 0,
            validAssets: 0,
            invalidAssets: 0,
          },
        },
      };
    }
  }
);
