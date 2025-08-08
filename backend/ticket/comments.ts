import { api, APIError } from "encore.dev/api";
import { ticketDB } from "./db";
import type { TicketComment } from "./types";

export interface AddCommentRequest {
  ticketId: number;
  authorName: string;
  authorEmail?: string;
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
  { expose: true, method: "POST", path: "/tickets/:ticketId/comments" },
  async (req) => {
    // Verify ticket exists
    const ticket = await ticketDB.queryRow`SELECT id FROM tickets WHERE id = ${req.ticketId}`;
    if (!ticket) {
      throw APIError.notFound("ticket not found");
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
      INSERT INTO ticket_comments (
        ticket_id, author_name, author_email, content, is_internal, created_at, updated_at
      ) VALUES (
        ${req.ticketId}, ${req.authorName}, ${req.authorEmail || null}, 
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

// Retrieves all comments for a ticket.
export const listComments = api<ListCommentsRequest, ListCommentsResponse>(
  { expose: true, method: "GET", path: "/tickets/:ticketId/comments" },
  async (req) => {
    const rows = await ticketDB.queryAll<{
      id: number;
      ticket_id: number;
      author_name: string;
      author_email: string | null;
      content: string;
      is_internal: boolean;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT * FROM ticket_comments 
      WHERE ticket_id = ${req.ticketId}
      ORDER BY created_at ASC
    `;

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

// Updates a comment.
export const updateComment = api<UpdateCommentRequest, TicketComment>(
  { expose: true, method: "PUT", path: "/comments/:id" },
  async (req) => {
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

// Deletes a comment.
export const deleteComment = api<DeleteCommentRequest, void>(
  { expose: true, method: "DELETE", path: "/comments/:id" },
  async (req) => {
    const result = await ticketDB.exec`DELETE FROM ticket_comments WHERE id = ${req.id}`;
    // Note: PostgreSQL doesn't return affected rows count in this context
    // We'll assume the delete was successful if no error was thrown
  }
);
