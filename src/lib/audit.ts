import { AuditLog, IAuditChange, IAuditLog } from "@/db/schema";
import { createAuditLog } from "@/lib/turso-store";
import { generateId } from "@/lib/utils";
import { getSession } from "@/lib/auth";

/**
 * Field label mappings for human-readable audit log entries.
 */
const QUOTATION_FIELD_LABELS: Record<string, string> = {
  status: "Status",
  clientId: "Client",
  projectId: "Project",
  issueDate: "Issue Date",
  expiryDate: "Expiry Date",
  subtotal: "Subtotal",
  gstAmount: "GST Amount",
  totalAmount: "Total Amount",
  termsAndConditions: "Terms & Conditions",
  notes: "Notes",
  sections: "Line Items",
  templateId: "Template",
};

const INVOICE_FIELD_LABELS: Record<string, string> = {
  status: "Status",
  clientId: "Client",
  projectId: "Project",
  issueDate: "Issue Date",
  dueDate: "Due Date",
  subtotal: "Subtotal",
  gstAmount: "GST Amount",
  totalAmount: "Total Amount",
  paidAmount: "Paid Amount",
  payments: "Payments",
  paymentTerms: "Payment Terms",
  notes: "Notes",
  sections: "Line Items",
  quotationId: "Quotation",
};

/**
 * Fields that should be compared for audit changes.
 * Internal/system fields like _id, createdAt, updatedAt, companyId are excluded.
 */
const TRACKED_QUOTATION_FIELDS = [
  "status",
  "clientId",
  "projectId",
  "issueDate",
  "expiryDate",
  "subtotal",
  "gstAmount",
  "totalAmount",
  "termsAndConditions",
  "notes",
  "sections",
  "templateId",
];

const TRACKED_INVOICE_FIELDS = [
  "status",
  "clientId",
  "projectId",
  "issueDate",
  "dueDate",
  "subtotal",
  "gstAmount",
  "totalAmount",
  "paidAmount",
  "payments",
  "paymentTerms",
  "notes",
  "sections",
  "quotationId",
];

/**
 * Normalize a value for comparison and storage.
 * - Dates are converted to ISO date strings (yyyy-mm-dd)
 * - Numbers are stringified
 * - Objects/arrays are JSON-stringified
 * - undefined/null become empty string
 */
function normalizeValue(value: unknown): string {
  if (value === undefined || value === null) return "";

  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  if (typeof value === "string") {
    // Try to parse date strings for consistent comparison
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime()) && value.match(/\d{4}-\d{2}-\d{2}/)) {
      return parsed.toISOString().split("T")[0];
    }
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

/**
 * Format a currency amount for display.
 */
function formatCurrencyValue(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a value for human-readable display in the audit log.
 */
function formatDisplayValue(field: string, value: string): string {
  if (!value) return "(empty)";

  // Currency fields
  if (["subtotal", "gstAmount", "totalAmount", "paidAmount"].includes(field)) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return formatCurrencyValue(num);
    }
  }

  // Date fields
  if (["issueDate", "expiryDate", "dueDate"].includes(field)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(d);
    }
  }

  // Status fields - capitalize
  if (field === "status") {
    return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Truncate long text
  if (value.length > 100) {
    return value.substring(0, 100) + "...";
  }

  return value;
}

/**
 * Format a single item for display: "description (qty × unit @ rate = amount)"
 */
function formatItemDisplay(item: any): string {
  const desc = item.description || "(no description)";
  const qty = item.quantity ?? 0;
  const unit = item.unit || "";
  const rate = typeof item.rate === "number" ? item.rate : parseFloat(item.rate) || 0;
  const amount = typeof item.amount === "number" ? item.amount : (qty * rate);
  return `${desc} (${qty} ${unit} × ${formatCurrencyValue(rate)} = ${formatCurrencyValue(amount)})`;
}

/**
 * Diff sections (line items) and return detailed per-item changes.
 * Produces separate IAuditChange entries for:
 * - Added items (new items not in old)
 * - Removed items (old items not in new)
 * - Modified items (same item id but different values)
 * - Added/removed sections
 */
