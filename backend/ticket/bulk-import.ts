import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { ticketDB } from "./db";
import type { Ticket, TicketStatus, TicketPriority } from "./types";
import { sendTicketNotification } from "./email";

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
      
      // Parse Excel file (simplified - in real implementation use xlsx library)
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
          // Validate required fields
          if (!rowData.subject || !rowData.description || !rowData.reporterName) {
            throw new Error("Missing required fields: subject, description, or reporterName");
          }

          // Determine status based on resolution
          const status: TicketStatus = rowData.resolution && rowData.resolution.trim() 
            ? "Closed" 
            : "Open";

          const now = new Date();
          const customDate = rowData.customDate ? new Date(rowData.customDate) : now;
          
          // Handle "unassigned" value
          const assignedEngineer = rowData.assignedEngineer === "unassigned" || !rowData.assignedEngineer 
            ? null 
            : rowData.assignedEngineer;

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
              ${assignedEngineer}, ${rowData.reporterName}, ${rowData.reporterEmail || null},
              ${rowData.companyName || null}, ${rowData.resolution || null}, 
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
            if (rowData.reporterEmail) {
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

// Simplified Excel parser (in real implementation, use xlsx library)
function parseExcelFile(buffer: Buffer): any[] {
  // This is a simplified implementation
  // In a real application, you would use a library like 'xlsx' to parse Excel files
  
  // For now, we'll simulate parsing by returning mock data
  // In production, this would parse the actual Excel file
  
  try {
    // Mock implementation - replace with actual xlsx parsing
    const mockData = [
      {
        subject: "Sample Ticket 1",
        description: "This is a sample ticket description",
        priority: "Medium",
        assignedEngineer: "John Smith",
        reporterName: "Jane Doe",
        reporterEmail: "jane.doe@example.com",
        companyName: "IDESOLUSI",
        resolution: "", // Empty resolution = Open status
        customDate: new Date().toISOString()
      },
      {
        subject: "Sample Ticket 2",
        description: "This is another sample ticket",
        priority: "High",
        assignedEngineer: "Sarah Johnson",
        reporterName: "Bob Wilson",
        reporterEmail: "bob.wilson@example.com",
        companyName: "IDESOLUSI",
        resolution: "Issue resolved by restarting the service", // Has resolution = Closed status
        customDate: new Date().toISOString()
      }
    ];

    // In real implementation, parse the Excel buffer here
    // const workbook = XLSX.read(buffer, { type: 'buffer' });
    // const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    // const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    return mockData;
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

    // Generate CSV template (in real implementation, generate actual Excel file)
    const csvTemplate = generateCSVTemplate();
    const base64Data = Buffer.from(csvTemplate).toString('base64');
    
    return {
      data: base64Data,
      filename: "ticket_import_template.csv",
      contentType: "text/csv"
    };
  }
);

function generateCSVTemplate(): string {
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
      "",
      new Date().toISOString().split('T')[0]
    ],
    [
      "Another Sample Ticket",
      "Another detailed description",
      "High", 
      "Sarah Johnson",
      "Bob Wilson",
      "bob.wilson@example.com",
      "IDESOLUSI",
      "Issue resolved by restarting service",
      new Date().toISOString().split('T')[0]
    ]
  ];
  
  const csvRows = [headers.join(",")];
  
  for (const row of sampleRows) {
    const csvRow = row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    });
    csvRows.push(csvRow.join(","));
  }
  
  return csvRows.join("\n");
}
