import { SQLDatabase } from "encore.dev/storage/sqldb";

export const ticketDB = new SQLDatabase("ticket", {
  migrations: "./migrations",
});