function diffSections(
  oldSections: any[],
  newSections: any[]
): IAuditChange[] {
  const changes: IAuditChange[] = [];

  // Build maps by section name for matching
  const oldMap = new Map<string, any>();
  for (const s of oldSections) {
    oldMap.set(s.id || s.name, s);
  }
  const newMap = new Map<string, any>();
  for (const s of newSections) {
    newMap.set(s.id || s.name, s);
  }

  // Find removed sections
  for (const [key, oldSection] of oldMap) {
    if (!newMap.has(key)) {
      const items = (oldSection.items || []);
      changes.push({
        field: "sections",
        label: `Section Removed: ${oldSection.name || key}`,
        oldValue: items.map((i: any) => formatItemDisplay(i)).join("; "),
        newValue: "(removed)",
      });
    }
  }

  // Find added sections
  for (const [key, newSection] of newMap) {
    if (!oldMap.has(key)) {
      const items = (newSection.items || []);
      changes.push({
        field: "sections",
        label: `Section Added: ${newSection.name || key}`,
        oldValue: "(new)",
        newValue: items.map((i: any) => formatItemDisplay(i)).join("; "),
      });
    }
  }

  // Compare matching sections item-by-item
  for (const [key, oldSection] of oldMap) {
    const newSection = newMap.get(key);
    if (!newSection) continue;

    // Check section name change
    if (oldSection.name !== newSection.name) {
      changes.push({
        field: "sections",
        label: "Section Renamed",
        oldValue: oldSection.name || "(unnamed)",
        newValue: newSection.name || "(unnamed)",
      });
    }

    const oldItems: any[] = oldSection.items || [];
    const newItems: any[] = newSection.items || [];
    const sectionLabel = newSection.name || oldSection.name || key;

    // Build item maps by id
    const oldItemMap = new Map<string, any>();
    for (const item of oldItems) {
      oldItemMap.set(item.id, item);
    }
    const newItemMap = new Map<string, any>();
    for (const item of newItems) {
      newItemMap.set(item.id, item);
    }

    // Removed items
    for (const [itemId, oldItem] of oldItemMap) {
      if (!newItemMap.has(itemId)) {
        changes.push({
          field: "sections",
          label: `[${sectionLabel}] Item Removed`,
          oldValue: formatItemDisplay(oldItem),
          newValue: "(removed)",
        });
      }
    }

    // Added items
    for (const [itemId, newItem] of newItemMap) {
      if (!oldItemMap.has(itemId)) {
        changes.push({
          field: "sections",
          label: `[${sectionLabel}] Item Added`,
          oldValue: "(new)",
          newValue: formatItemDisplay(newItem),
        });
      }
    }

    // Modified items
    for (const [itemId, oldItem] of oldItemMap) {
      const newItem = newItemMap.get(itemId);
      if (!newItem) continue;

      const itemChanges: string[] = [];
      if (oldItem.description !== newItem.description) {
        itemChanges.push(`description: "${oldItem.description}" → "${newItem.description}"`);
      }
      if (Number(oldItem.quantity) !== Number(newItem.quantity)) {
        itemChanges.push(`qty: ${oldItem.quantity} → ${newItem.quantity}`);
      }
      if (oldItem.unit !== newItem.unit) {
        itemChanges.push(`unit: "${oldItem.unit}" → "${newItem.unit}"`);
      }
      if (Number(oldItem.rate) !== Number(newItem.rate)) {
        itemChanges.push(`rate: ${formatCurrencyValue(Number(oldItem.rate))} → ${formatCurrencyValue(Number(newItem.rate))}`);
      }

      if (itemChanges.length > 0) {
        changes.push({
          field: "sections",
          label: `[${sectionLabel}] Item Modified`,
          oldValue: formatItemDisplay(oldItem),
          newValue: formatItemDisplay(newItem),
        });
      }
    }
  }

  return changes;
}

/**
 * Diff payments and return detailed per-payment changes.
 */
function diffPayments(
  oldPayments: any[],
  newPayments: any[]
): IAuditChange[] {
  const changes: IAuditChange[] = [];

  const oldMap = new Map<string, any>();
  for (const p of oldPayments) {
    oldMap.set(p.id, p);
  }
  const newMap = new Map<string, any>();
  for (const p of newPayments) {
    newMap.set(p.id, p);
  }

  // Removed payments
  for (const [id, oldP] of oldMap) {
    if (!newMap.has(id)) {
      const dateStr = oldP.date ? new Date(oldP.date).toLocaleDateString("en-AU") : "";
      changes.push({
        field: "payments",
        label: "Payment Removed",
        oldValue: `${formatCurrencyValue(parseFloat(oldP.amount) || 0)} on ${dateStr}${oldP.note ? ` (${oldP.note})` : ""}`,
        newValue: "(removed)",
      });
    }
  }

  // Added payments
  for (const [id, newP] of newMap) {
    if (!oldMap.has(id)) {
      const dateStr = newP.date ? new Date(newP.date).toLocaleDateString("en-AU") : "";
      changes.push({
        field: "payments",
        label: "Payment Added",
        oldValue: "(new)",
        newValue: `${formatCurrencyValue(parseFloat(newP.amount) || 0)} on ${dateStr}${newP.note ? ` (${newP.note})` : ""}`,
      });
    }
  }

  // Modified payments
  for (const [id, oldP] of oldMap) {
    const newP = newMap.get(id);
    if (!newP) continue;

    const oldAmount = parseFloat(oldP.amount) || 0;
    const newAmount = parseFloat(newP.amount) || 0;
    const oldDate = oldP.date ? new Date(oldP.date).toLocaleDateString("en-AU") : "";
    const newDate = newP.date ? new Date(newP.date).toLocaleDateString("en-AU") : "";

    if (oldAmount !== newAmount || oldDate !== newDate || (oldP.note || "") !== (newP.note || "")) {
      changes.push({
        field: "payments",
        label: "Payment Modified",
        oldValue: `${formatCurrencyValue(oldAmount)} on ${oldDate}${oldP.note ? ` (${oldP.note})` : ""}`,
        newValue: `${formatCurrencyValue(newAmount)} on ${newDate}${newP.note ? ` (${newP.note})` : ""}`,
      });
    }
  }

  return changes;
}

