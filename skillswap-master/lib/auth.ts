import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { newToken } from "./crypto";
import {
  getUserRowById,
  toPublicUser,
  type PublicUser,
} from "./repos/users";

export const SESSION_COOKIE = "ss_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

export function createSession(userId: number): string {
  const token = newToken();
  db.prepare("INSERT INTO sessions (id, user_id) VALUES (?, ?)").run(
    token,
    userId,
  );
  return token;
}

export function destroySession(token: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
}

function userIdForToken(token: string): number | null {
  const row = db
    .prepare("SELECT user_id FROM sessions WHERE id = ?")
    .get(token) as { user_id: number } | undefined;
  return row ? Number(row.user_id) : null;
}

/** Current signed-in user (or null). Works in server components and route handlers. */
export function getCurrentUser(): PublicUser | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const uid = userIdForToken(token);
  if (!uid) return null;
  const row = getUserRowById(uid);
  return row ? toPublicUser(row) : null;
}

export function currentSessionToken(): string | undefined {
  return cookies().get(SESSION_COOKIE)?.value;
}

/** For server components/pages: return the user or redirect to /login. */
export function requireUser(): PublicUser {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
