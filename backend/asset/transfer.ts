import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { assetDB } from "./db";
import type { AssetTransferHistory } from "./types";

export interface RecordTransferRequest {
  assetId: number;
  toUser?: string;
  toUserEmail?: string;
  toLocation?: string;
  reason?: string;
  notes?: string;
}

export interface GetTransferHistoryRequest {
  assetId: number;
}

export interface GetTransferHistoryResponse {
  transfers: AssetTransferHistory[];
}

export const recordAssetTransfer = api<RecordTransferRequest, AssetTransferHistory>(
  { auth: true, expose: true, method: "POST", path: "/assets/:assetId/transfer" },
  async (req) => {
    const auth = getAuthData()!;
    
    if (auth.role === "reporter") {
      throw APIError.permissionDenied("reporters cannot record asset transfers");
    }

    const asset = await assetDB.queryRow<{
      id: number;
      assigned_user: string | null;
      assigned_user_email: string | null;
      location: string | null;
    }>`
      SELECT id, assigned_user, assigned_user_email, location 
      FROM assets 
      WHERE id = ${req.assetId}
    `;

    if (!asset) {
      throw APIError.notFound("asset not found");
    }

    const row = await assetDB.queryRow<{
      id: number;
      asset_id: number;
      from_user: string | null;
      from_user_email: string | null;
      to_user: string | null;
      to_user_email: string | null;
      from_location: string | null;
      to_location: string | null;
      transfer_date: Date;
      transferred_by: string;
      reason: string | null;
      notes: string | null;
      created_at: Date;
    }>`
      INSERT INTO asset_transfer_history (
        asset_id, from_user, from_user_email, to_user, to_user_email,
        from_location, to_location, transfer_date, transferred_by, reason, notes
      ) VALUES (
        ${req.assetId}, ${asset.assigned_user}, ${asset.assigned_user_email},
        ${req.toUser || null}, ${req.toUserEmail || null},
        ${asset.location}, ${req.toLocation || null},
        ${new Date()}, ${auth.email}, ${req.reason || null}, ${req.notes || null}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("failed to record transfer");
    }

    await assetDB.exec`
      UPDATE assets 
      SET 
        assigned_user = ${req.toUser || null},
        assigned_user_email = ${req.toUserEmail || null},
        location = ${req.toLocation || null},
        updated_at = ${new Date()}
      WHERE id = ${req.assetId}
    `;

    return {
      id: row.id,
      assetId: row.asset_id,
      fromUser: row.from_user || undefined,
      fromUserEmail: row.from_user_email || undefined,
      toUser: row.to_user || undefined,
      toUserEmail: row.to_user_email || undefined,
      fromLocation: row.from_location || undefined,
      toLocation: row.to_location || undefined,
      transferDate: row.transfer_date,
      transferredBy: row.transferred_by,
      reason: row.reason || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
    };
  }
);

export const getAssetTransferHistory = api<GetTransferHistoryRequest, GetTransferHistoryResponse>(
  { auth: true, expose: true, method: "GET", path: "/assets/:assetId/transfer-history" },
  async (req) => {
    const asset = await assetDB.queryRow<{ id: number }>`
      SELECT id FROM assets WHERE id = ${req.assetId}
    `;

    if (!asset) {
      throw APIError.notFound("asset not found");
    }

    const rows = await assetDB.queryAll<{
      id: number;
      asset_id: number;
      from_user: string | null;
      from_user_email: string | null;
      to_user: string | null;
      to_user_email: string | null;
      from_location: string | null;
      to_location: string | null;
      transfer_date: Date;
      transferred_by: string;
      reason: string | null;
      notes: string | null;
      created_at: Date;
    }>`
      SELECT * 
      FROM asset_transfer_history 
      WHERE asset_id = ${req.assetId}
      ORDER BY transfer_date DESC
    `;

    return {
      transfers: rows.map(row => ({
        id: row.id,
        assetId: row.asset_id,
        fromUser: row.from_user || undefined,
        fromUserEmail: row.from_user_email || undefined,
        toUser: row.to_user || undefined,
        toUserEmail: row.to_user_email || undefined,
        fromLocation: row.from_location || undefined,
        toLocation: row.to_location || undefined,
        transferDate: row.transfer_date,
        transferredBy: row.transferred_by,
        reason: row.reason || undefined,
        notes: row.notes || undefined,
        createdAt: row.created_at,
      })),
    };
  }
);