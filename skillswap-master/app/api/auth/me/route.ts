import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { availableCredits } from "@/lib/repos/credits";

export const runtime = "nodejs";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({
    user: { ...user, available: availableCredits(user.id) },
  });
}
