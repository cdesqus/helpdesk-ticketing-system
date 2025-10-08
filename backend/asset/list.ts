import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { assetDB } from "./db";
import type { Asset, AssetCategory, AssetStatus } from "./types";

export interface ListAssetsRequest {
  category?: Query<AssetCategory>;
  status?: Query<AssetStatus>;
  assignedUser?: Query<string>;
  search?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
  sortField?: Query<"id" | "asset_id" | "product_name" | "date_acquired">;
  sortOrder?: Query<"asc" | "desc">;
}

export interface ListAssetsResponse {
  assets: Asset[];
  total: number;
}

// Retrieves assets with filtering and pagination.
export const listAssets = api<ListAssetsRequest, ListAssetsResponse>(
  { auth: true, expose: true, method: "GET", path: "/assets" },
  async (req) => {
    const auth = getAuthData()!;
    
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    // Apply role-based filtering
    if (auth.role === "reporter") {
      // Reporters can only see assets assigned to them
      whereClause += ` AND (assigned_user_email = $${paramIndex} OR assigned_user = $${paramIndex})`;
      params.push(auth.email);
      paramIndex++;
    }
    // Admins and engineers can see all assets

    if (req.category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(req.category);
      paramIndex++;
    }

    if (req.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(req.status);
      paramIndex++;
    }

    if (req.assignedUser) {
      if (req.assignedUser === "unassigned") {
        whereClause += ` AND assigned_user IS NULL`;
      } else {
        whereClause += ` AND (assigned_user ILIKE $${paramIndex} OR assigned_user_email ILIKE $${paramIndex})`;
        params.push(`%${req.assignedUser}%`);
        paramIndex++;
      }
    }

    if (req.search) {
      whereClause += ` AND (asset_id ILIKE $${paramIndex} OR hostname ILIKE $${paramIndex} OR product_name ILIKE $${paramIndex} OR serial_number ILIKE $${paramIndex} OR brand_name ILIKE $${paramIndex})`;
      params.push(`%${req.search}%`);
      paramIndex++;
    }

    const limit = req.limit || 50;
    const offset = req.offset || 0;
    const sortField = req.sortField || "created_at";
    const sortOrder = req.sortOrder || "desc";

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM assets ${whereClause}`;
    const countResult = await assetDB.rawQueryRow<{ count: number }>(countQuery, ...params);
    const total = countResult?.count || 0;

    // Get assets
    const query = `
      SELECT * FROM assets ${whereClause}
      ORDER BY ${sortField} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await assetDB.rawQueryAll<{
      id: number;
      asset_id: string;
      hostname: string | null;
      product_name: string;
      serial_number: string;
      brand_name: string;
      model: string | null;
      category: AssetCategory;
      location: string | null;
      assigned_user: string | null;
      assigned_user_email: string | null;
      date_acquired: Date | null;
      warranty_expiry_date: Date | null;
      status: AssetStatus;
      comments: string | null;
      qr_code_data: string | null;
      total_licenses: number | null;
      used_licenses: number | null;
      is_consumable: boolean;
      quantity: number | null;
      min_stock_level: number | null;
      created_at: Date;
      updated_at: Date;
    }>(query, ...params);

    const assets: Asset[] = rows.map(row => ({
      id: row.id,
      assetId: row.asset_id,
      hostname: row.hostname || undefined,
      productName: row.product_name,
      serialNumber: row.serial_number,
      brandName: row.brand_name,
      model: row.model || undefined,
      category: row.category,
      location: row.location || undefined,
      assignedUser: row.assigned_user || undefined,
      assignedUserEmail: row.assigned_user_email || undefined,
      dateAcquired: row.date_acquired || undefined,
      warrantyExpiryDate: row.warranty_expiry_date || undefined,
      status: row.status,
      comments: row.comments || undefined,
      qrCodeData: row.qr_code_data || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isConsumable: row.is_consumable,
      quantity: row.quantity || undefined,
      minStockLevel: row.min_stock_level || undefined,
      ...(row.category === 'license' && {
        totalLicenses: row.total_licenses || undefined,
        usedLicenses: row.used_licenses || undefined,
      }),
    }));

    return { assets, total };
  }
);
