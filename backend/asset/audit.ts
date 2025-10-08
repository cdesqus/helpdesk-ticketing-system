import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { assetDB } from "./db";
import type { AssetAudit } from "./types";

export interface ScanAssetRequest {
  codeData: string;
  codeFormat?: string;
  notes?: string;
}

export interface ScanAssetResponse {
  status: "valid" | "invalid" | "not_found";
  asset?: {
    id: number;
    assetId: string;
    hostname?: string;
    productName: string;
    serialNumber: string;
    brandName: string;
    location?: string;
    assignedUser?: string;
  };
  message: string;
  auditId: number;
}

export interface ListAuditsRequest {
  assetId?: number;
  limit?: number;
  offset?: number;
}

export interface ListAuditsResponse {
  audits: AssetAudit[];
  total: number;
}

export interface ExportAuditReportRequest {
  format: "pdf" | "excel";
  startDate?: string;
  endDate?: string;
}

export interface ExportAuditReportResponse {
  data: string;
  filename: string;
  contentType: string;
}

export const scanAsset = api<ScanAssetRequest, ScanAssetResponse>(
  { auth: true, expose: true, method: "POST", path: "/assets/scan" },
  async (req) => {
    const auth = getAuthData()!;
    
    if (auth.role === "reporter") {
      throw APIError.permissionDenied("reporters cannot perform asset audits");
    }

    let scannedData;
    
    try {
      scannedData = JSON.parse(req.codeData);
    } catch (error) {
      const asset = await assetDB.queryRow<{
        id: number;
        asset_id: string;
        hostname: string | null;
        product_name: string;
        serial_number: string;
        brand_name: string;
        location: string | null;
        assigned_user: string | null;
        qr_code_data: string | null;
      }>`
        SELECT id, asset_id, hostname, product_name, serial_number, brand_name, location, assigned_user, qr_code_data
        FROM assets 
        WHERE qr_code_data = ${req.codeData} 
           OR asset_id = ${req.codeData}
           OR serial_number = ${req.codeData}
      `;

      if (!asset) {
        const scannedDataStr = req.codeFormat ? `${req.codeFormat}: ${req.codeData}` : req.codeData;
        const auditRow = await assetDB.queryRow<{ id: number }>`
          INSERT INTO asset_audits (asset_id, audited_by, status, scanned_data, notes)
          VALUES (0, ${auth.fullName}, 'not_found', ${scannedDataStr}, ${req.notes || null})
          RETURNING id
        `;

        return {
          status: "not_found",
          message: `Asset not found in database (scanned via ${req.codeFormat || 'QR Code'})`,
          auditId: auditRow?.id || 0,
        };
      }

      const scannedDataStr = req.codeFormat ? `${req.codeFormat}: ${req.codeData}` : req.codeData;
      const auditRow = await assetDB.queryRow<{ id: number }>`
        INSERT INTO asset_audits (asset_id, audited_by, status, scanned_data, notes)
        VALUES (${asset.id}, ${auth.fullName}, 'valid', ${scannedDataStr}, ${req.notes || null})
        RETURNING id
      `;

      return {
        status: "valid",
        asset: {
          id: asset.id,
          assetId: asset.asset_id,
          hostname: asset.hostname || undefined,
          productName: asset.product_name,
          serialNumber: asset.serial_number,
          brandName: asset.brand_name,
          location: asset.location || undefined,
          assignedUser: asset.assigned_user || undefined,
        },
        message: `Asset found and validated (scanned via ${req.codeFormat || 'QR Code'})`,
        auditId: auditRow?.id || 0,
      };
    }

    const { company, hostname, serialNumber, year } = scannedData;

    const asset = await assetDB.queryRow<{
      id: number;
      asset_id: string;
      hostname: string | null;
      product_name: string;
      serial_number: string;
      brand_name: string;
      location: string | null;
      assigned_user: string | null;
      qr_code_data: string | null;
    }>`
      SELECT id, asset_id, hostname, product_name, serial_number, brand_name, location, assigned_user, qr_code_data
      FROM assets 
      WHERE serial_number = ${serialNumber}
      AND (hostname = ${hostname} OR asset_id = ${hostname})
    `;

    if (!asset) {
      const scannedDataStr = req.codeFormat ? `${req.codeFormat}: ${req.codeData}` : req.codeData;
      const auditRow = await assetDB.queryRow<{ id: number }>`
        INSERT INTO asset_audits (asset_id, audited_by, status, scanned_data, notes)
        VALUES (0, ${auth.fullName}, 'not_found', ${scannedDataStr}, ${req.notes || null})
        RETURNING id
      `;

      return {
        status: "not_found",
        message: `Asset not found in database (scanned via ${req.codeFormat || 'QR Code'})`,
        auditId: auditRow?.id || 0,
      };
    }

    const isValid = asset.serial_number === serialNumber && 
                   (asset.hostname === hostname || asset.asset_id === hostname);

    const auditStatus = isValid ? "valid" : "invalid";
    const message = isValid 
      ? `Asset validated successfully (scanned via ${req.codeFormat || 'QR Code'})` 
      : `Asset data mismatch (scanned via ${req.codeFormat || 'QR Code'})`;

    const scannedDataStr = req.codeFormat ? `${req.codeFormat}: ${req.codeData}` : req.codeData;
    const auditRow = await assetDB.queryRow<{ id: number }>`
      INSERT INTO asset_audits (asset_id, audited_by, status, scanned_data, notes)
      VALUES (${asset.id}, ${auth.fullName}, ${auditStatus}, ${scannedDataStr}, ${req.notes || null})
      RETURNING id
    `;

    return {
      status: auditStatus,
      asset: {
        id: asset.id,
        assetId: asset.asset_id,
        hostname: asset.hostname || undefined,
        productName: asset.product_name,
        serialNumber: asset.serial_number,
        brandName: asset.brand_name,
        location: asset.location || undefined,
        assignedUser: asset.assigned_user || undefined,
      },
      message,
      auditId: auditRow?.id || 0,
    };
  }
);

export const listAudits = api<ListAuditsRequest, ListAuditsResponse>(
  { auth: true, expose: true, method: "GET", path: "/assets/audits" },
  async (req) => {
    const auth = getAuthData()!;
    
    if (auth.role === "reporter") {
      throw APIError.permissionDenied("reporters cannot view audit records");
    }

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (req.assetId) {
      whereClause += ` AND asset_id = $${paramIndex}`;
      params.push(req.assetId);
      paramIndex++;
    }

    const limit = req.limit || 50;
    const offset = req.offset || 0;

    const countQuery = `SELECT COUNT(*) as count FROM asset_audits ${whereClause}`;
    const countResult = await assetDB.rawQueryRow<{ count: number }>(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM asset_audits ${whereClause}
      ORDER BY audit_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await assetDB.rawQueryAll<{
      id: number;
      asset_id: number;
      audited_by: string;
      audit_date: Date;
      status: "valid" | "invalid" | "not_found";
      scanned_data: string | null;
      notes: string | null;
    }>(query, ...params);

    const audits: AssetAudit[] = rows.map(row => ({
      id: row.id,
      assetId: row.asset_id,
      auditedBy: row.audited_by,
      auditDate: row.audit_date,
      status: row.status,
      scannedData: row.scanned_data || undefined,
      notes: row.notes || undefined,
    }));

    return { audits, total };
  }
);
