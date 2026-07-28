"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Stars } from "@/components/ui/Stars";
import { Button } from "@/components/ui/Button";
import { LeaderboardPanel } from "@/components/LeaderboardPanel";
import { useCurrentUser } from "@/components/hooks";

interface Course {
  id: number;
  skill: string;
  cost: number;
  estDays: number;
  description: string;
  popularity: number;
  teacherId: number;
  teacherName: string;
  teacherStyle: string;
  teacherRating: number;
  reviewCount: number;
}

type LearnState = { status: "idle" | "busy" | "done" | "error"; msg?: string };

export default function ExplorePage() {
  const { user, refresh: refreshUser } = useCurrentUser();
  const [courses, setCourses] = useState<Course[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [maxCost, setMaxCost] = useState("");
  const [minRating, setMinRating] = useState("");
  const [ai, setAi] = useState(false);
  const [learn, setLearn] = useState<Record<number, LearnState>>({});

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    if (maxCost) params.set("maxCost", maxCost);
    if (minRating) params.set("minRating", minRating);
    // Optionally broaden the search with AI-expanded synonyms (Gemma).
    if (ai && q.trim()) {
      try {
        const aiRes = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const aiData = await aiRes.json();
        for (const term of aiData.terms ?? []) params.append("term", term);
      } catch {
        /* fall back to plain keyword search */
      }
    }
    const res = await fetch(`/api/courses?${params.toString()}`);
    const data = await res.json();
    setCourses(data.courses ?? []);
  }, [q, sort, maxCost, minRating, ai]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  async function requestLearn(courseId: number) {
    setLearn((s) => ({ ...s, [courseId]: { status: "busy" } }));
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLearn((s) => ({
        ...s,
        [courseId]: { status: "error", msg: data.error ?? "Failed" },
      }));
      return;
    }
    setLearn((s) => ({ ...s, [courseId]: { status: "done" } }));
    refreshUser();
  }

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-accent-700">Explore</p>
          <h1 className="text-2xl font-bold text-stone-900">
            Find something to learn
          </h1>
        </div>
        {user ? (
          <span className="text-sm text-stone-500">
            You have{" "}
            <span className="font-semibold text-brand-600">
              ◈ {user.available}
            </span>{" "}
            available
          </span>
        ) : null}
      </div>

      <div className="ss-card mt-5 flex flex-wrap items-center gap-3 p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search skills, teachers…"
          className="ss-input flex-1"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="ss-input w-auto"
        >
          <option value="recent">Newest</option>
          <option value="popularity">Most popular</option>
          <option value="rating">Top rated</option>
          <option value="credits">Cheapest</option>
        </select>
        <select
          value={maxCost}
          onChange={(e) => setMaxCost(e.target.value)}
          className="ss-input w-auto"
        >
          <option value="">Any credits</option>
          <option value="1">◈ ≤ 1</option>
          <option value="2">◈ ≤ 2</option>
          <option value="3">◈ ≤ 3</option>
          <option value="4">◈ ≤ 4</option>
        </select>
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="ss-input w-auto"
        >
          <option value="">Any rating</option>
          <option value="3">3★ +</option>
          <option value="4">4★ +</option>
          <option value="4.5">4.5★ +</option>
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap px-1 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={ai}
            onChange={(e) => setAi(e.target.checked)}
            className="h-4 w-4 accent-brand-500"
          />
          ✨ AI search
        </label>
      </div>

      {courses.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-[color:var(--border)] px-4 py-10 text-center text-sm text-stone-500">
          No courses match. Try clearing filters — or be the first to teach one!
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const st = learn[c.id]?.status ?? "idle";
            const mine = user?.id === c.teacherId;
            const tooPoor = user ? user.available < c.cost : false;
            return (
              <div key={c.id} className="ss-card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-stone-900">
                    {c.skill}
                  </h3>
                  <Badge tone="brand">◈ {c.cost}</Badge>
                </div>
                <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm text-stone-500">
                  {c.description || "No description provided."}
                </p>

                <Link
                  href={`/profile/${c.teacherId}`}
                  className="mt-4 flex items-center gap-2"
                >
                  <Avatar name={c.teacherName} size="sm" />
                  <span className="text-sm">
                    <span className="font-medium text-stone-800">
                      {c.teacherName}
                    </span>
                    <span className="block text-xs text-stone-400">
                      {c.teacherStyle}
                    </span>
                  </span>
                </Link>

                <div className="mt-3 flex items-center justify-between text-xs text-stone-400">
                  <Stars value={c.teacherRating} count={c.reviewCount} />
                  <span>
                    ~{c.estDays}d · {c.popularity} learner
                    {c.popularity === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-4">
                  {mine ? (
                    <Button variant="secondary" size="sm" disabled className="w-full">
                      Your course
                    </Button>
                  ) : st === "done" ? (
                    <Link
                      href="/home"
                      className="block w-full rounded-xl bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-700"
                    >
                      Requested ✓ — view status
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={st === "busy" || tooPoor}
                      onClick={() => requestLearn(c.id)}
                    >
                      {st === "busy"
                        ? "Sending…"
                        : tooPoor
                          ? "Not enough credits"
                          : "Learn this"}
                    </Button>
                  )}
                  {st === "error" ? (
                    <p className="mt-1 text-xs text-red-500">
                      {learn[c.id]?.msg}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LeaderboardPanel />
    </div>
  );
}
