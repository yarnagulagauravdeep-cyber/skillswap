import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createRequest,
  listIncomingForTeacher,
  listOutgoingForStudent,
} from "@/lib/repos/requests";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const box = new URL(req.url).searchParams.get("box") ?? "incoming";
  const requests =
    box === "outgoing"
      ? listOutgoingForStudent(user.id)
      : listIncomingForTeacher(user.id);
  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  const user = getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const courseId = Number(body?.courseId);
  if (!courseId)
    return NextResponse.json({ error: "courseId is required." }, { status: 400 });

  const result = createRequest(courseId, user.id);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ request: result.request });
}
