import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { assetDB } from "./db";
import type { Asset, AssetCategory, AssetStatus } from "./types";
import * as XLSX from 'xlsx';

export interface BulkImportAssetsRequest {
  data: string; // Base64 encoded Excel file data
  filename: string;
}

export interface BulkImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
  createdAssets: Asset[];
}

// Bulk import assets from Excel file.
export const bulkImportAssets = api<BulkImportAssetsRequest, BulkImportResult>(
  { auth: true, expose: true, method: "POST", path: "/assets/bulk-import" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only admins can bulk import assets
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can bulk import assets");
    }

    console.log(`Admin ${auth.username} starting bulk import of file: ${req.filename}`);

    try {
      // Decode base64 data
      const fileBuffer = Buffer.from(req.data, 'base64');
      
      // Parse Excel file
      const excelData = parseExcelFile(fileBuffer);
      
      const result: BulkImportResult = {
        totalRows: excelData.length,
        successCount: 0,
        errorCount: 0,
        errors: [],
        createdAssets: []
      };

      console.log(`Processing ${excelData.length} rows from Excel file`);

      // Process each row
      for (let i = 0; i < excelData.length; i++) {
        const rowData = excelData[i];
        const rowNumber = i + 2; // Excel row number (accounting for header)

        try {
          // Validate required fields using normalized keys
          if (!rowData.assetid || !rowData.productname || !rowData.serialnumber || !rowData.brandname) {
            throw new Error("Missing required fields: assetId, productName, serialNumber, or brandName");
          }

          // Check if asset ID already exists
          const existingAsset = await assetDB.queryRow`
            SELECT id FROM assets WHERE asset_id = ${rowData.assetid}
          `;
          if (existingAsset) {
            throw new Error(`Asset ID ${rowData.assetid} already exists`);
          }

          // Generate QR code data
          const currentYear = new Date().getFullYear();
          const qrCodeData = JSON.stringify({
            company: "IDESOLUSI",
            hostname: rowData.hostname || rowData.assetid,
            serialNumber: rowData.serialnumber,
            year: rowData.dateacquired ? new Date(rowData.dateacquired).getFullYear() : currentYear,
          });

          const now = new Date();
          const dateAcquired = rowData.dateacquired ? new Date(rowData.dateacquired) : null;
          const warrantyExpiryDate = rowData.warrantyexpirydate ? new Date(rowData.warrantyexpirydate) : null;

          // Validate and normalize category
          const validCategories: AssetCategory[] = ["laptop", "network_device", "printer", "license", "scanner", "consumable"];
          let category: AssetCategory = "laptop"; // default
          if (rowData.category && validCategories.includes(rowData.category.toLowerCase() as AssetCategory)) {
            category = rowData.category.toLowerCase() as AssetCategory;
          }

          // Validate and normalize status
          const validStatuses: AssetStatus[] = ["in_use", "available", "out_of_order", "maintenance", "retired"];
          let status: AssetStatus = "available"; // default
          if (rowData.currentstatus && validStatuses.includes(rowData.currentstatus.toLowerCase().replace(/\s+/g, '_') as AssetStatus)) {
            status = rowData.currentstatus.toLowerCase().replace(/\s+/g, '_') as AssetStatus;
          }

          // Insert asset into database
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
          }>`
            INSERT INTO assets (
              asset_id, hostname, product_name, serial_number, brand_name, model, category,
              location, assigned_user, assigned_user_email, date_acquired, warranty_expiry_date,
              status, comments, qr_code_data, total_licenses, used_licenses, 
              is_consumable, quantity, min_stock_level, created_at, updated_at
            ) VALUES (
              ${rowData.assetid}, ${rowData.hostname || null}, ${rowData.productname}, ${rowData.serialnumber},
              ${rowData.brandname}, ${rowData.model || null}, ${category}, ${rowData.location || null},
              ${rowData.assigneduser || null}, ${rowData.assigneduseremail || rowData.pic || null}, 
              ${dateAcquired}, ${warrantyExpiryDate}, ${status}, ${rowData.comments || null},
              ${qrCodeData}, ${rowData.totallicenses ? parseInt(rowData.totallicenses) : null}, 
              ${rowData.usedlicenses ? parseInt(rowData.usedlicenses) : null},
              ${category === 'consumable'}, 
              ${category === 'consumable' && rowData.quantity ? parseInt(rowData.quantity) : null},
              ${category === 'consumable' && rowData.minstocklevel ? parseInt(rowData.minstocklevel) : null},
              ${now}, ${now}
            )
            RETURNING *
          `;

          if (row) {
            const asset: Asset = {
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

            result.createdAssets.push(asset);
            result.successCount++;

            console.log(`Successfully imported asset ${asset.assetId} from row ${rowNumber}`);
          }
        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          result.errorCount++;
          result.errors.push({
            row: rowNumber,
            error: error instanceof Error ? error.message : String(error),
            data: rowData
          });
        }
      }

      console.log(`Bulk import completed: ${result.successCount} success, ${result.errorCount} errors`);

      return result;
    } catch (error) {
      console.error("Bulk import failed:", error);
      throw APIError.internal(`Bulk import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

function parseExcelFile(buffer: Buffer): any[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      dateNF: 'yyyy-mm-dd'
    });

    // Normalize keys to be consistent (lowercase, no spaces)
    return jsonData.map(row => {
      const newRow: { [key: string]: any } = {};
      for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
          const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
          newRow[normalizedKey] = row[key];
        }
      }
      return newRow;
    });
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Generate Excel template for bulk import
export const generateImportTemplate = api<void, { data: string; filename: string; contentType: string }>(
  { auth: true, expose: true, method: "GET", path: "/assets/import-template" },
  async () => {
    const auth = getAuthData()!;
    
    // Only admins can download template
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can download import template");
    }

    const xlsxBuffer = generateXLSXTemplateBuffer();
    const base64Data = xlsxBuffer.toString('base64');
    
    return {
      data: base64Data,
      filename: "asset_import_template.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
  }
);

function generateXLSXTemplateBuffer(): Buffer {
  const headers = [
    "assetId",
    "hostname",
    "productName",
    "serialNumber",
    "brandName",
    "model",
    "category",
    "location",
    "assignedUser",
    "assignedUserEmail",
    "dateAcquired",
    "warrantyExpiryDate",
    "currentStatus",
    "comments",
    "totalLicenses",
    "usedLicenses"
  ];
  
  const sampleRows = [
    [
      "LAPTOP001",
      "LAPTOP-JOHN01",
      "Laptop",
      "DL123456789",
      "Dell",
      "XPS 13",
      "laptop",
      "Office Floor 1",
      "John Doe",
      "john.doe@idesolusi.co.id",
      "2023-01-15",
      "2025-01-15",
      "in_use",
      "Primary work laptop",
      "",
      ""
    ],
    [
      "LICENSE001",
      "MS-OFFICE-365",
      "Microsoft Office 365",
      "MSO365-12345",
      "Microsoft",
      "Business Premium",
      "license",
      "Software Licenses",
      "",
      "",
      "2023-01-01",
      "2024-01-01",
      "in_use",
      "Corporate license pool",
      "50",
      "35"
    ],
    [
      "PRINTER001",
      "PRINTER-01",
      "Laser Printer",
      "HP987654321",
      "HP",
      "LaserJet Pro 400",
      "printer",
      "Office Reception",
      "Reception Team",
      "reception@idesolusi.co.id",
      "2022-06-10",
      "2024-06-10",
      "in_use",
      "Main office printer",
      "",
      ""
    ]
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  
  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 15 }, // assetId
    { wch: 20 }, // hostname
    { wch: 25 }, // productName
    { wch: 20 }, // serialNumber
    { wch: 15 }, // brandName
    { wch: 20 }, // model
    { wch: 15 }, // category
    { wch: 20 }, // location
    { wch: 20 }, // assignedUser
    { wch: 25 }, // assignedUserEmail
    { wch: 15 }, // dateAcquired
    { wch: 18 }, // warrantyExpiryDate
    { wch: 15 }, // currentStatus
    { wch: 30 }, // comments
    { wch: 15 }, // totalLicenses
    { wch: 15 }, // usedLicenses
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");

  // Generate buffer
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}
