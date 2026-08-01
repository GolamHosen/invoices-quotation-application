import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { EmailLog } from "@/db/schema";

export async function DELETE(req: NextRequest) {
  try {
    await connectDb();
    const body = await req.json();
    const ids: string[] = body.ids;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of email IDs to delete" },
        { status: 400 }
      );
    }

    const result = await EmailLog.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete email logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search")?.trim();
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const sort = searchParams.get("sort") === "asc" ? 1 : -1;

    const filter: Record<string, any> = {};
    if (companyId && companyId !== "all") {
      filter.companyId = companyId;
    }
    if (type) {
      filter.type = type;
    }
    if (status) {
      filter.status = status;
    }
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { recipientEmail: regex },
        { recipientName: regex },
        { documentNumber: regex },
        { subject: regex },
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, total, totalSent, totalFailed] = await Promise.all([
      EmailLog.find(filter).sort({ sentAt: sort }).skip(skip).limit(limit).lean(),
      EmailLog.countDocuments(filter),
      EmailLog.countDocuments({ ...filter, status: "sent" }),
      EmailLog.countDocuments({ ...filter, status: "failed" }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const data = logs.map((log: any) => ({
      id: log._id,
      companyId: log.companyId,
      type: log.type,
      documentId: log.documentId,
      documentNumber: log.documentNumber,
      recipientEmail: log.recipientEmail,
      recipientName: log.recipientName || null,
      subject: log.subject,
      message: log.message || null,
      status: log.status,
      errorMessage: log.errorMessage || null,
      sentAt: log.sentAt,
      createdAt: log.createdAt,
    }));

    return NextResponse.json({
      data,
      total,
      totalSent,
      totalFailed,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Get email history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
