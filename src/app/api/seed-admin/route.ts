import { NextResponse } from "next/server";
import { connectDb } from "@/db";
import { User } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || "hujuratconstruction@gmail.com").toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "hujurat123";
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME || "Hujurat Construction";

export async function GET() {
  try {
    await connectDb();

    const hashed = await hashPassword(DEFAULT_ADMIN_PASSWORD);

    // Upsert: update if exists, create if not
    const result = await User.findOneAndUpdate(
      { email: DEFAULT_ADMIN_EMAIL },
      {
        $set: {
          name: DEFAULT_ADMIN_NAME,
          email: DEFAULT_ADMIN_EMAIL,
          password: hashed,
          role: "admin",
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: String(Date.now()) + "_" + Math.random().toString(16).slice(2),
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: `Admin account ready: ${DEFAULT_ADMIN_EMAIL}`,
      userId: result._id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
