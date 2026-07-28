import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getCurrentUser } from "@/lib/auth";
import { getRequest } from "@/lib/repos/requests";
import { getMaterialRow } from "@/lib/repos/materials";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const material = getMaterialRow(Number(params.id));
  if (!material)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const request = getRequest(material.request_id);
  if (!request || (user.id !== request.teacherId && user.id !== request.studentId))
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const bytes = await readFile(material.path).catch(() => null);
  if (!bytes)
    return NextResponse.json({ error: "File missing." }, { status: 404 });

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${material.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
