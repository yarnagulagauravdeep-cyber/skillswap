import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/crypto";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { getUserByEmail, toPublicUser } from "@/lib/repos/users";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const row = getUserByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash, row.salt)) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const token = createSession(row.id);
  const res = NextResponse.json({ user: toPublicUser(row) });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
