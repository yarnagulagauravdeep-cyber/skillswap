import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createCourse,
  listCourses,
  type SortKey,
} from "@/lib/repos/courses";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = getCurrentUser();
  const { searchParams } = new URL(req.url);
  const sort = (searchParams.get("sort") ?? "recent") as SortKey;
  const maxCost = Number(searchParams.get("maxCost")) || undefined;
  const minRating = Number(searchParams.get("minRating")) || undefined;
  const search = searchParams.get("q") ?? undefined;
  const anyTerms = searchParams.getAll("term").filter(Boolean);

  const courses = listCourses({
    search,
    anyTerms,
    sort,
    maxCost,
    minRating,
    excludeTeacherId: user?.id,
    hideActiveForStudent: user?.id,
  });
  return NextResponse.json({ courses });
}

export async function POST(req: Request) {
  const user = getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const skill = String(body.skill ?? "").trim();
  const cost = Math.round(Number(body.cost));
  const estDays = Math.max(1, Math.round(Number(body.estDays) || 1));
  const description = String(body.description ?? "");

  if (!skill) {
    return NextResponse.json({ error: "Skill name is required." }, { status: 400 });
  }
  if (!Number.isFinite(cost) || cost < 1 || cost > 4) {
    return NextResponse.json(
      { error: "Credits must be between 1 and 4." },
      { status: 400 },
    );
  }

  const course = createCourse({
    teacherId: user.id,
    skill,
    cost,
    estDays,
    description,
  });
  return NextResponse.json({ course });
}
