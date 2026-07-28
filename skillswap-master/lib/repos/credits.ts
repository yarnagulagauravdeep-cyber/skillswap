import { db } from "../db";

// Statuses during which a student's credits are held in escrow (reserved
// on accept, released on completion).
const HELD_STATUSES = ["accepted", "scheduled", "confirmed"];

/** Credits currently reserved against a student's balance by active exchanges. */
export function heldCredits(userId: number): number {
  const placeholders = HELD_STATUSES.map(() => "?").join(",");
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(escrow_credits), 0) AS held
         FROM requests
        WHERE student_id = ? AND status IN (${placeholders})`,
    )
    .get(userId, ...HELD_STATUSES) as { held: number };
  return Number(row.held);
}

export function creditBalance(userId: number): number {
  const row = db
    .prepare("SELECT credits FROM users WHERE id = ?")
    .get(userId) as { credits: number } | undefined;
  return row ? Number(row.credits) : 0;
}

/** Spendable credits = balance minus what's already held in escrow. */
export function availableCredits(userId: number): number {
  return creditBalance(userId) - heldCredits(userId);
}

export function adjustCredits(userId: number, delta: number): void {
  db.prepare("UPDATE users SET credits = credits + ? WHERE id = ?").run(
    delta,
    userId,
  );
}
