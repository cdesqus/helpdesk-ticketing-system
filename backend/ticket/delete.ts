import { api, APIError } from "encore.dev/api";
import { ticketDB } from "./db";

export interface DeleteTicketRequest {
  id: number;
}

// Deletes a ticket.
export const deleteTicket = api<DeleteTicketRequest, void>(
  { expose: true, method: "DELETE", path: "/tickets/:id" },
  async (req) => {
    const result = await ticketDB.exec`DELETE FROM tickets WHERE id = ${req.id}`;
    // Note: PostgreSQL doesn't return affected rows count in this context
    // We'll assume the delete was successful if no error was thrown
  }
);
