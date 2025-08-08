import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { ticketDB } from "./db";

export interface DeleteTicketRequest {
  id: number;
}

// Deletes a ticket (admin only).
export const deleteTicket = api<DeleteTicketRequest, void>(
  { auth: true, expose: true, method: "DELETE", path: "/tickets/:id" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only admins can delete tickets
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can delete tickets");
    }
    
    const result = await ticketDB.exec`DELETE FROM tickets WHERE id = ${req.id}`;
    // Note: PostgreSQL doesn't return affected rows count in this context
    // We'll assume the delete was successful if no error was thrown
  }
);
