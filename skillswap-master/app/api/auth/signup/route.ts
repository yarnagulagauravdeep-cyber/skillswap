import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/crypto";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { createUser, getUserByEmail } from "@/lib/repos/users";

export const runtime = "nodejs";

function asTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string")
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  return [];
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email and password are required." },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }
  if (getUserByEmail(email)) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const { hash, salt } = hashPassword(password);
  const user = createUser({
    name,
    email,
    passwordHash: hash,
    salt,
    background: String(body.background ?? ""),
    education: String(body.education ?? ""),
    teachingStyle: String(body.teachingStyle ?? ""),
    learningStyle: String(body.learningStyle ?? ""),
    teachTags: asTags(body.teachTags),
    learnTags: asTags(body.learnTags),
  });

  const token = createSession(user.id);
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
