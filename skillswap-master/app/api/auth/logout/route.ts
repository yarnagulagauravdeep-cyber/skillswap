import { NextResponse } from "next/server";
import {
  currentSessionToken,
  destroySession,
  SESSION_COOKIE,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const token = currentSessionToken();
  if (token) destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
