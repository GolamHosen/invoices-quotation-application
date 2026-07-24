import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/db";
import { User } from "@/db/schema";
import { hashPassword, verifyPassword, createToken, setSession } from "@/lib/auth";

const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || "hujuratconstruction@gmail.com").toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "hujurat123";
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME || "Hujurat Construction";

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    let body: { email?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request. Please provide valid login credentials." },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter both email and password to sign in." },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Invalid credentials format. Please try again." },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    try {
      await connectDb();
    } catch (dbError) {
      console.error("Database connection failed during login:", dbError);
      return NextResponse.json(
        {
          error:
            "Unable to connect to the database. Please check your internet connection and try again. If the problem persists, contact the administrator.",
        },
        { status: 503 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up user in MongoDB
    let user = await User.findOne({ email: normalizedEmail }).lean();

    // Auto-create default admin on first login attempt if not found
    if (!user && normalizedEmail === DEFAULT_ADMIN_EMAIL) {
      try {
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
      } catch (createError) {
        console.error("Failed to create default admin account:", createError);
        return NextResponse.json(
          { error: "Account setup failed. Please try again or contact the administrator." },
          { status: 500 }
        );
      }
    }

    // No matching account found
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address. Please check your email and try again." },
        { status: 401 }
      );
    }

    // Verify password against the stored hash in MongoDB
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect password. Please check your password and try again." },
        { status: 401 }
      );
    }

    // Create session token and set cookie
    const token = await createToken({ id: user._id, email: user.email, role: user.role });
    await setSession(token);

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Login error:", message);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred during sign in. Please try again. If the issue persists, contact the administrator.",
      },
      { status: 500 }
    );
  }
}
