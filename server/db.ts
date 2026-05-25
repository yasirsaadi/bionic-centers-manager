import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString });

// Idle clients can emit errors when the backend (Neon) drops a connection
// after a network blip or maintenance. Without a listener pg surfaces this
// as an uncaught error event and the whole process exits with status 1.
// Log it instead; the pool discards the dead client and reconnects on the
// next query.
pool.on("error", (err) => {
  console.error("[db] Unexpected error on idle PostgreSQL client:", err);
});

export const db = drizzle(pool, { schema });
