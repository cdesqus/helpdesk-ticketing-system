import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { assetDB } from "./db";
import type { AssetCategory, AssetStatus } from "./types";
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

export interface ExportAssetsRequest {
  format: Query<"excel" | "pdf">;
  category?: Query<AssetCategory>;
  status?: Query<AssetStatus>;
  assignedUser?: Query<string>;
  search?: Query<string>;
}

export interface ExportAssetsResponse {
  data: string; // Base64 encoded file data
  filename: string;
  contentType: string;
}

export interface ExportAuditReportRequest {
  format: Query<"excel" | "pdf">;
  startDate?: Query<string>;
  endDate?: Query<string>;
}

export interface ExportAuditReportResponse {
  data: string;
  filename: string;
  contentType: string;
}

// Exports assets to Excel or PDF format.
export const exportAssets = api<ExportAssetsRequest, ExportAssetsResponse>(
  { auth: true, expose: true, method: "GET", path: "/assets/export" },
  async (req) => {
    const auth = getAuthData()!;
    
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    // Apply role-based filtering
    if (auth.role === "reporter") {
      // Reporters can only export assets assigned to them
      whereClause += ` AND (assigned_user_email = $${paramIndex} OR assigned_user = $${paramIndex})`;
      params.push(auth.email);
      paramIndex++;
    }

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

    const query = `
      SELECT 
        asset_id, hostname, product_name, serial_number, brand_name, model, category,
        location, assigned_user, assigned_user_email, date_acquired, warranty_expiry_date,
        status, comments, total_licenses, used_licenses, created_at, updated_at
      FROM assets ${whereClause}
      ORDER BY category, asset_id
    `;

    const rows = await assetDB.rawQueryAll<{
      asset_id: string;
      hostname: string | null;
      product_name: string;
      serial_number: string;
      brand_name: string;
      model: string | null;
      category: string;
      location: string | null;
      assigned_user: string | null;
      assigned_user_email: string | null;
      date_acquired: Date | null;
      warranty_expiry_date: Date | null;
      status: string;
      comments: string | null;
      total_licenses: number | null;
      used_licenses: number | null;
      created_at: Date;
      updated_at: Date;
    }>(query, ...params);

    const dateRange = new Date().toISOString().split('T')[0];
    const filename = `assets_export_${dateRange}`;

    if (req.format === "excel") {
      const xlsxBuffer = generateAssetsXLSXExport(rows);
      const base64Data = xlsxBuffer.toString('base64');
      
      return {
        data: base64Data,
        filename: `${filename}.xlsx`,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    } else {
      // Generate PDF report
      const pdfBuffer = await generateAssetsPDFReport(rows);
      const base64Data = pdfBuffer.toString('base64');
      
      return {
        data: base64Data,
        filename: `${filename}.pdf`,
        contentType: "application/pdf",
      };
    }
  }
);

// Exports audit report to Excel or PDF format.
export const exportAuditReport = api<ExportAuditReportRequest, ExportAuditReportResponse>(
  { auth: true, expose: true, method: "GET", path: "/assets/audit-report" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only admins and engineers can export audit reports
    if (auth.role === "reporter") {
      throw APIError.permissionDenied("reporters cannot export audit reports");
    }

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (req.startDate) {
      whereClause += ` AND aa.audit_date >= $${paramIndex}`;
      params.push(new Date(req.startDate));
      paramIndex++;
    }

    if (req.endDate) {
      // Add one day to endDate to include the entire end date
      const endDate = new Date(req.endDate);
      endDate.setDate(endDate.getDate() + 1);
      whereClause += ` AND aa.audit_date < $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const query = `
      SELECT 
        aa.id, aa.audited_by, aa.audit_date, aa.status as audit_status, aa.scanned_data, aa.notes,
        a.asset_id, a.hostname, a.product_name, a.serial_number, a.brand_name, a.location, a.assigned_user
      FROM asset_audits aa
      LEFT JOIN assets a ON aa.asset_id = a.id
      ${whereClause}
      ORDER BY aa.audit_date DESC
    `;

    const rows = await assetDB.rawQueryAll<{
      id: number;
      audited_by: string;
      audit_date: Date;
      audit_status: string;
      scanned_data: string | null;
      notes: string | null;
      asset_id: string | null;
      hostname: string | null;
      product_name: string | null;
      serial_number: string | null;
      brand_name: string | null;
      location: string | null;
      assigned_user: string | null;
    }>(query, ...params);

    const dateRange = req.startDate && req.endDate ? 
      `${req.startDate}_to_${req.endDate}` : 
      new Date().toISOString().split('T')[0];
    const filename = `audit_report_${dateRange}`;

    if (req.format === "excel") {
      const xlsxBuffer = generateAuditXLSXExport(rows);
      const base64Data = xlsxBuffer.toString('base64');
      
      return {
        data: base64Data,
        filename: `${filename}.xlsx`,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    } else {
      // Generate PDF report
      const pdfBuffer = await generateAuditPDFReport(rows, req.startDate, req.endDate);
      const base64Data = pdfBuffer.toString('base64');
      
      return {
        data: base64Data,
        filename: `${filename}.pdf`,
        contentType: "application/pdf",
      };
    }
  }
);

function generateAssetsXLSXExport(rows: any[]): Buffer {
  const headers = [
    "Asset ID", "Hostname", "Product Name", "Serial Number", "Brand Name", "Model", "Category",
    "Location", "Assigned User", "Assigned User Email", "Date Acquired", "Warranty Expiry Date",
    "Status", "Comments", "Total Licenses", "Used Licenses", "Created At", "Updated At"
  ];
  
  const data = rows.map(row => [
    row.asset_id,
    row.hostname || "",
    row.product_name,
    row.serial_number,
    row.brand_name,
    row.model || "",
    row.category,
    row.location || "",
    row.assigned_user || "",
    row.assigned_user_email || "",
    row.date_acquired ? new Date(row.date_acquired).toLocaleDateString() : "",
    row.warranty_expiry_date ? new Date(row.warranty_expiry_date).toLocaleDateString() : "",
    row.status,
    row.comments || "",
    row.total_licenses || "",
    row.used_licenses || "",
    new Date(row.created_at).toLocaleDateString(),
    new Date(row.updated_at).toLocaleDateString()
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
    { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 30 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Assets Export");

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}

function generateAuditXLSXExport(rows: any[]): Buffer {
  const headers = [
    "Audit ID", "Audited By", "Audit Date", "Status", "Asset ID", "Hostname", "Product Name",
    "Serial Number", "Brand Name", "Location", "Assigned User", "Scanned Data", "Notes"
  ];
  
  const data = rows.map(row => [
    row.id,
    row.audited_by,
    new Date(row.audit_date).toLocaleString(),
    row.audit_status,
    row.asset_id || "NOT FOUND",
    row.hostname || "",
    row.product_name || "",
    row.serial_number || "",
    row.brand_name || "",
    row.location || "",
    row.assigned_user || "",
    row.scanned_data || "",
    row.notes || ""
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 },
    { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 30 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Report");

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}

async function generateAssetsPDFReport(rows: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: 'IDESOLUSI IT Asset Management Report',
          Author: 'IDESOLUSI IT Asset Management System',
          Subject: 'Assets Report',
          Keywords: 'assets, IT, management, report'
        }
      });
      
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold');
      doc.text('IDESOLUSI IT ASSET MANAGEMENT', 50, 50);
      doc.fontSize(16).font('Helvetica');
      doc.text('Assets Report', 50, 80);
      
      // Report metadata
      doc.fontSize(10).font('Helvetica');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, 110);
      doc.text(`Total assets: ${rows.length}`, 50, 125);
      
      // Group assets by category
      const assetsByCategory = rows.reduce((acc, asset) => {
        if (!acc[asset.category]) {
          acc[asset.category] = [];
        }
        acc[asset.category].push(asset);
        return acc;
      }, {});

      let yPosition = 160;

      // Generate report for each category
      for (const [category, assets] of Object.entries(assetsByCategory)) {
        // Check if we need a new page
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        // Category header
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text(`${category.toUpperCase().replace('_', ' ')} (${(assets as any[]).length} assets)`, 50, yPosition);
        yPosition += 25;

        // Assets table
        doc.fontSize(8).font('Helvetica');
        
        (assets as any[]).forEach((asset) => {
          if (yPosition > 750) {
            doc.addPage();
            yPosition = 50;
          }

          doc.text(`${asset.asset_id}`, 50, yPosition, { width: 80 });
          doc.text(`${asset.product_name}`, 130, yPosition, { width: 100 });
          doc.text(`${asset.brand_name} ${asset.model || ''}`.trim(), 230, yPosition, { width: 100 });
          doc.text(`${asset.serial_number}`, 330, yPosition, { width: 80 });
          doc.text(`${asset.status}`, 410, yPosition, { width: 60 });
          doc.text(`${asset.assigned_user || 'Unassigned'}`, 470, yPosition, { width: 80 });
          
          yPosition += 12;
        });

        yPosition += 20;
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function generateAuditPDFReport(rows: any[], startDate?: string, endDate?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: 'IDESOLUSI IT Asset Audit Report',
          Author: 'IDESOLUSI IT Asset Management System',
          Subject: 'Asset Audit Report',
          Keywords: 'assets, audit, IT, management, report'
        }
      });
      
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Calculate audit statistics
      const totalAudits = rows.length;
      const validAudits = rows.filter(r => r.audit_status === 'valid').length;
      const invalidAudits = rows.filter(r => r.audit_status === 'invalid').length;
      const notFoundAudits = rows.filter(r => r.audit_status === 'not_found').length;

      // Header
      doc.fontSize(20).font('Helvetica-Bold');
      doc.text('IDESOLUSI IT ASSET MANAGEMENT', 50, 50);
      doc.fontSize(16).font('Helvetica');
      doc.text('Asset Audit Report', 50, 80);
      
      // Report metadata
      doc.fontSize(10).font('Helvetica');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, 110);
      
      if (startDate || endDate) {
        let dateRangeText = 'Audit Period: ';
        if (startDate && endDate) {
          dateRangeText += `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
        } else if (startDate) {
          dateRangeText += `From ${new Date(startDate).toLocaleDateString()}`;
        } else if (endDate) {
          dateRangeText += `Until ${new Date(endDate).toLocaleDateString()}`;
        }
        doc.text(dateRangeText, 50, 125);
      }

      // Statistics
      let yPosition = 150;
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('AUDIT SUMMARY', 50, yPosition);
      yPosition += 20;

      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Audits: ${totalAudits}`, 50, yPosition);
      doc.text(`Valid Assets: ${validAudits} (${totalAudits > 0 ? Math.round((validAudits / totalAudits) * 100) : 0}%)`, 200, yPosition);
      yPosition += 15;
      doc.text(`Invalid Assets: ${invalidAudits} (${totalAudits > 0 ? Math.round((invalidAudits / totalAudits) * 100) : 0}%)`, 50, yPosition);
      doc.text(`Not Found: ${notFoundAudits} (${totalAudits > 0 ? Math.round((notFoundAudits / totalAudits) * 100) : 0}%)`, 200, yPosition);

      yPosition += 30;

      // Audit details
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('AUDIT DETAILS', 50, yPosition);
      yPosition += 20;

      // Table headers
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('Date', 50, yPosition);
      doc.text('Auditor', 100, yPosition);
      doc.text('Status', 160, yPosition);
      doc.text('Asset ID', 200, yPosition);
      doc.text('Product', 250, yPosition);
      doc.text('Serial Number', 350, yPosition);
      doc.text('Location', 450, yPosition);
      yPosition += 15;

      // Draw header line
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 10;

      // Table rows
      doc.fontSize(7).font('Helvetica');
      rows.forEach((audit) => {
        if (yPosition > 750) {
          doc.addPage();
          yPosition = 50;
          
          // Repeat headers on new page
          doc.fontSize(8).font('Helvetica-Bold');
          doc.text('Date', 50, yPosition);
          doc.text('Auditor', 100, yPosition);
          doc.text('Status', 160, yPosition);
          doc.text('Asset ID', 200, yPosition);
          doc.text('Product', 250, yPosition);
          doc.text('Serial Number', 350, yPosition);
          doc.text('Location', 450, yPosition);
          yPosition += 15;
          doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
          yPosition += 10;
          doc.fontSize(7).font('Helvetica');
        }

        doc.text(new Date(audit.audit_date).toLocaleDateString(), 50, yPosition, { width: 45 });
        doc.text(audit.audited_by, 100, yPosition, { width: 55 });
        doc.text(audit.audit_status.toUpperCase(), 160, yPosition, { width: 35 });
        doc.text(audit.asset_id || 'N/A', 200, yPosition, { width: 45 });
        doc.text(audit.product_name || 'N/A', 250, yPosition, { width: 95 });
        doc.text(audit.serial_number || 'N/A', 350, yPosition, { width: 95 });
        doc.text(audit.location || 'N/A', 450, yPosition, { width: 95 });
        
        yPosition += 12;
      });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
