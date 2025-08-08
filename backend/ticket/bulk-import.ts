import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { ticketDB } from "./db";
import type { Ticket, TicketStatus, TicketPriority } from "./types";
import { sendTicketNotification } from "./email";
import * as XLSX from 'xlsx';

export interface BulkImportTicketsRequest {
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
  createdTickets: Ticket[];
}

// Bulk import tickets from Excel file.
export const bulkImportTickets = api<BulkImportTicketsRequest, BulkImportResult>(
  { auth: true, expose: true, method: "POST", path: "/tickets/bulk-import" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only admins can bulk import tickets
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can bulk import tickets");
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
        createdTickets: []
      };

      console.log(`Processing ${excelData.length} rows from Excel file`);

      // Process each row
      for (let i = 0; i < excelData.length; i++) {
        const rowData = excelData[i];
        const rowNumber = i + 2; // Excel row number (accounting for header)

        try {
          // Validate required fields using normalized keys
          if (!rowData.subject || !rowData.description || !rowData.reportername) {
            throw new Error("Missing required fields: subject, description, or reporterName");
          }

          // Determine status based on resolution
          const status: TicketStatus = rowData.resolution && String(rowData.resolution).trim() 
            ? "Closed" 
            : "Open";

          const now = new Date();
          const customDate = rowData.customdate ? new Date(rowData.customdate) : now;
          
          // Handle "unassigned" value
          const assignedEngineer = rowData.assignedengineer === "unassigned" || !rowData.assignedengineer 
            ? null 
            : rowData.assignedengineer;

          // Insert ticket into database
          const row = await ticketDB.queryRow<{
            id: number;
            subject: string;
            description: string;
            status: TicketStatus;
            priority: TicketPriority;
            assigned_engineer: string | null;
            reporter_name: string;
            reporter_email: string | null;
            company_name: string | null;
            resolution: string | null;
            created_at: Date;
            updated_at: Date;
            resolved_at: Date | null;
            custom_date: Date | null;
          }>`
            INSERT INTO tickets (
              subject, description, status, priority, assigned_engineer,
              reporter_name, reporter_email, company_name, resolution, 
              custom_date, created_at, updated_at, resolved_at
            ) VALUES (
              ${rowData.subject}, ${rowData.description}, ${status}, ${rowData.priority || "Medium"},
              ${assignedEngineer}, ${rowData.reportername}, ${rowData.reporteremail || null},
              ${rowData.companyname || null}, ${rowData.resolution || null}, 
              ${customDate}, ${customDate}, ${now}, ${status === "Closed" ? now : null}
            )
            RETURNING *
          `;

          if (row) {
            const ticket: Ticket = {
              id: row.id,
              subject: row.subject,
              description: row.description,
              status: row.status,
              priority: row.priority,
              assignedEngineer: row.assigned_engineer || undefined,
              reporterName: row.reporter_name,
              reporterEmail: row.reporter_email || undefined,
              companyName: row.company_name || undefined,
              resolution: row.resolution || undefined,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              resolvedAt: row.resolved_at || undefined,
              customDate: row.custom_date || undefined,
            };

            result.createdTickets.push(ticket);
            result.successCount++;

            // Send email notification if reporter has email
            if (rowData.reporteremail) {
              try {
                await sendTicketNotification(ticket, "created");
              } catch (emailError) {
                console.error(`Failed to send email for ticket ${ticket.id}:`, emailError);
                // Don't fail the import if email fails
              }
            }

            console.log(`Successfully imported ticket #${ticket.id} from row ${rowNumber}`);
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
      dateNF: 'yyyy-mm-dd hh:mm:ss'
    });

    // Normalize keys to be consistent (lowercase, no spaces)
    return jsonData.map(row => {
      const newRow: { [key: string]: any } = {};
      for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
          const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '');
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
  { auth: true, expose: true, method: "GET", path: "/tickets/import-template" },
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
      filename: "ticket_import_template.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
  }
);

function generateXLSXTemplateBuffer(): Buffer {
  const headers = [
    "subject",
    "description", 
    "priority",
    "assignedEngineer",
    "reporterName",
    "reporterEmail",
    "companyName",
    "resolution",
    "customDate"
  ];
  
  const sampleRows = [
    [
      "Sample Ticket Subject",
      "Detailed description of the issue or request",
      "Medium",
      "John Smith",
      "Jane Doe",
      "jane.doe@example.com",
      "IDESOLUSI",
      "", // Empty resolution = Open status
      new Date()
    ],
    [
      "Another Sample Ticket",
      "Another detailed description",
      "High", 
      "Sarah Johnson",
      "Bob Wilson",
      "bob.wilson@example.com",
      "IDESOLUSI",
      "Issue resolved by restarting service", // Has resolution = Closed status
      new Date()
    ]
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  
  worksheet['!cols'] = [
    { wch: 30 }, // subject
    { wch: 50 }, // description
    { wch: 15 }, // priority
    { wch: 20 }, // assignedEngineer
    { wch: 20 }, // reporterName
    { wch: 25 }, // reporterEmail
    { wch: 20 }, // companyName
    { wch: 50 }, // resolution
    { wch: 20 }, // customDate
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets");

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}
