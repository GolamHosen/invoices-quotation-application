import { turso, initTursoSchema } from "@/db/turso";
import { generateId } from "@/lib/utils";

let schemaInitialized = false;

async function ensureSchema() {
  if (schemaInitialized) return;
  try {
    await initTursoSchema();
    schemaInitialized = true;
  } catch (err) {
    console.error("Turso schema initialization failed:", err);
  }
}

// Helper to convert SQLite snake_case row to JS camelCase object
function mapRowToClient(row: Record<string, any>) {
  if (!row) return null;
  return {
    id: String(row.id),
    _id: String(row.id),
    companyId: String(row.company_id),
    name: String(row.name),
    companyName: row.company_name ? String(row.company_name) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    address: row.address ? String(row.address) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    autoRemindersEnabled: Boolean(row.auto_reminders_enabled),
    reminderIntervalDays: Number(row.reminder_interval_days ?? 7),
    lastReminderSentAt: row.last_reminder_sent_at ? new Date(row.last_reminder_sent_at) : null,
    nextReminderDueAt: row.next_reminder_due_at ? new Date(row.next_reminder_due_at) : null,
    createdBy: row.created_by ? String(row.created_by) : undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

function mapRowToProject(row: Record<string, any>) {
  if (!row) return null;
  return {
    id: String(row.id),
    _id: String(row.id),
    companyId: String(row.company_id),
    name: String(row.name),
    address: row.address ? String(row.address) : undefined,
    type: String(row.type),
    status: String(row.status),
    clientId: String(row.client_id),
    createdBy: row.created_by ? String(row.created_by) : undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

function mapRowToQuotation(row: Record<string, any>) {
  if (!row) return null;
  let sections = [];
  try {
    sections = JSON.parse(row.sections_json || "[]");
  } catch {
    sections = [];
  }
  return {
    id: String(row.id),
    _id: String(row.id),
    companyId: String(row.company_id),
    quotationNumber: String(row.quotation_number),
    clientId: String(row.client_id),
    projectId: String(row.project_id),
    templateId: row.template_id ? String(row.template_id) : undefined,
    status: String(row.status),
    issueDate: row.issue_date ? new Date(row.issue_date) : new Date(),
    expiryDate: row.expiry_date ? new Date(row.expiry_date) : new Date(),
    sections,
    subtotal: String(row.subtotal ?? "0"),
    gstAmount: String(row.gst_amount ?? "0"),
    totalAmount: String(row.total_amount ?? "0"),
    termsAndConditions: row.terms_and_conditions ? String(row.terms_and_conditions) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdBy: row.created_by ? String(row.created_by) : undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

function mapRowToInvoice(row: Record<string, any>) {
  if (!row) return null;
  let sections = [];
  let payments = [];
  try {
    sections = JSON.parse(row.sections_json || "[]");
  } catch {
    sections = [];
  }
  try {
    payments = JSON.parse(row.payments_json || "[]");
  } catch {
    payments = [];
  }
  return {
    id: String(row.id),
    _id: String(row.id),
    companyId: String(row.company_id),
    invoiceNumber: String(row.invoice_number),
    quotationId: row.quotation_id ? String(row.quotation_id) : undefined,
    clientId: String(row.client_id),
    projectId: String(row.project_id),
    status: String(row.status),
    issueDate: row.issue_date ? new Date(row.issue_date) : new Date(),
    dueDate: row.due_date ? new Date(row.due_date) : new Date(),
    sections,
    subtotal: String(row.subtotal ?? "0"),
    gstAmount: String(row.gst_amount ?? "0"),
    totalAmount: String(row.total_amount ?? "0"),
    paidAmount: String(row.paid_amount ?? "0"),
    payments,
    paymentTerms: row.payment_terms ? String(row.payment_terms) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdBy: row.created_by ? String(row.created_by) : undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

// ────────────────────────────────────────────────────────
// CLIENT STORE
// ────────────────────────────────────────────────────────
export async function getClients(companyId?: string) {
  await ensureSchema();
  const sql = companyId
    ? "SELECT * FROM clients WHERE company_id = ? ORDER BY created_at DESC"
    : "SELECT * FROM clients ORDER BY created_at DESC";
  const args = companyId ? [companyId] : [];
  const res = await turso.execute({ sql, args });
  return res.rows.map(mapRowToClient);
}

export async function getClientById(id: string) {
  await ensureSchema();
  const res = await turso.execute({
    sql: "SELECT * FROM clients WHERE id = ?",
    args: [id],
  });
  if (!res.rows.length) return null;
  return mapRowToClient(res.rows[0]);
}

export async function createClient(data: Record<string, any>) {
  await ensureSchema();
  const id = data.id || data._id || generateId();
  const companyId = data.companyId || "";
  const name = data.name || "";
  const companyName = data.companyName || null;
  const phone = data.phone || null;
  const email = data.email || null;
  const address = data.address || null;
  const notes = data.notes || null;
  const autoReminders = data.autoRemindersEnabled !== false ? 1 : 0;
  const interval = Number(data.reminderIntervalDays || 7);
  const createdBy = data.createdBy || null;
  const now = new Date().toISOString();

  await turso.execute({
    sql: `INSERT INTO clients (
      id, company_id, name, company_name, phone, email, address, notes,
      auto_reminders_enabled, reminder_interval_days, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, companyId, name, companyName, phone, email, address, notes,
      autoReminders, interval, createdBy, now, now
    ],
  });

  return getClientById(id);
}

export async function updateClient(id: string, data: Record<string, any>) {
  await ensureSchema();
  const existing = await getClientById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const nextReminder = data.nextReminderDueAt
    ? new Date(data.nextReminderDueAt).toISOString()
    : data.nextReminderDueAt === null
    ? null
    : existing.nextReminderDueAt
    ? new Date(existing.nextReminderDueAt).toISOString()
    : null;

  await turso.execute({
    sql: `UPDATE clients SET
      name = COALESCE(?, name),
      company_name = COALESCE(?, company_name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      address = COALESCE(?, address),
      notes = COALESCE(?, notes),
      auto_reminders_enabled = COALESCE(?, auto_reminders_enabled),
      reminder_interval_days = COALESCE(?, reminder_interval_days),
      next_reminder_due_at = ?,
      updated_at = ?
    WHERE id = ?`,
    args: [
      data.name ?? null,
      data.companyName ?? null,
      data.phone ?? null,
      data.email ?? null,
      data.address ?? null,
      data.notes ?? null,
      data.autoRemindersEnabled !== undefined ? (data.autoRemindersEnabled ? 1 : 0) : null,
      data.reminderIntervalDays ?? null,
      nextReminder,
      now,
      id,
    ],
  });

  return getClientById(id);
}

export async function deleteClient(id: string) {
  await ensureSchema();
  await turso.execute({
    sql: "DELETE FROM clients WHERE id = ?",
    args: [id],
  });
  return true;
}

// ────────────────────────────────────────────────────────
// PROJECT STORE
// ────────────────────────────────────────────────────────
export async function getProjects(companyId?: string, clientId?: string) {
  await ensureSchema();
  let sql = "SELECT * FROM projects";
  const conditions: string[] = [];
  const args: any[] = [];

  if (companyId) {
    conditions.push("company_id = ?");
    args.push(companyId);
  }
  if (clientId) {
    conditions.push("client_id = ?");
    args.push(clientId);
  }

  if (conditions.length) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY created_at DESC";

  const res = await turso.execute({ sql, args });
  return res.rows.map(mapRowToProject);
}

export async function getProjectById(id: string) {
  await ensureSchema();
  const res = await turso.execute({
    sql: "SELECT * FROM projects WHERE id = ?",
    args: [id],
  });
  if (!res.rows.length) return null;
  return mapRowToProject(res.rows[0]);
}

export async function createProject(data: Record<string, any>) {
  await ensureSchema();
  const id = data.id || data._id || generateId();
  const companyId = data.companyId || "";
  const name = data.name || "";
  const address = data.address || null;
  const type = data.type || "residential";
  const status = data.status || "active";
  const clientId = data.clientId || "";
  const createdBy = data.createdBy || null;
  const now = new Date().toISOString();

  await turso.execute({
    sql: `INSERT INTO projects (
      id, company_id, name, address, type, status, client_id, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, companyId, name, address, type, status, clientId, createdBy, now, now],
  });

  return getProjectById(id);
}

export async function updateProject(id: string, data: Record<string, any>) {
  await ensureSchema();
  const now = new Date().toISOString();
  await turso.execute({
    sql: `UPDATE projects SET
      name = COALESCE(?, name),
      address = COALESCE(?, address),
      type = COALESCE(?, type),
      status = COALESCE(?, status),
      client_id = COALESCE(?, client_id),
      updated_at = ?
    WHERE id = ?`,
    args: [
      data.name ?? null,
      data.address ?? null,
      data.type ?? null,
      data.status ?? null,
      data.clientId ?? null,
      now,
      id,
    ],
  });
  return getProjectById(id);
}

export async function deleteProject(id: string) {
  await ensureSchema();
  await turso.execute({ sql: "DELETE FROM projects WHERE id = ?", args: [id] });
  return true;
}

// ────────────────────────────────────────────────────────
// QUOTATION STORE
// ────────────────────────────────────────────────────────
export async function getQuotations(params: {
  companyId?: string;
  clientId?: string;
  projectId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  await ensureSchema();
  const { companyId, clientId, projectId, status, page = 1, limit = 50 } = params;
  const conditions: string[] = [];
  const args: any[] = [];

  if (companyId) {
    conditions.push("company_id = ?");
    args.push(companyId);
  }
  if (clientId) {
    conditions.push("client_id = ?");
    args.push(clientId);
  }
  if (projectId) {
    conditions.push("project_id = ?");
    args.push(projectId);
  }
  if (status) {
    conditions.push("status = ?");
    args.push(status);
  }

  const whereClause = conditions.length ? " WHERE " + conditions.join(" AND ") : "";

  // Count query
  const countRes = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM quotations${whereClause}`,
    args,
  });
  const total = Number(countRes.rows[0]?.count ?? 0);

  // Paginated query
  const offset = (page - 1) * limit;
  const dataRes = await turso.execute({
    sql: `SELECT * FROM quotations${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  const data = dataRes.rows.map(mapRowToQuotation);
  const totalPages = Math.ceil(total / limit);

  return { data, total, page, limit, totalPages };
}

export async function getQuotationById(id: string) {
  await ensureSchema();
  const res = await turso.execute({
    sql: "SELECT * FROM quotations WHERE id = ?",
    args: [id],
  });
  if (!res.rows.length) return null;
  return mapRowToQuotation(res.rows[0]);
}

export async function createQuotation(data: Record<string, any>) {
  await ensureSchema();
  const id = data.id || data._id || generateId();
  const companyId = data.companyId || "";
  const quotationNumber = data.quotationNumber || "";
  const clientId = data.clientId || "";
  const projectId = data.projectId || "";
  const templateId = data.templateId || null;
  const status = data.status || "draft";
  const issueDate = data.issueDate ? new Date(data.issueDate).toISOString() : new Date().toISOString();
  const expiryDate = data.expiryDate ? new Date(data.expiryDate).toISOString() : new Date().toISOString();
  const sectionsJson = JSON.stringify(data.sections || []);
  const subtotal = String(data.subtotal ?? "0");
  const gstAmount = String(data.gstAmount ?? "0");
  const totalAmount = String(data.totalAmount ?? "0");
  const termsAndConditions = data.termsAndConditions || null;
  const notes = data.notes || null;
  const createdBy = data.createdBy || null;
  const now = new Date().toISOString();

  await turso.execute({
    sql: `INSERT INTO quotations (
      id, company_id, quotation_number, client_id, project_id, template_id, status,
      issue_date, expiry_date, sections_json, subtotal, gst_amount, total_amount,
      terms_and_conditions, notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, companyId, quotationNumber, clientId, projectId, templateId, status,
      issueDate, expiryDate, sectionsJson, subtotal, gstAmount, totalAmount,
      termsAndConditions, notes, createdBy, now, now
    ],
  });

  return getQuotationById(id);
}

export async function updateQuotation(id: string, data: Record<string, any>) {
  await ensureSchema();
  const now = new Date().toISOString();
  const issueDate = data.issueDate ? new Date(data.issueDate).toISOString() : null;
  const expiryDate = data.expiryDate ? new Date(data.expiryDate).toISOString() : null;
  const sectionsJson = data.sections ? JSON.stringify(data.sections) : null;

  await turso.execute({
    sql: `UPDATE quotations SET
      status = COALESCE(?, status),
      client_id = COALESCE(?, client_id),
      project_id = COALESCE(?, project_id),
      template_id = COALESCE(?, template_id),
      issue_date = COALESCE(?, issue_date),
      expiry_date = COALESCE(?, expiry_date),
      sections_json = COALESCE(?, sections_json),
      subtotal = COALESCE(?, subtotal),
      gst_amount = COALESCE(?, gst_amount),
      total_amount = COALESCE(?, total_amount),
      terms_and_conditions = COALESCE(?, terms_and_conditions),
      notes = COALESCE(?, notes),
      updated_at = ?
    WHERE id = ?`,
    args: [
      data.status ?? null,
      data.clientId ?? null,
      data.projectId ?? null,
      data.templateId ?? null,
      issueDate,
      expiryDate,
      sectionsJson,
      data.subtotal !== undefined ? String(data.subtotal) : null,
      data.gstAmount !== undefined ? String(data.gstAmount) : null,
      data.totalAmount !== undefined ? String(data.totalAmount) : null,
      data.termsAndConditions ?? null,
      data.notes ?? null,
      now,
      id,
    ],
  });

  return getQuotationById(id);
}

export async function deleteQuotation(id: string) {
  await ensureSchema();
  await turso.execute({ sql: "DELETE FROM quotations WHERE id = ?", args: [id] });
  return true;
}

// ────────────────────────────────────────────────────────
// INVOICE STORE
// ────────────────────────────────────────────────────────
export async function getInvoices(params: {
  companyId?: string;
  clientId?: string;
  projectId?: string;
  quotationId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  await ensureSchema();
  const { companyId, clientId, projectId, quotationId, status, page = 1, limit = 50 } = params;
  const conditions: string[] = [];
  const args: any[] = [];

  if (companyId) {
    conditions.push("company_id = ?");
    args.push(companyId);
  }
  if (clientId) {
    conditions.push("client_id = ?");
    args.push(clientId);
  }
  if (projectId) {
    conditions.push("project_id = ?");
    args.push(projectId);
  }
  if (quotationId) {
    conditions.push("quotation_id = ?");
    args.push(quotationId);
  }
  if (status) {
    conditions.push("status = ?");
    args.push(status);
  }

  const whereClause = conditions.length ? " WHERE " + conditions.join(" AND ") : "";

  const countRes = await turso.execute({
    sql: `SELECT COUNT(*) as count FROM invoices${whereClause}`,
    args,
  });
  const total = Number(countRes.rows[0]?.count ?? 0);

  const offset = (page - 1) * limit;
  const dataRes = await turso.execute({
    sql: `SELECT * FROM invoices${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  const data = dataRes.rows.map(mapRowToInvoice);
  const totalPages = Math.ceil(total / limit);

  return { data, total, page, limit, totalPages };
}

export async function getInvoiceById(id: string) {
  await ensureSchema();
  const res = await turso.execute({
    sql: "SELECT * FROM invoices WHERE id = ?",
    args: [id],
  });
  if (!res.rows.length) return null;
  return mapRowToInvoice(res.rows[0]);
}

export async function createInvoice(data: Record<string, any>) {
  await ensureSchema();
  const id = data.id || data._id || generateId();
  const companyId = data.companyId || "";
  const invoiceNumber = data.invoiceNumber || "";
  const quotationId = data.quotationId || null;
  const clientId = data.clientId || "";
  const projectId = data.projectId || "";
  const status = data.status || "draft";
  const issueDate = data.issueDate ? new Date(data.issueDate).toISOString() : new Date().toISOString();
  const dueDate = data.dueDate ? new Date(data.dueDate).toISOString() : new Date().toISOString();
  const sectionsJson = JSON.stringify(data.sections || []);
  const subtotal = String(data.subtotal ?? "0");
  const gstAmount = String(data.gstAmount ?? "0");
  const totalAmount = String(data.totalAmount ?? "0");
  const paidAmount = String(data.paidAmount ?? "0");
  const paymentsJson = JSON.stringify(data.payments || []);
  const paymentTerms = data.paymentTerms || null;
  const notes = data.notes || null;
  const createdBy = data.createdBy || null;
  const now = new Date().toISOString();

  await turso.execute({
    sql: `INSERT INTO invoices (
      id, company_id, invoice_number, quotation_id, client_id, project_id, status,
      issue_date, due_date, sections_json, subtotal, gst_amount, total_amount, paid_amount,
      payments_json, payment_terms, notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, companyId, invoiceNumber, quotationId, clientId, projectId, status,
      issueDate, dueDate, sectionsJson, subtotal, gstAmount, totalAmount, paidAmount,
      paymentsJson, paymentTerms, notes, createdBy, now, now
    ],
  });

  return getInvoiceById(id);
}

export async function updateInvoice(id: string, data: Record<string, any>) {
  await ensureSchema();
  const now = new Date().toISOString();
  const issueDate = data.issueDate ? new Date(data.issueDate).toISOString() : null;
  const dueDate = data.dueDate ? new Date(data.dueDate).toISOString() : null;
  const sectionsJson = data.sections ? JSON.stringify(data.sections) : null;
  const paymentsJson = data.payments ? JSON.stringify(data.payments) : null;

  await turso.execute({
    sql: `UPDATE invoices SET
      status = COALESCE(?, status),
      client_id = COALESCE(?, client_id),
      project_id = COALESCE(?, project_id),
      quotation_id = COALESCE(?, quotation_id),
      issue_date = COALESCE(?, issue_date),
      due_date = COALESCE(?, due_date),
      sections_json = COALESCE(?, sections_json),
      subtotal = COALESCE(?, subtotal),
      gst_amount = COALESCE(?, gst_amount),
      total_amount = COALESCE(?, total_amount),
      paid_amount = COALESCE(?, paid_amount),
      payments_json = COALESCE(?, payments_json),
      payment_terms = COALESCE(?, payment_terms),
      notes = COALESCE(?, notes),
      updated_at = ?
    WHERE id = ?`,
    args: [
      data.status ?? null,
      data.clientId ?? null,
      data.projectId ?? null,
      data.quotationId ?? null,
      issueDate,
      dueDate,
      sectionsJson,
      data.subtotal !== undefined ? String(data.subtotal) : null,
      data.gstAmount !== undefined ? String(data.gstAmount) : null,
      data.totalAmount !== undefined ? String(data.totalAmount) : null,
      data.paidAmount !== undefined ? String(data.paidAmount) : null,
      paymentsJson,
      data.paymentTerms ?? null,
      data.notes ?? null,
      now,
      id,
    ],
  });

  return getInvoiceById(id);
}

export async function deleteInvoice(id: string) {
  await ensureSchema();
  await turso.execute({ sql: "DELETE FROM invoices WHERE id = ?", args: [id] });
  return true;
}

// ────────────────────────────────────────────────────────
// AUDIT LOGS STORE
// ────────────────────────────────────────────────────────
export async function getAuditLogs(params: {
  companyId?: string;
  entityId?: string;
  entityType?: string;
  limit?: number;
}) {
  await ensureSchema();
  const { companyId, entityId, entityType, limit = 50 } = params;
  const conditions: string[] = [];
  const args: any[] = [];

  if (companyId) {
    conditions.push("company_id = ?");
    args.push(companyId);
  }
  if (entityId) {
    conditions.push("entity_id = ?");
    args.push(entityId);
  }
  if (entityType) {
    conditions.push("entity_type = ?");
    args.push(entityType);
  }

  const whereClause = conditions.length ? " WHERE " + conditions.join(" AND ") : "";

  const res = await turso.execute({
    sql: `SELECT * FROM audit_logs${whereClause} ORDER BY created_at DESC LIMIT ?`,
    args: [...args, limit],
  });

  return res.rows.map((row: any) => ({
    id: String(row.id),
    _id: String(row.id),
    companyId: String(row.company_id),
    userId: row.user_id ? String(row.user_id) : undefined,
    userName: row.user_name ? String(row.user_name) : undefined,
    userRole: row.user_role ? String(row.user_role) : undefined,
    action: String(row.action),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    entityNumber: row.entity_number ? String(row.entity_number) : undefined,
    details: row.details ? JSON.parse(row.details) : undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  }));
}

export async function createAuditLog(data: Record<string, any>) {
  await ensureSchema();
  const id = generateId();
  const companyId = data.companyId || "";
  const userId = data.userId || null;
  const userName = data.userName || null;
  const userRole = data.userRole || null;
  const action = data.action || "";
  const entityType = data.entityType || "";
  const entityId = data.entityId || "";
  const entityNumber = data.entityNumber || null;
  const details = data.details ? JSON.stringify(data.details) : null;
  const now = new Date().toISOString();

  await turso.execute({
    sql: `INSERT INTO audit_logs (
      id, company_id, user_id, user_name, user_role, action, entity_type, entity_id, entity_number, details, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, companyId, userId, userName, userRole, action, entityType, entityId, entityNumber, details, now],
  });

  return { id, companyId, action, entityType, entityId };
}
