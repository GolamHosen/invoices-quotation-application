import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { User } from "@/db/schema";
import { hashPassword, verifyPassword, createToken, setSession } from "@/lib/auth";

const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || "hujuratconstruction@gmail.com").toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "hujurat123";
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME || "Hujurat Construction";

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase();
    let user = await User.findOne({ email: normalizedEmail }).lean();

    // If the default admin account doesn't exist yet, create it on first login attempt.
    if (!user && normalizedEmail === DEFAULT_ADMIN_EMAIL) {
      const hashed = await hashPassword(DEFAULT_ADMIN_PASSWORD);
      const id = String(Date.now()) + "_" + Math.random().toString(16).slice(2);

      await User.create({
        _id: id,
        name: DEFAULT_ADMIN_NAME,
        email: normalizedEmail,
        password: hashed,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      user = await User.findOne({ email: normalizedEmail }).lean();
    }

    if (!user) {
      return NextResponse.json({ error: "No account found for this email." }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password. Please try again." }, { status: 401 });
    }

    const token = await createToken({ id: user._id, email: user.email, role: user.role });
    await setSession(token);

    return NextResponse.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Login failed:", message);

    return NextResponse.json(
      {
        error:
          "Authentication service is temporarily unavailable. Please check MongoDB connectivity (e.g., Atlas IP allowlist) and try again.",
      },
      { status: 503 }
    );
  }
}
