import { connectDb } from "@/db";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDb();
    const state = mongoose.connection.readyState;
    return Response.json({ ok: state === 1, readyState: state });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
