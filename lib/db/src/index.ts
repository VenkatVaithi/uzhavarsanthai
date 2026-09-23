import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = new URL(rawDatabaseUrl);
if (process.env.NODE_ENV === "production") {
  databaseUrl.searchParams.set("sslmode", "verify-full");
}

export const pool = new Pool({ connectionString: databaseUrl.toString() });
export const db = drizzle(pool, { schema });

export * from "./schema";
