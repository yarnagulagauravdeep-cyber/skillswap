import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRequest } from "@/lib/repos/requests";
import { getMaterial, getMaterialRow, markClose, markOpen } from "@/lib/repos/materials";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const id = Number(params.id);
  const row = getMaterialRow(id);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const request = getRequest(row.request_id);
  // Only the learner accrues reading time.
  if (!request || user.id !== request.studentId)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  if (action === "open") markOpen(id);
  else if (action === "close") markClose(id);
  else return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  return NextResponse.json({ material: getMaterial(id) });
}
