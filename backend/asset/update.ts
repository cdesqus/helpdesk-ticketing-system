import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { assetDB } from "./db";
import type { Asset, AssetCategory, AssetStatus } from "./types";

export interface UpdateAssetRequest {
  id: number;
  assetId?: string;
  hostname?: string;
  productName?: string;
  serialNumber?: string;
  brandName?: string;
  model?: string;
  category?: AssetCategory;
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

// Updates an existing asset.
export const updateAsset = api<UpdateAssetRequest, Asset>(
  { auth: true, expose: true, method: "PUT", path: "/assets/:id" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check asset exists
    const existingAsset = await assetDB.queryRow<{
      id: number;
      asset_id: string;
      hostname: string | null;
      serial_number: string;
      date_acquired: Date | null;
    }>`SELECT id, asset_id, hostname, serial_number, date_acquired FROM assets WHERE id = ${req.id}`;

    if (!existingAsset) {
      throw APIError.notFound("asset not found");
    }

    // Apply role-based access control
    if (auth.role === "engineer") {
      // Engineers can only update asset status
      if (Object.keys(req).some(key => key !== "id" && key !== "status" && key !== "comments")) {
        throw APIError.permissionDenied("engineers can only update asset status and comments");
      }
    } else if (auth.role === "reporter") {
      // Reporters cannot update assets
      throw APIError.permissionDenied("reporters cannot update assets");
    }
    // Admins can update all fields

    // Check if asset ID is being changed and already exists
    if (req.assetId && req.assetId !== existingAsset.asset_id) {
      const duplicateAsset = await assetDB.queryRow`
        SELECT id FROM assets WHERE asset_id = ${req.assetId} AND id != ${req.id}
      `;
      if (duplicateAsset) {
        throw APIError.alreadyExists("asset ID already exists");
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (req.assetId !== undefined) {
      updates.push(`asset_id = $${paramIndex}`);
      params.push(req.assetId);
      paramIndex++;
    }

    if (req.hostname !== undefined) {
      updates.push(`hostname = $${paramIndex}`);
      params.push(req.hostname || null);
      paramIndex++;
    }

    if (req.productName !== undefined) {
      updates.push(`product_name = $${paramIndex}`);
      params.push(req.productName);
      paramIndex++;
    }

    if (req.serialNumber !== undefined) {
      updates.push(`serial_number = $${paramIndex}`);
      params.push(req.serialNumber);
      paramIndex++;
    }

    if (req.brandName !== undefined) {
      updates.push(`brand_name = $${paramIndex}`);
      params.push(req.brandName);
      paramIndex++;
    }

    if (req.model !== undefined) {
      updates.push(`model = $${paramIndex}`);
      params.push(req.model || null);
      paramIndex++;
    }

    if (req.category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      params.push(req.category);
      paramIndex++;
    }

    if (req.location !== undefined) {
      updates.push(`location = $${paramIndex}`);
      params.push(req.location || null);
      paramIndex++;
    }

    if (req.assignedUser !== undefined) {
      updates.push(`assigned_user = $${paramIndex}`);
      params.push(req.assignedUser || null);
      paramIndex++;
    }

    if (req.assignedUserEmail !== undefined) {
      updates.push(`assigned_user_email = $${paramIndex}`);
      params.push(req.assignedUserEmail || null);
      paramIndex++;
    }

    if (req.dateAcquired !== undefined) {
      updates.push(`date_acquired = $${paramIndex}`);
      params.push(req.dateAcquired || null);
      paramIndex++;
    }

    if (req.warrantyExpiryDate !== undefined) {
      updates.push(`warranty_expiry_date = $${paramIndex}`);
      params.push(req.warrantyExpiryDate || null);
      paramIndex++;
    }

    if (req.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(req.status);
      paramIndex++;
    }

    if (req.comments !== undefined) {
      updates.push(`comments = $${paramIndex}`);
      params.push(req.comments || null);
      paramIndex++;
    }

    if (req.totalLicenses !== undefined) {
      updates.push(`total_licenses = $${paramIndex}`);
      params.push(req.totalLicenses || null);
      paramIndex++;
    }

    if (req.usedLicenses !== undefined) {
      updates.push(`used_licenses = $${paramIndex}`);
      params.push(req.usedLicenses || null);
      paramIndex++;
    }

    // Update QR code data if relevant fields changed
    if (req.hostname !== undefined || req.serialNumber !== undefined || req.dateAcquired !== undefined) {
      const hostname = req.hostname !== undefined ? req.hostname : existingAsset.hostname;
      const serialNumber = req.serialNumber !== undefined ? req.serialNumber : existingAsset.serial_number;
      const dateAcquired = req.dateAcquired !== undefined ? req.dateAcquired : existingAsset.date_acquired;
      
      const qrCodeData = JSON.stringify({
        company: "IDESOLUSI",
        hostname: hostname || req.assetId || existingAsset.asset_id,
        serialNumber: serialNumber,
        year: dateAcquired ? new Date(dateAcquired).getFullYear() : new Date().getFullYear(),
      });

      updates.push(`qr_code_data = $${paramIndex}`);
      params.push(qrCodeData);
      paramIndex++;
    }

    updates.push(`updated_at = $${paramIndex}`);
    params.push(new Date());
    paramIndex++;

    const query = `
      UPDATE assets SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    params.push(req.id);

    const row = await assetDB.rawQueryRow<{
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
    }>(query, ...params);

    if (!row) {
      throw APIError.notFound("asset not found");
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
