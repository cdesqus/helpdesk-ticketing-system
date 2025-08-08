import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { ticketDB } from "./db";
import type { TicketStatus, TicketPriority } from "./types";

export interface ExportTicketsRequest {
  format: Query<"excel" | "pdf">;
  status?: Query<TicketStatus>;
  priority?: Query<TicketPriority>;
  assignedEngineer?: Query<string>;
  search?: Query<string>;
  startDate?: Query<string>;
  endDate?: Query<string>;
}

export interface ExportTicketsResponse {
  data: string; // Base64 encoded file data
  filename: string;
  contentType: string;
}

// Exports tickets to Excel or PDF format.
export const exportTickets = api<ExportTicketsRequest, ExportTicketsResponse>(
  { expose: true, method: "GET", path: "/tickets/export" },
  async (req) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (req.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(req.status);
      paramIndex++;
    }

    if (req.priority) {
      whereClause += ` AND priority = $${paramIndex}`;
      params.push(req.priority);
      paramIndex++;
    }

    if (req.assignedEngineer) {
      whereClause += ` AND assigned_engineer = $${paramIndex}`;
      params.push(req.assignedEngineer);
      paramIndex++;
    }

    if (req.search) {
      whereClause += ` AND (subject ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR reporter_name ILIKE $${paramIndex})`;
      params.push(`%${req.search}%`);
      paramIndex++;
    }

    if (req.startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(req.startDate);
      paramIndex++;
    }

    if (req.endDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(req.endDate);
      paramIndex++;
    }

    const query = `
      SELECT 
        id, subject, description, status, priority, assigned_engineer,
        reporter_name, reporter_email, company_name, created_at, updated_at
      FROM tickets ${whereClause}
      ORDER BY created_at DESC
    `;

    const rows = await ticketDB.rawQueryAll<{
      id: number;
      subject: string;
      description: string;
      status: string;
      priority: string;
      assigned_engineer: string | null;
      reporter_name: string;
      reporter_email: string | null;
      company_name: string | null;
      created_at: Date;
      updated_at: Date;
    }>(query, ...params);

    if (req.format === "excel") {
      // In a real implementation, you would use a library like xlsx to generate Excel files
      // For now, we'll return CSV data as a placeholder
      const csvData = generateCSV(rows);
      const base64Data = Buffer.from(csvData).toString('base64');
      
      return {
        data: base64Data,
        filename: `tickets_export_${new Date().toISOString().split('T')[0]}.csv`,
        contentType: "text/csv",
      };
    } else {
      // For PDF, you would use a library like puppeteer or pdfkit
      // For now, we'll return a simple text representation
      const textData = generateTextReport(rows);
      const base64Data = Buffer.from(textData).toString('base64');
      
      return {
        data: base64Data,
        filename: `tickets_export_${new Date().toISOString().split('T')[0]}.txt`,
        contentType: "text/plain",
      };
    }
  }
);

function generateCSV(rows: any[]): string {
  const headers = [
    "ID", "Subject", "Description", "Status", "Priority", "Assigned Engineer",
    "Reporter Name", "Reporter Email", "Company", "Created At", "Updated At"
  ];
  
  const csvRows = [headers.join(",")];
  
  for (const row of rows) {
    const csvRow = [
      row.id,
      `"${row.subject.replace(/"/g, '""')}"`,
      `"${row.description.replace(/"/g, '""')}"`,
      row.status,
      row.priority,
      row.assigned_engineer || "",
      `"${row.reporter_name.replace(/"/g, '""')}"`,
      row.reporter_email || "",
      row.company_name || "",
      row.created_at.toISOString(),
      row.updated_at.toISOString(),
    ];
    csvRows.push(csvRow.join(","));
  }
  
  return csvRows.join("\n");
}

function generateTextReport(rows: any[]): string {
  let report = "HELPDESK TICKETS REPORT\n";
  report += "=".repeat(50) + "\n\n";
  report += `Generated on: ${new Date().toLocaleString()}\n`;
  report += `Total tickets: ${rows.length}\n\n`;
  
  for (const row of rows) {
    report += `Ticket #${row.id}\n`;
    report += `-`.repeat(20) + "\n";
    report += `Subject: ${row.subject}\n`;
    report += `Status: ${row.status}\n`;
    report += `Priority: ${row.priority}\n`;
    report += `Assigned Engineer: ${row.assigned_engineer || "Not assigned"}\n`;
    report += `Reporter: ${row.reporter_name}\n`;
    report += `Email: ${row.reporter_email || "N/A"}\n`;
    report += `Company: ${row.company_name || "N/A"}\n`;
    report += `Created: ${row.created_at.toLocaleString()}\n`;
    report += `Updated: ${row.updated_at.toLocaleString()}\n`;
    report += `Description: ${row.description}\n\n`;
  }
  
  return report;
}
