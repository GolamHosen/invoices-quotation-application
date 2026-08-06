import { NextRequest, NextResponse } from "next/server";
import { getProjectById, updateProject, deleteProject } from "@/lib/turso-store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await getProjectById(id);
    if (!result) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await updateProject(id, body);
    if (!result) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}