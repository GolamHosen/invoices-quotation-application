import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { AuditLog } from "@/db/schema";

/**
 * GET /api/audit-logs
 * Fetch audit logs for a specific document.
 *
 * Query params:
 * - documentType: "quotation" | "invoice"
 * - documentId: The document ID
 * - limit: Optional, default 50
 */
export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const { searchParams } = new URL(req.url);
    const documentType = searchParams.get("documentType");
    const documentId = searchParams.get("documentId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!documentType || !documentId) {
      return NextResponse.json(
        { error: "documentType and documentId are required" },
        { status: 400 }
      );
    }

    const validTypes = ["quotation", "invoice"];
    if (!validTypes.includes(documentType)) {
      return NextResponse.json(
        { error: "documentType must be 'quotation' or 'invoice'" },
        { status: 400 }
      );
    }

    const logs = await AuditLog.find({
      documentType: documentType as "quotation" | "invoice",
      documentId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/audit-logs?id=<auditLogId>
 * Delete a single audit log entry.
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const result = await AuditLog.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json(
        { error: "Audit log entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete audit log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}