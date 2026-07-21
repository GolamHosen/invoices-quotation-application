import { NextResponse } from "next/server";
import { connectDb } from "@/db";
import { migrateToMultiCompany } from "@/lib/seed-companies";

export async function POST() {
  try {
    await connectDb();
    const result = await migrateToMultiCompany();
    return NextResponse.json({
      success: true,
      message: "Multi-company migration completed",
      ...result,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
