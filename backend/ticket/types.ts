export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

export interface Ticket {
  id: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedEngineer?: string;
  reporterName: string;
  reporterEmail?: string;
  companyName?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  customDate?: Date;
}

export interface Engineer {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export interface TicketComment {
  id: number;
  ticketId: number;
  authorName: string;
  authorEmail?: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export interface TicketTrend {
  date: string;
  count: number;
}

export interface EngineerStats {
  engineer: string;
  count: number;
}

export interface SMTPConfig {
  id?: number;
  provider: string;
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
}

export interface SystemConfig {
  id: number;
  systemName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  createdAt: Date;
  updatedAt: Date;
}
