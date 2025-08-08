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
      params.push(new Date(req.startDate));
      paramIndex++;
    }

    if (req.endDate) {
      // Add one day to endDate to include the entire end date
      const endDate = new Date(req.endDate);
      endDate.setDate(endDate.getDate() + 1);
      whereClause += ` AND created_at < $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const query = `
      SELECT 
        id, subject, description, status, priority, assigned_engineer,
        reporter_name, reporter_email, company_name, resolution, created_at, updated_at,
        resolved_at, custom_date
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
      resolution: string | null;
      created_at: Date;
      updated_at: Date;
      resolved_at: Date | null;
      custom_date: Date | null;
    }>(query, ...params);

    if (req.format === "excel") {
      // In a real implementation, you would use a library like xlsx to generate Excel files
      // For now, we'll return CSV data as a placeholder
      const csvData = generateCSV(rows);
      const base64Data = Buffer.from(csvData).toString('base64');
      
      const dateRange = getDateRangeString(req.startDate, req.endDate);
      const filename = `tickets_export_${dateRange}.csv`;
      
      return {
        data: base64Data,
        filename,
        contentType: "text/csv",
      };
    } else {
      // For PDF, you would use a library like puppeteer or pdfkit
      // For now, we'll return a simple text representation
      const textData = generateTextReport(rows, req.startDate, req.endDate);
      const base64Data = Buffer.from(textData).toString('base64');
      
      const dateRange = getDateRangeString(req.startDate, req.endDate);
      const filename = `tickets_export_${dateRange}.txt`;
      
      return {
        data: base64Data,
        filename,
        contentType: "text/plain",
      };
    }
  }
);

function getDateRangeString(startDate?: string, endDate?: string): string {
  if (startDate && endDate) {
    const start = new Date(startDate).toISOString().split('T')[0];
    const end = new Date(endDate).toISOString().split('T')[0];
    return `${start}_to_${end}`;
  } else if (startDate) {
    const start = new Date(startDate).toISOString().split('T')[0];
    return `from_${start}`;
  } else if (endDate) {
    const end = new Date(endDate).toISOString().split('T')[0];
    return `until_${end}`;
  } else {
    return new Date().toISOString().split('T')[0];
  }
}

function generateCSV(rows: any[]): string {
  const headers = [
    "ID", "Subject", "Description", "Status", "Priority", "Assigned Engineer",
    "Reporter Name", "Reporter Email", "Company", "Resolution", "Created At", "Updated At",
    "Resolved At", "Custom Date"
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
      row.resolution ? `"${row.resolution.replace(/"/g, '""')}"` : "",
      row.created_at.toISOString(),
      row.updated_at.toISOString(),
      row.resolved_at ? row.resolved_at.toISOString() : "",
      row.custom_date ? row.custom_date.toISOString() : "",
    ];
    csvRows.push(csvRow.join(","));
  }
  
  return csvRows.join("\n");
}

function generateTextReport(rows: any[], startDate?: string, endDate?: string): string {
  let report = "HELPDESK TICKETS REPORT\n";
  report += "=".repeat(50) + "\n\n";
  report += `Generated on: ${new Date().toLocaleString()}\n`;
  
  if (startDate || endDate) {
    report += "Date Range: ";
    if (startDate && endDate) {
      report += `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}\n`;
    } else if (startDate) {
      report += `From ${new Date(startDate).toLocaleDateString()}\n`;
    } else if (endDate) {
      report += `Until ${new Date(endDate).toLocaleDateString()}\n`;
    }
  }
  
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
    if (row.resolved_at) {
      report += `Resolved: ${row.resolved_at.toLocaleString()}\n`;
    }
    if (row.custom_date) {
      report += `Custom Date: ${row.custom_date.toLocaleString()}\n`;
    }
    report += `Description: ${row.description}\n`;
    if (row.resolution) {
      report += `Resolution: ${row.resolution}\n`;
    }
    report += "\n";
  }
  
  return report;
}
