import { NextResponse } from "next/server";
import { recentSwaps } from "@/lib/repos/requests";

export const runtime = "nodejs";

// Public: powers the landing page's live-swap card. Exposes only names,
// skill, cost and status — no contact details.
export async function GET() {
  return NextResponse.json({ swaps: recentSwaps(6) });
}
