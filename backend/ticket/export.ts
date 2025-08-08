import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { ticketDB } from "./db";
import type { TicketStatus, TicketPriority } from "./types";
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

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
      const xlsxBuffer = generateXLSXExport(rows);
      const base64Data = xlsxBuffer.toString('base64');
      
      const dateRange = getDateRangeString(req.startDate, req.endDate);
      const filename = `tickets_export_${dateRange}.xlsx`;
      
      return {
        data: base64Data,
        filename,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    } else {
      // Generate PDF report with dashboard data
      const pdfBuffer = await generatePDFReport(rows, req.startDate, req.endDate);
      const base64Data = pdfBuffer.toString('base64');
      
      const dateRange = getDateRangeString(req.startDate, req.endDate);
      const filename = `tickets_report_${dateRange}.pdf`;
      
      return {
        data: base64Data,
        filename,
        contentType: "application/pdf",
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

function generateXLSXExport(rows: any[]): Buffer {
  const headers = [
    "ID", "Subject", "Description", "Status", "Priority", "Assigned Engineer",
    "Reporter Name", "Reporter Email", "Company", "Resolution", "Created At", "Updated At",
    "Resolved At", "Custom Date"
  ];
  
  const data = rows.map(row => [
    row.id,
    row.subject,
    row.description,
    row.status,
    row.priority,
    row.assigned_engineer || "",
    row.reporter_name,
    row.reporter_email || "",
    row.company_name || "",
    row.resolution || "",
    row.created_at,
    row.updated_at,
    row.resolved_at || "",
    row.custom_date || ""
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 10 }, // ID
    { wch: 40 }, // Subject
    { wch: 60 }, // Description
    { wch: 15 }, // Status
    { wch: 15 }, // Priority
    { wch: 25 }, // Assigned Engineer
    { wch: 25 }, // Reporter Name
    { wch: 30 }, // Reporter Email
    { wch: 20 }, // Company
    { wch: 60 }, // Resolution
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
    { wch: 20 }, // Resolved At
    { wch: 20 }, // Custom Date
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets Export");

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}

async function generatePDFReport(rows: any[], startDate?: string, endDate?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: 'IDESOLUSI Helpdesk Tickets Report',
          Author: 'IDESOLUSI Helpdesk System',
          Subject: 'Tickets Report',
          Keywords: 'helpdesk, tickets, report'
        }
      });
      
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Calculate dashboard statistics
      const stats = calculateDashboardStats(rows);
      
      // Header
      doc.fontSize(20).font('Helvetica-Bold');
      doc.text('IDESOLUSI HELPDESK SYSTEM', 50, 50);
      doc.fontSize(16).font('Helvetica');
      doc.text('Tickets Report', 50, 80);
      
      // Report metadata
      doc.fontSize(10).font('Helvetica');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, 110);
      
      if (startDate || endDate) {
        let dateRangeText = 'Date Range: ';
        if (startDate && endDate) {
          dateRangeText += `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
        } else if (startDate) {
          dateRangeText += `From ${new Date(startDate).toLocaleDateString()}`;
        } else if (endDate) {
          dateRangeText += `Until ${new Date(endDate).toLocaleDateString()}`;
        }
        doc.text(dateRangeText, 50, 125);
      }
      
      doc.text(`Total tickets: ${rows.length}`, 50, 140);
      
      // Dashboard Statistics Section
      let yPosition = 170;
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('DASHBOARD STATISTICS', 50, yPosition);
      
      yPosition += 25;
      doc.fontSize(10).font('Helvetica');
      
      // Statistics in two columns
      const leftColumn = 50;
      const rightColumn = 300;
      
      // Left column stats
      doc.font('Helvetica-Bold').text('Ticket Status:', leftColumn, yPosition);
      doc.font('Helvetica').text(`Total Tickets: ${stats.total}`, leftColumn + 10, yPosition + 15);
      doc.text(`Open: ${stats.open}`, leftColumn + 10, yPosition + 30);
      doc.text(`In Progress: ${stats.inProgress}`, leftColumn + 10, yPosition + 45);
      doc.text(`Resolved: ${stats.resolved}`, leftColumn + 10, yPosition + 60);
      doc.text(`Closed: ${stats.closed}`, leftColumn + 10, yPosition + 75);
      doc.text(`This Month: ${stats.monthly}`, leftColumn + 10, yPosition + 90);
      
      // Right column stats
      doc.font('Helvetica-Bold').text('Priority Distribution:', rightColumn, yPosition);
      doc.font('Helvetica').text(`Urgent: ${stats.priorities.urgent}`, rightColumn + 10, yPosition + 15);
      doc.text(`High: ${stats.priorities.high}`, rightColumn + 10, yPosition + 30);
      doc.text(`Medium: ${stats.priorities.medium}`, rightColumn + 10, yPosition + 45);
      doc.text(`Low: ${stats.priorities.low}`, rightColumn + 10, yPosition + 60);
      
      // Engineer assignments
      yPosition += 120;
      doc.font('Helvetica-Bold').text('Engineer Assignments:', leftColumn, yPosition);
      yPosition += 15;
      
      const engineerStats = calculateEngineerStats(rows);
      engineerStats.slice(0, 5).forEach((engineer, index) => {
        doc.font('Helvetica').text(`${engineer.engineer}: ${engineer.count} tickets`, leftColumn + 10, yPosition + (index * 15));
      });
      
      // Recent Activity
      yPosition += 100;
      doc.font('Helvetica-Bold').text('Recent Activity (Last 7 Days):', leftColumn, yPosition);
      yPosition += 15;
      
      const recentTickets = rows.filter(ticket => {
        const ticketDate = new Date(ticket.created_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return ticketDate >= sevenDaysAgo;
      });
      
      doc.font('Helvetica').text(`New tickets in last 7 days: ${recentTickets.length}`, leftColumn + 10, yPosition);
      
      // Add new page for detailed tickets list
      doc.addPage();
      yPosition = 50;
      
      // Detailed Tickets List
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('DETAILED TICKETS LIST', 50, yPosition);
      
      yPosition += 30;
      doc.fontSize(8).font('Helvetica');
      
      // Table headers
      const headers = ['ID', 'Subject', 'Status', 'Priority', 'Reporter', 'Engineer', 'Created'];
      const columnWidths = [30, 150, 60, 50, 80, 80, 70];
      let xPosition = 50;
      
      doc.font('Helvetica-Bold');
      headers.forEach((header, index) => {
        doc.text(header, xPosition, yPosition, { width: columnWidths[index], align: 'left' });
        xPosition += columnWidths[index];
      });
      
      yPosition += 15;
      
      // Draw header line
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 10;
      
      // Table rows
      doc.font('Helvetica');
      rows.forEach((ticket, index) => {
        if (yPosition > 750) { // Check if we need a new page
          doc.addPage();
          yPosition = 50;
          
          // Repeat headers on new page
          xPosition = 50;
          doc.font('Helvetica-Bold');
          headers.forEach((header, headerIndex) => {
            doc.text(header, xPosition, yPosition, { width: columnWidths[headerIndex], align: 'left' });
            xPosition += columnWidths[headerIndex];
          });
          yPosition += 15;
          doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
          yPosition += 10;
          doc.font('Helvetica');
        }
        
        xPosition = 50;
        const rowData = [
          `#${ticket.id}`,
          ticket.subject.length > 25 ? ticket.subject.substring(0, 25) + '...' : ticket.subject,
          ticket.status,
          ticket.priority,
          ticket.reporter_name.length > 15 ? ticket.reporter_name.substring(0, 15) + '...' : ticket.reporter_name,
          ticket.assigned_engineer ? 
            (ticket.assigned_engineer.length > 15 ? ticket.assigned_engineer.substring(0, 15) + '...' : ticket.assigned_engineer) : 
            'Unassigned',
          new Date(ticket.created_at).toLocaleDateString()
        ];
        
        rowData.forEach((data, dataIndex) => {
          doc.text(data, xPosition, yPosition, { width: columnWidths[dataIndex], align: 'left' });
          xPosition += columnWidths[dataIndex];
        });
        
        yPosition += 12;
        
        // Add resolution if exists
        if (ticket.resolution) {
          doc.fontSize(7).fillColor('green');
          doc.text(`Resolution: ${ticket.resolution.length > 80 ? ticket.resolution.substring(0, 80) + '...' : ticket.resolution}`, 
                   80, yPosition, { width: 450 });
          yPosition += 10;
          doc.fontSize(8).fillColor('black');
        }
        
        yPosition += 3;
      });
      
      // Footer on last page
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Helvetica');
        doc.text(`Page ${i + 1} of ${pageCount}`, 50, 780);
        doc.text('IDESOLUSI Helpdesk System - Confidential', 400, 780);
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function calculateDashboardStats(rows: any[]) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  return {
    total: rows.length,
    open: rows.filter(t => t.status === "Open").length,
    inProgress: rows.filter(t => t.status === "In Progress").length,
    resolved: rows.filter(t => t.status === "Resolved").length,
    closed: rows.filter(t => t.status === "Closed").length,
    monthly: rows.filter(t => {
      const ticketDate = new Date(t.created_at);
      return ticketDate.getMonth() === currentMonth && ticketDate.getFullYear() === currentYear;
    }).length,
    priorities: {
      urgent: rows.filter(t => t.priority === "Urgent").length,
      high: rows.filter(t => t.priority === "High").length,
      medium: rows.filter(t => t.priority === "Medium").length,
      low: rows.filter(t => t.priority === "Low").length,
    }
  };
}

function calculateEngineerStats(rows: any[]) {
  const engineerCounts: { [key: string]: number } = {};
  
  rows.forEach(ticket => {
    const engineer = ticket.assigned_engineer || 'Unassigned';
    engineerCounts[engineer] = (engineerCounts[engineer] || 0) + 1;
  });
  
  return Object.entries(engineerCounts)
    .map(([engineer, count]) => ({ engineer, count }))
    .sort((a, b) => b.count - a.count);
}
