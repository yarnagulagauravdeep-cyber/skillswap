import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  acceptRequest,
  completeRequest,
  confirmSlots,
  getRequest,
  getTimetable,
  rejectRequest,
  setMeetLink,
  studentContext,
  type Slot,
} from "@/lib/repos/requests";

export const runtime = "nodejs";

function parseSlots(value: unknown): Slot[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (s) => s && typeof s.day === "string" && typeof s.time === "string",
    )
    .map((s) => ({ day: String(s.day), time: String(s.time) }));
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const request = getRequest(Number(params.id));
  if (!request)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (user.id !== request.teacherId && user.id !== request.studentId)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  return NextResponse.json({
    request,
    timetable: getTimetable(request.id),
    student: studentContext(request.studentId, request.studentLearningStyle),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const id = Number(params.id);
  const existing = getRequest(id);
  if (!existing)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const isTeacher = user.id === existing.teacherId;
  const isStudent = user.id === existing.studentId;
  if (!isTeacher && !isStudent)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  let result: { request?: unknown; error?: string };
  switch (action) {
    case "accept":
      if (!isTeacher)
        return NextResponse.json({ error: "Only the teacher can accept." }, { status: 403 });
      result = acceptRequest(id, {
        teacherAvail: parseSlots(body.teacherAvail),
        sessionLenMin: Math.max(15, Number(body.sessionLenMin) || 60),
        expectedEnd: String(body.expectedEnd ?? ""),
        rulesText: String(body.rulesText ?? ""),
      });
      break;
    case "reject":
      if (!isTeacher)
        return NextResponse.json({ error: "Only the teacher can reject." }, { status: 403 });
      result = rejectRequest(id);
      break;
    case "confirm":
      if (!isStudent)
        return NextResponse.json({ error: "Only the student can confirm times." }, { status: 403 });
      result = confirmSlots(id, parseSlots(body.slots));
      break;
    case "meetlink":
      if (!isTeacher)
        return NextResponse.json({ error: "Only the teacher can share the link." }, { status: 403 });
      result = setMeetLink(id, String(body.meetLink ?? ""));
      break;
    case "complete":
      result = completeRequest(id);
      break;
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  if (result.error)
    return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ request: result.request });
}
