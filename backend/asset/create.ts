import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { assetDB } from "./db";
import type { Asset, AssetCategory, AssetStatus } from "./types";

export interface CreateAssetRequest {
  assetId: string;
  hostname?: string;
  productName: string;
  serialNumber: string;
  brandName: string;
  model?: string;
  category: AssetCategory;
  location?: string;
  assignedUser?: string;
  assignedUserEmail?: string;
  dateAcquired?: Date;
  warrantyExpiryDate?: Date;
  status?: AssetStatus;
  comments?: string;
  totalLicenses?: number;
  usedLicenses?: number;
}

// Creates a new asset.
export const createAsset = api<CreateAssetRequest, Asset>(
  { auth: true, expose: true, method: "POST", path: "/assets" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only admins can create assets
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can create assets");
    }

    // Check if asset ID already exists
    const existingAsset = await assetDB.queryRow`
      SELECT id FROM assets WHERE asset_id = ${req.assetId}
    `;
    if (existingAsset) {
      throw APIError.alreadyExists("asset ID already exists");
    }

    // Generate QR code data
    const currentYear = new Date().getFullYear();
    const qrCodeData = JSON.stringify({
      company: "IDESOLUSI",
      hostname: req.hostname || req.assetId,
      serialNumber: req.serialNumber,
      year: req.dateAcquired ? new Date(req.dateAcquired).getFullYear() : currentYear,
    });

    const now = new Date();

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
      created_at: Date;
      updated_at: Date;
    }>`
      INSERT INTO assets (
        asset_id, hostname, product_name, serial_number, brand_name, model, category,
        location, assigned_user, assigned_user_email, date_acquired, warranty_expiry_date,
        status, comments, qr_code_data, total_licenses, used_licenses, created_at, updated_at
      ) VALUES (
        ${req.assetId}, ${req.hostname || null}, ${req.productName}, ${req.serialNumber},
        ${req.brandName}, ${req.model || null}, ${req.category}, ${req.location || null},
        ${req.assignedUser || null}, ${req.assignedUserEmail || null}, ${req.dateAcquired || null},
        ${req.warrantyExpiryDate || null}, ${req.status || "available"}, ${req.comments || null},
        ${qrCodeData}, ${req.totalLicenses || null}, ${req.usedLicenses || null}, ${now}, ${now}
      )
      RETURNING *
    `;

    if (!row) {
      throw new Error("Failed to create asset");
    }

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
      ...(row.category === 'license' && {
        totalLicenses: row.total_licenses || undefined,
        usedLicenses: row.used_licenses || undefined,
      }),
    };
  }
);