/**
 * Compare two objects and return the list of changed fields.
 * For sections (line items) and payments, produces detailed per-item diffs
 * showing exactly what was added, removed, or modified.
 */
export function diffObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  trackedFields: string[],
  fieldLabels: Record<string, string>
): IAuditChange[] {
  const changes: IAuditChange[] = [];

  for (const field of trackedFields) {
    // Handle sections with detailed item-level diff
    if (field === "sections") {
      const oldSections = (oldObj[field] as any[]) || [];
      const newSections = (newObj[field] as any[]) || [];
      const oldNorm = normalizeValue(oldSections);
      const newNorm = normalizeValue(newSections);
      if (oldNorm !== newNorm) {
        const sectionChanges = diffSections(oldSections, newSections);
        if (sectionChanges.length > 0) {
          changes.push(...sectionChanges);
        } else {
          // Fallback: structure changed but items look the same (reordering, etc.)
          changes.push({
            field,
            label: fieldLabels[field] || field,
            oldValue: `${oldSections.length} section(s)`,
            newValue: `${newSections.length} section(s)`,
          });
        }
      }
      continue;
    }

    // Handle payments with detailed diff
    if (field === "payments") {
      const oldPayments = (oldObj[field] as any[]) || [];
      const newPayments = (newObj[field] as any[]) || [];
      const oldNorm = normalizeValue(oldPayments);
      const newNorm = normalizeValue(newPayments);
      if (oldNorm !== newNorm) {
        const paymentChanges = diffPayments(oldPayments, newPayments);
        if (paymentChanges.length > 0) {
          changes.push(...paymentChanges);
        } else {
          changes.push({
            field,
            label: fieldLabels[field] || field,
            oldValue: `${oldPayments.length} payment(s)`,
            newValue: `${newPayments.length} payment(s)`,
          });
        }
      }
      continue;
    }

    const oldVal = normalizeValue(oldObj[field]);
    const newVal = normalizeValue(newObj[field]);

    if (oldVal !== newVal) {
      changes.push({
        field,
        label: fieldLabels[field] || field,
        oldValue: formatDisplayValue(field, oldVal),
        newValue: formatDisplayValue(field, newVal),
      });
    }
  }

  return changes;
}

/**
 * Generate a human-readable summary of changes.
 */
export function generateSummary(changes: IAuditChange[]): string {
  if (changes.length === 0) return "No field changes detected";
  if (changes.length === 1) return `Updated ${changes[0].label}`;
  if (changes.length <= 3) {
    return `Updated ${changes.map((c) => c.label).join(", ")}`;
  }
  return `Updated ${changes.length} fields: ${changes
    .slice(0, 2)
    .map((c) => c.label)
    .join(", ")}, and ${changes.length - 2} more`;
}

/**
 * Get the current session user info for audit logging.
 */
async function getCurrentUser() {
  try {
    const session = await getSession();
    return session
      ? { id: session.id, email: session.email, name: session.email, role: session.role }
      : null;
  } catch {
    return null;
  }
}

/**
 * Log a document edit with field-level changes.
 *
 * @param params - Audit log parameters
 * @param params.documentType - "quotation" | "invoice"
 * @param params.documentId - The document ID
 * @param params.documentNumber - The quotation/invoice number
 * @param params.companyId - The company ID
 * @param params.oldDoc - The document before changes
 * @param params.newDoc - The document after changes
 */
