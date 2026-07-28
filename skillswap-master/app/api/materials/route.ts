import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { getRequest } from "@/lib/repos/requests";
import { addMaterial, listMaterials } from "@/lib/repos/materials";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export async function GET(req: Request) {
  const user = getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const requestId = Number(new URL(req.url).searchParams.get("requestId"));
  const request = getRequest(requestId);
  if (!request)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (user.id !== request.teacherId && user.id !== request.studentId)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  return NextResponse.json({ materials: listMaterials(requestId) });
}

export async function POST(req: Request) {
  const user = getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form." }, { status: 400 });

  const requestId = Number(form.get("requestId"));
  const file = form.get("file");
  const request = getRequest(requestId);
  if (!request)
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (user.id !== request.teacherId)
    return NextResponse.json(
      { error: "Only the teacher can upload materials." },
      { status: 403 },
    );
  if (!(file instanceof File))
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  if (file.type && file.type !== "application/pdf")
    return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });

  await mkdir(UPLOAD_DIR, { recursive: true });
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const stored = `${randomUUID()}-${safeName}`;
  const fullPath = path.join(UPLOAD_DIR, stored);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, bytes);

  const material = addMaterial({
    requestId,
    filename: file.name,
    path: fullPath,
  });
  return NextResponse.json({ material });
}
