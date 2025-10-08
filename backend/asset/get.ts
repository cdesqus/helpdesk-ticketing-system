import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { assetDB } from "./db";
import type { Asset, AssetCategory, AssetStatus } from "./types";

export interface GetAssetRequest {
  id: number;
}

// Retrieves a specific asset by ID.
export const getAsset = api<GetAssetRequest, Asset>(
  { auth: true, expose: true, method: "GET", path: "/assets/:id" },
  async (req) => {
    const auth = getAuthData()!;
    
    const row = await assetDB.queryRow<{
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
    }>`SELECT * FROM assets WHERE id = ${req.id}`;

    if (!row) {
      throw APIError.notFound("asset not found");
    }

    // Apply role-based access control
    if (auth.role === "reporter") {
      // Reporters can only view assets assigned to them
      if (row.assigned_user_email !== auth.email && row.assigned_user !== auth.fullName) {
        throw APIError.permissionDenied("you can only view assets assigned to you");
      }
    }
    // Admins and engineers can view all assets

    return {
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
    };
  }
);
