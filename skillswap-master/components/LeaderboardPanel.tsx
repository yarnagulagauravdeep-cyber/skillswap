"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Title, Text, BarList } from "@tremor/react";
import { Avatar } from "@/components/ui/Avatar";
import { Stars } from "@/components/ui/Stars";

interface Row {
  userId: number;
  name: string;
  earned: number;
  taught: number;
  learned: number;
  rating: number;
  reviews: number;
}

const medals = ["🥇", "🥈", "🥉"];

export function LeaderboardPanel() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .catch(() => setRows([]));
  }, []);

  const chartData = rows
    .filter((r) => r.earned > 0)
    .slice(0, 8)
    .map((r) => ({ name: r.name, value: r.earned }));

  return (
    <section className="mt-12 border-t border-[color:var(--border)] pt-8">
      <p className="text-sm font-medium text-brand-600">Community</p>
      <h2 className="text-2xl font-bold text-stone-900">Leaderboard</h2>
      <p className="mt-1 text-sm text-stone-500">
        Ranked by community credits earned from teaching. Give more, rank higher.
      </p>

      {chartData.length ? (
        <Card className="mt-6">
          <Title>Top contributors</Title>
          <Text>Credits earned by teaching</Text>
          <BarList data={chartData} className="mt-4" color="orange" />
        </Card>
      ) : null}

      <div className="ss-card mt-6 overflow-hidden">
        <div className="grid grid-cols-[3rem_1fr_auto_auto] items-center gap-3 border-b border-[color:var(--border)] bg-stone-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-stone-400">
          <span>#</span>
          <span>Member</span>
          <span className="text-right">Taught / Learned</span>
          <span className="text-right">Earned</span>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-stone-500">
            No contributors yet — be the first to teach a class!
          </p>
        ) : (
          rows.map((r, i) => (
            <Link
              key={r.userId}
              href={`/profile/${r.userId}`}
              className="grid grid-cols-[3rem_1fr_auto_auto] items-center gap-3 border-b border-[color:var(--border)] px-4 py-3 transition last:border-0 hover:bg-stone-50"
            >
              <span className="text-lg font-semibold text-stone-500">
                {medals[i] ?? i + 1}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <Avatar name={r.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-stone-800">
                    {r.name}
                  </span>
                  {r.reviews > 0 ? (
                    <Stars value={r.rating} count={r.reviews} />
                  ) : null}
                </span>
              </span>
              <span className="text-right text-sm text-stone-500">
                {r.taught} / {r.learned}
              </span>
              <span className="text-right font-semibold text-brand-600">
                ◈ {r.earned}
              </span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
