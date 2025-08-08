import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { ticketDB } from "./db";

export interface BulkDeleteTicketsRequest {
  ticketIds: number[];
}

export interface BulkDeleteTicketsResponse {
  deletedCount: number;
  failedIds: number[];
}

// Deletes multiple tickets (admin only).
export const bulkDeleteTickets = api<BulkDeleteTicketsRequest, BulkDeleteTicketsResponse>(
  { auth: true, expose: true, method: "DELETE", path: "/tickets/bulk" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only admins can delete tickets
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can delete tickets");
    }

    if (!req.ticketIds || req.ticketIds.length === 0) {
      throw APIError.invalidArgument("no ticket IDs provided");
    }

    if (req.ticketIds.length > 100) {
      throw APIError.invalidArgument("cannot delete more than 100 tickets at once");
    }

    console.log(`Admin ${auth.username} attempting to delete ${req.ticketIds.length} tickets:`, req.ticketIds);

    let deletedCount = 0;
    const failedIds: number[] = [];

    try {
      // Use a transaction to ensure consistency
      await ticketDB.exec`BEGIN`;

      for (const ticketId of req.ticketIds) {
        try {
          // First delete related comments
          await ticketDB.exec`DELETE FROM ticket_comments WHERE ticket_id = ${ticketId}`;
          
          // Then delete the ticket
          const result = await ticketDB.exec`DELETE FROM tickets WHERE id = ${ticketId}`;
          
          deletedCount++;
          console.log(`Successfully deleted ticket ${ticketId}`);
        } catch (error) {
          console.error(`Failed to delete ticket ${ticketId}:`, error);
          failedIds.push(ticketId);
        }
      }

      await ticketDB.exec`COMMIT`;
      
      console.log(`Bulk delete completed: ${deletedCount} deleted, ${failedIds.length} failed`);

      return {
        deletedCount,
        failedIds,
      };
    } catch (error) {
      await ticketDB.exec`ROLLBACK`;
      console.error("Bulk delete transaction failed:", error);
      throw APIError.internal("bulk delete operation failed");
    }
  }
);
