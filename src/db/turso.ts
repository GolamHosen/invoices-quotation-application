import { createClient, Client } from "@libsql/client";

/**
 * Global cache to preserve the Turso / LibSQL client connection
 * across Next.js hot-reloads in development and warm serverless invocations.
 */
const globalForTurso = globalThis as typeof globalThis & {
  __tursoClient?: Client;
};

export function getTursoClient(): Client {
  if (globalForTurso.__tursoClient) {
    return globalForTurso.__tursoClient;
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL environment variable is not set. Check your .env.local file."
    );
  }

  const client = createClient({
    url,
    authToken: authToken || undefined,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForTurso.__tursoClient = client;
  }

  return client;
}

export const turso = getTursoClient();

/**
 * Ensures required Turso SQLite tables exist in your Turso cloud database.
 */
export async function initTursoSchema() {
  const client = getTursoClient();

  await client.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        company_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        auto_reminders_enabled INTEGER DEFAULT 1,
        reminder_interval_days INTEGER DEFAULT 7,
        last_reminder_sent_at DATETIME,
        next_reminder_due_at DATETIME,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        address TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        client_id TEXT NOT NULL,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS quotations (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        quotation_number TEXT NOT NULL,
        client_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        template_id TEXT,
        status TEXT NOT NULL,
        issue_date DATETIME NOT NULL,
        expiry_date DATETIME NOT NULL,
        sections_json TEXT NOT NULL DEFAULT '[]',
        subtotal TEXT NOT NULL DEFAULT '0',
        gst_amount TEXT NOT NULL DEFAULT '0',
        total_amount TEXT NOT NULL DEFAULT '0',
        terms_and_conditions TEXT,
        notes TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        invoice_number TEXT NOT NULL,
        quotation_id TEXT,
        client_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL,
        issue_date DATETIME NOT NULL,
        due_date DATETIME NOT NULL,
        sections_json TEXT NOT NULL DEFAULT '[]',
        subtotal TEXT NOT NULL DEFAULT '0',
        gst_amount TEXT NOT NULL DEFAULT '0',
        total_amount TEXT NOT NULL DEFAULT '0',
        paid_amount TEXT NOT NULL DEFAULT '0',
        payments_json TEXT NOT NULL DEFAULT '[]',
        payment_terms TEXT,
        notes TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        user_id TEXT,
        user_name TEXT,
        user_role TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_number TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS document_counters (
        company_id TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        current_number INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (company_id, doc_type)
      );`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS email_reminders (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        invoice_id TEXT,
        reminder_type TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        scheduled_for DATETIME NOT NULL,
        sent_at DATETIME
      );`,
      args: [],
    },
  ]);
}