export async function logDocumentEdit({
  documentType,
  documentId,
  documentNumber,
  companyId,
  oldDoc,
  newDoc,
}: {
  documentType: "quotation" | "invoice";
  documentId: string;
  documentNumber: string;
  companyId: string;
  oldDoc: Record<string, unknown>;
  newDoc: Record<string, unknown>;
}): Promise<IAuditLog | null> {
  try {
    const trackedFields =
      documentType === "quotation"
        ? TRACKED_QUOTATION_FIELDS
        : TRACKED_INVOICE_FIELDS;
    const fieldLabels =
      documentType === "quotation"
        ? QUOTATION_FIELD_LABELS
        : INVOICE_FIELD_LABELS;

    const changes = diffObjects(oldDoc, newDoc, trackedFields, fieldLabels);

    // Don't log if nothing changed
    if (changes.length === 0) return null;

    const summary = generateSummary(changes);
    const user = await getCurrentUser();

    await createAuditLog({
      companyId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: "edit",
      entityType: documentType,
      entityId: documentId,
      entityNumber: documentNumber,
      details: { changes, summary },
    });

    return {
      _id: generateId(),
      companyId,
      userId: user?.id,
      userName: user?.name,
      userEmail: user?.email,
      action: "edit",
      entity: documentType,
      entityId: documentId,
      documentType,
      documentId,
      documentNumber,
      changes,
      summary,
      createdAt: new Date(),
    } as any;
  } catch (error) {
    console.error("Failed to log audit entry:", error);
    return null;
  }
}

/**
 * Log a status change as a special audit entry.
 */
export async function logStatusChange({
  documentType,
  documentId,
  documentNumber,
  companyId,
  oldStatus,
  newStatus,
}: {
  documentType: "quotation" | "invoice";
  documentId: string;
  documentNumber: string;
  companyId: string;
  oldStatus: string;
  newStatus: string;
}): Promise<IAuditLog | null> {
  if (oldStatus === newStatus) return null;

  try {
    const user = await getCurrentUser();
    const changes: IAuditChange[] = [
      {
        field: "status",
        label: "Status",
        oldValue: oldStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        newValue: newStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      },
    ];
    const summary = `Status changed from "${changes[0].oldValue}" to "${changes[0].newValue}"`;

    await createAuditLog({
      companyId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: "status_change",
      entityType: documentType,
      entityId: documentId,
      entityNumber: documentNumber,
      details: { changes, summary },
    });

    return {
      _id: generateId(),
      companyId,
      userId: user?.id,
      userName: user?.name,
      userEmail: user?.email,
      action: "status_change",
      entity: documentType,
      entityId: documentId,
      documentType,
      documentId,
      documentNumber,
      changes,
      summary,
      createdAt: new Date(),
    } as any;
  } catch (error) {
    console.error("Failed to log status change:", error);
    return null;
  }
}

/**
 * Log a payment record addition.
 */
export async function logPaymentAdded({
  documentId,
  documentNumber,
  companyId,
  amount,
  date,
  note,
}: {
  documentId: string;
  documentNumber: string;
  companyId: string;
  amount: number;
  date: string;
  note?: string;
}): Promise<IAuditLog | null> {
  try {
    const user = await getCurrentUser();
    const formattedAmount = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 2,
    }).format(amount);

    const changes = [
      {
        field: "payment",
        label: "Payment Recorded",
        oldValue: "",
        newValue: `${formattedAmount} on ${new Date(date).toLocaleDateString("en-AU")}${note ? ` (${note})` : ""}`,
      },
    ];
    const summary = `Payment of ${formattedAmount} recorded`;

    await createAuditLog({
      companyId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: "payment_added",
      entityType: "invoice",
      entityId: documentId,
      entityNumber: documentNumber,
      details: { changes, summary },
    });

    return {
      _id: generateId(),
      companyId,
      userId: user?.id,
      userName: user?.name,
      userEmail: user?.email,
      action: "payment_added",
      entity: "invoice",
      entityId: documentId,
      documentType: "invoice",
      documentId,
      documentNumber,
      changes,
      summary,
      createdAt: new Date(),
    } as any;
  } catch (error) {
    console.error("Failed to log payment:", error);
    return null;
  }
}

/**
 * Log document creation.
 */
export async function logDocumentCreation({
  documentType,
  documentId,
  documentNumber,
  companyId,
}: {
  documentType: "quotation" | "invoice";
  documentId: string;
  documentNumber: string;
  companyId: string;
}): Promise<IAuditLog | null> {
  try {
    const user = await getCurrentUser();
    const summary = `${documentType === "quotation" ? "Quotation" : "Invoice"} ${documentNumber} created`;

    await createAuditLog({
      companyId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: "create",
      entityType: documentType,
      entityId: documentId,
      entityNumber: documentNumber,
      details: { changes: [], summary },
    });

    return {
      _id: generateId(),
      companyId,
      userId: user?.id,
      userName: user?.name,
      userEmail: user?.email,
      action: "create",
      entity: documentType,
      entityId: documentId,
      documentType,
      documentId,
      documentNumber,
      changes: [],
      summary,
      createdAt: new Date(),
    } as any;
  } catch (error) {
    console.error("Failed to log creation:", error);
    return null;
  }
}