import { SQLDatabase } from "encore.dev/storage/sqldb";

export const assetDB = new SQLDatabase("asset", {
  migrations: "./migrations",
});
