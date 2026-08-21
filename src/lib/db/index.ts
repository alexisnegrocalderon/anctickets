import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const configuredDatabaseUrl = process.env.DATABASE_URL;
const connectionString = configuredDatabaseUrl?.startsWith("postgres")
  ? configuredDatabaseUrl
  : "postgresql://missing:missing@ep-anc-build.us-east-2.aws.neon.tech/neondb?sslmode=require";

export const sql = neon(connectionString);
export const db = drizzle({ client: sql, schema });

export function assertDatabaseConfigured() {
  if (!configuredDatabaseUrl?.startsWith("postgres")) {
    throw new Error("DATABASE_URL must be configured before accessing ANC Tickets data.");
  }
}
