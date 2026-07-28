import { NextResponse } from "next/server";
import { leaderboard } from "@/lib/repos/stats";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ rows: leaderboard(20) });
}
