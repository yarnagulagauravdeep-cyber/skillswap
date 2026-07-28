import { db } from "../db";

export interface Review {
  id: number;
  requestId: number | null;
  reviewerId: number;
  reviewerName: string;
  revieweeId: number;
  rating: number;
  text: string;
  createdAt: string;
}

export interface RatingSummary {
  avg: number; // 0..5, rounded to 1 dp
  count: number;
}

function mapReview(row: Record<string, unknown>): Review {
  return {
    id: Number(row.id),
    requestId: row.request_id == null ? null : Number(row.request_id),
    reviewerId: Number(row.reviewer_id),
    reviewerName: String(row.reviewerName ?? ""),
    revieweeId: Number(row.reviewee_id),
    rating: Number(row.rating),
    text: String(row.text ?? ""),
    createdAt: String(row.created_at),
  };
}

export function addReview(input: {
  requestId: number | null;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  text: string;
}): void {
  db.prepare(
    `INSERT INTO reviews (request_id, reviewer_id, reviewee_id, rating, text)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    input.requestId,
    input.reviewerId,
    input.revieweeId,
    input.rating,
    input.text.trim(),
  );
}

export function reviewsForUser(userId: number): Review[] {
  const rows = db
    .prepare(
      `SELECT r.*, u.name AS reviewerName
         FROM reviews r JOIN users u ON u.id = r.reviewer_id
        WHERE r.reviewee_id = ?
        ORDER BY r.created_at DESC`,
    )
    .all(userId);
  return rows.map(mapReview);
}

export function ratingSummary(userId: number): RatingSummary {
  const row = db
    .prepare(
      `SELECT COALESCE(AVG(rating), 0) AS avg, COUNT(*) AS count
         FROM reviews WHERE reviewee_id = ?`,
    )
    .get(userId) as { avg: number; count: number };
  return { avg: Math.round(Number(row.avg) * 10) / 10, count: Number(row.count) };
}

/** Has `reviewerId` already reviewed `revieweeId` for this exchange? */
export function hasReviewed(
  requestId: number,
  reviewerId: number,
): boolean {
  const row = db
    .prepare(
      "SELECT 1 AS x FROM reviews WHERE request_id = ? AND reviewer_id = ?",
    )
    .get(requestId, reviewerId);
  return !!row;
}
