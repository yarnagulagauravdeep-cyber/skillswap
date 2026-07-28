import { db } from "../db";

export interface Contributor {
  userId: number;
  name: string;
  earned: number; // credits earned from completed teaching
  taught: number; // completed courses taught
  learned: number; // completed courses learned
  rating: number; // avg review rating
  reviews: number;
}

/** Credits a user has earned by teaching completed exchanges. */
export function creditsEarned(userId: number): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(c.cost), 0) AS earned
         FROM requests q JOIN courses c ON c.id = q.course_id
        WHERE q.teacher_id = ? AND q.status = 'completed'`,
    )
    .get(userId) as { earned: number };
  return Number(row.earned);
}

export function contributionStats(userId: number): {
  earned: number;
  taught: number;
  learned: number;
} {
  const row = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM requests WHERE teacher_id = ? AND status = 'completed') AS taught,
         (SELECT COUNT(*) FROM requests WHERE student_id = ? AND status = 'completed') AS learned`,
    )
    .get(userId, userId) as { taught: number; learned: number };
  return {
    earned: creditsEarned(userId),
    taught: Number(row.taught),
    learned: Number(row.learned),
  };
}

/** Community leaderboard — ranked by credits earned, rating as tiebreaker. */
export function leaderboard(limit = 20): Contributor[] {
  const rows = db
    .prepare(
      `SELECT
         u.id AS userId, u.name AS name,
         COALESCE((SELECT SUM(c.cost) FROM requests q JOIN courses c ON c.id = q.course_id
                    WHERE q.teacher_id = u.id AND q.status = 'completed'), 0) AS earned,
         (SELECT COUNT(*) FROM requests WHERE teacher_id = u.id AND status = 'completed') AS taught,
         (SELECT COUNT(*) FROM requests WHERE student_id = u.id AND status = 'completed') AS learned,
         COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id), 0) AS rating,
         (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) AS reviews
       FROM users u
       ORDER BY earned DESC, rating DESC, taught DESC
       LIMIT ?`,
    )
    .all(limit);
  return rows.map((r) => ({
    userId: Number(r.userId),
    name: String(r.name),
    earned: Number(r.earned),
    taught: Number(r.taught),
    learned: Number(r.learned),
    rating: Math.round(Number(r.rating) * 10) / 10,
    reviews: Number(r.reviews),
  }));
}
