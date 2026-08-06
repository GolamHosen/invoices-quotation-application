import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/turso-store";
import { turso } from "@/db/turso";

export async function GET(req: NextRequest) {
  try {
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

    const rawLogs = await getAuditLogs({
      entityId: documentId,
      entityType: documentType,
      limit,
    });

    const logs = rawLogs.map((l: any) => ({
      _id: l.id,
      id: l.id,
      companyId: l.companyId,
      userId: l.userId,
      userName: l.userName,
      userRole: l.userRole,
      action: l.action,
      entity: l.entityType,
      entityId: l.entityId,
      documentType: l.entityType,
      documentId: l.entityId,
      documentNumber: l.entityNumber,
      changes: l.details?.changes || [],
      summary: l.details?.summary || "",
      createdAt: l.createdAt,
    }));

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await turso.execute({
      sql: "DELETE FROM audit_logs WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete audit log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}