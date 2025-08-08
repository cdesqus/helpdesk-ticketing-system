import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { ticketDB } from "./db";
import type { TicketComment } from "./types";

export interface AddCommentRequest {
  ticketId: number;
  content: string;
  isInternal?: boolean;
}

export interface ListCommentsRequest {
  ticketId: number;
}

export interface ListCommentsResponse {
  comments: TicketComment[];
}

export interface UpdateCommentRequest {
  id: number;
  content: string;
}

export interface DeleteCommentRequest {
  id: number;
}

// Adds a comment to a ticket.
export const addComment = api<AddCommentRequest, TicketComment>(
  { auth: true, expose: true, method: "POST", path: "/tickets/:ticketId/comments" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Verify ticket exists and user has access
    const ticket = await ticketDB.queryRow<{
      id: number;
      assigned_engineer: string | null;
      reporter_email: string | null;
    }>`SELECT id, assigned_engineer, reporter_email FROM tickets WHERE id = ${req.ticketId}`;
    
    if (!ticket) {
      throw APIError.notFound("ticket not found");
    }

    // Apply role-based access control
    if (auth.role === "engineer") {
      // Engineers can only comment on tickets assigned to them
      if (ticket.assigned_engineer !== auth.fullName) {
        throw APIError.permissionDenied("you can only comment on tickets assigned to you");
      }
    } else if (auth.role === "reporter") {
      // Reporters can only comment on their own tickets
      if (ticket.reporter_email !== auth.email) {
        throw APIError.permissionDenied("you can only comment on your own tickets");
      }
      // Reporters cannot create internal comments
      if (req.isInternal) {
        throw APIError.permissionDenied("reporters cannot create internal comments");
      }
    }
    // Admins can comment on any ticket

    const now = new Date();
    const row = await ticketDB.queryRow<{
      id: number;
      ticket_id: number;
      author_name: string;
      author_email: string | null;
      content: string;
      is_internal: boolean;
      created_at: Date;
      updated_at: Date;
    }>`
      INSERT INTO ticket_comments (
        ticket_id, author_name, author_email, content, is_internal, created_at, updated_at
      ) VALUES (
        ${req.ticketId}, ${auth.fullName}, ${auth.email}, 
        ${req.content}, ${req.isInternal || false}, ${now}, ${now}
      )
      RETURNING *
    `;

    if (!row) {
      throw new Error("Failed to add comment");
    }

    // Update ticket's updated_at timestamp
    await ticketDB.exec`UPDATE tickets SET updated_at = ${now} WHERE id = ${req.ticketId}`;

    return {
      id: row.id,
      ticketId: row.ticket_id,
      authorName: row.author_name,
      authorEmail: row.author_email || undefined,
      content: row.content,
      isInternal: row.is_internal,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

// Retrieves all comments for a ticket with role-based filtering.
export const listComments = api<ListCommentsRequest, ListCommentsResponse>(
  { auth: true, expose: true, method: "GET", path: "/tickets/:ticketId/comments" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Verify ticket exists and user has access
    const ticket = await ticketDB.queryRow<{
      id: number;
      assigned_engineer: string | null;
      reporter_email: string | null;
    }>`SELECT id, assigned_engineer, reporter_email FROM tickets WHERE id = ${req.ticketId}`;
    
    if (!ticket) {
      throw APIError.notFound("ticket not found");
    }

    // Apply role-based access control
    if (auth.role === "engineer") {
      // Engineers can only view comments on tickets assigned to them
      if (ticket.assigned_engineer !== auth.fullName) {
        throw APIError.permissionDenied("you can only view comments on tickets assigned to you");
      }
    } else if (auth.role === "reporter") {
      // Reporters can only view comments on their own tickets
      if (ticket.reporter_email !== auth.email) {
        throw APIError.permissionDenied("you can only view comments on your own tickets");
      }
    }
    // Admins can view all comments

    let whereClause = "WHERE ticket_id = $1";
    const params: any[] = [req.ticketId];

    // Reporters cannot see internal comments
    if (auth.role === "reporter") {
      whereClause += " AND is_internal = false";
    }

    const query = `
      SELECT * FROM ticket_comments 
      ${whereClause}
      ORDER BY created_at ASC
    `;

    const rows = await ticketDB.rawQueryAll<{
      id: number;
      ticket_id: number;
      author_name: string;
      author_email: string | null;
      content: string;
      is_internal: boolean;
      created_at: Date;
      updated_at: Date;
    }>(query, ...params);

    const comments: TicketComment[] = rows.map(row => ({
      id: row.id,
      ticketId: row.ticket_id,
      authorName: row.author_name,
      authorEmail: row.author_email || undefined,
      content: row.content,
      isInternal: row.is_internal,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { comments };
  }
);

// Updates a comment (only by the author or admin).
export const updateComment = api<UpdateCommentRequest, TicketComment>(
  { auth: true, expose: true, method: "PUT", path: "/comments/:id" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Get the comment to check ownership
    const existingComment = await ticketDB.queryRow<{
      author_name: string;
      author_email: string | null;
    }>`SELECT author_name, author_email FROM ticket_comments WHERE id = ${req.id}`;

    if (!existingComment) {
      throw APIError.notFound("comment not found");
    }

    // Only the author or admin can update the comment
    if (auth.role !== "admin" && existingComment.author_name !== auth.fullName) {
      throw APIError.permissionDenied("you can only update your own comments");
    }

    const now = new Date();
    const row = await ticketDB.queryRow<{
      id: number;
      ticket_id: number;
      author_name: string;
      author_email: string | null;
      content: string;
      is_internal: boolean;
      created_at: Date;
      updated_at: Date;
    }>`
      UPDATE ticket_comments 
      SET content = ${req.content}, updated_at = ${now}
      WHERE id = ${req.id}
      RETURNING *
    `;

    if (!row) {
      throw APIError.notFound("comment not found");
    }

    return {
      id: row.id,
      ticketId: row.ticket_id,
      authorName: row.author_name,
      authorEmail: row.author_email || undefined,
      content: row.content,
      isInternal: row.is_internal,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

// Deletes a comment (only by the author or admin).
export const deleteComment = api<DeleteCommentRequest, void>(
  { auth: true, expose: true, method: "DELETE", path: "/comments/:id" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Get the comment to check ownership
    const existingComment = await ticketDB.queryRow<{
      author_name: string;
      author_email: string | null;
    }>`SELECT author_name, author_email FROM ticket_comments WHERE id = ${req.id}`;

    if (!existingComment) {
      throw APIError.notFound("comment not found");
    }

    // Only the author or admin can delete the comment
    if (auth.role !== "admin" && existingComment.author_name !== auth.fullName) {
      throw APIError.permissionDenied("you can only delete your own comments");
    }

    const result = await ticketDB.exec`DELETE FROM ticket_comments WHERE id = ${req.id}`;
    // Note: PostgreSQL doesn't return affected rows count in this context
    // We'll assume the delete was successful if no error was thrown
  }
);
