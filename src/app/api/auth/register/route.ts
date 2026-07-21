import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { User } from "@/db/schema";
import { hashPassword, createToken, setSession } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    const hashed = await hashPassword(password);
    const id = generateId();
    await User.create({ _id: id, name, email, password: hashed, role: role || "staff" });
    const token = await createToken({ id, email, role: role || "staff" });
    await setSession(token);
    return NextResponse.json({ user: { id, name, email, role: role || "staff" } }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}