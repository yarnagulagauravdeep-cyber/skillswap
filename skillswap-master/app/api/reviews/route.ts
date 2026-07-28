import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  addReview,
  hasReviewed,
  ratingSummary,
  reviewsForUser,
} from "@/lib/repos/reviews";
import { haveExchanged } from "@/lib/repos/requests";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const userId = Number(new URL(req.url).searchParams.get("userId"));
  if (!userId)
    return NextResponse.json({ error: "userId required." }, { status: 400 });
  return NextResponse.json({
    reviews: reviewsForUser(userId),
    summary: ratingSummary(userId),
  });
}

export async function POST(req: Request) {
  const user = getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const revieweeId = Number(body.revieweeId);
  const rating = Math.round(Number(body.rating));
  const text = String(body.text ?? "");
  const requestId = body.requestId != null ? Number(body.requestId) : null;

  if (!revieweeId || revieweeId === user.id)
    return NextResponse.json({ error: "Invalid reviewee." }, { status: 400 });
  if (!Number.isFinite(rating) || rating < 1 || rating > 5)
    return NextResponse.json({ error: "Rating must be 1–5." }, { status: 400 });
  if (!haveExchanged(user.id, revieweeId))
    return NextResponse.json(
      { error: "You can only review people you've had a class with." },
      { status: 403 },
    );
  if (requestId && hasReviewed(requestId, user.id))
    return NextResponse.json(
      { error: "You've already reviewed this exchange." },
      { status: 409 },
    );

  addReview({ requestId, reviewerId: user.id, revieweeId, rating, text });
  return NextResponse.json({ ok: true, summary: ratingSummary(revieweeId) });
}
