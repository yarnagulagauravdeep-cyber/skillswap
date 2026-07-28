import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { expandQuery } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const query = String(body.query ?? "");
  const terms = await expandQuery(query);
  return NextResponse.json({ terms, available: terms.length > 0 });
}
