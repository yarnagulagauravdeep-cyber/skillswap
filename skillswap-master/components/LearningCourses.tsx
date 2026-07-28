import Link from "next/link";
import { listOutgoingForStudent, getTimetable } from "@/lib/repos/requests";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/request/StatusBadge";

const CURRENT = ["pending", "accepted", "confirmed"];
// Approved (in-progress) exchanges rank above ones still awaiting the teacher.
const ORDER: Record<string, number> = { confirmed: 0, accepted: 1, pending: 2 };

function fmt(iso: string): { date: string; time: string; past: boolean } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
    past: d.getTime() < Date.now(),
  };
}

export function LearningCourses({ userId }: { userId: number }) {
  const current = listOutgoingForStudent(userId)
    .filter((r) => CURRENT.includes(r.status))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  if (current.length === 0) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-[color:var(--border)] px-4 py-6 text-center text-sm text-stone-500">
        You&apos;re not learning anything yet.{" "}
        <Link href="/explore" className="font-medium text-brand-600 hover:underline">
          Explore courses
        </Link>{" "}
        to get started.
      </p>
    );
  }

  return (
    <div className="mt-3 grid gap-4 lg:grid-cols-2">
      {current.map((r) => {
        const sessions = r.status === "confirmed" ? getTimetable(r.id) : [];
        const upcoming = sessions.filter((s) => new Date(s.startsAt) >= new Date());
        const next = upcoming[0] ?? sessions[0];

        return (
          <div key={r.id} className="ss-card flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-lg font-semibold text-stone-900">{r.skill}</h4>
                <Link
                  href={`/profile/${r.teacherId}`}
                  className="mt-1 flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"
                >
                  <Avatar name={r.teacherName} size="sm" />
                  {r.teacherName}
                </Link>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge status={r.status} />
                <Badge tone="brand">◈ {r.cost}</Badge>
              </div>
            </div>

            {/* Stage-specific hint */}
            {r.status === "pending" ? (
              <p className="mt-3 text-sm text-amber-700">
                Waiting for {r.teacherName} to accept and propose times.
              </p>
            ) : null}
            {r.status === "accepted" ? (
              <p className="mt-3 text-sm text-accent-700">
                {r.teacherName} proposed times — pick the slots that work for you.
              </p>
            ) : null}

            {/* Rules */}
            {r.rulesText ? (
              <p className="mt-3 line-clamp-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                <span className="font-medium text-stone-700">Rules: </span>
                {r.rulesText}
              </p>
            ) : null}

            {/* Timetable */}
            {r.status === "confirmed" && sessions.length ? (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Timetable
                  </p>
                  {next ? (
                    <span className="text-xs text-stone-500">
                      Next: {fmt(next.startsAt).date}, {fmt(next.startsAt).time}
                    </span>
                  ) : null}
                </div>
                <ul className="divide-y divide-[color:var(--border)] rounded-lg border border-[color:var(--border)]">
                  {sessions.slice(0, 4).map((s) => {
                    const f = fmt(s.startsAt);
                    return (
                      <li
                        key={s.id}
                        className={`flex items-center justify-between px-3 py-1.5 text-sm ${
                          f.past ? "text-stone-400" : "text-stone-700"
                        }`}
                      >
                        <span>
                          {f.date} · {f.time}
                        </span>
                        <span className="text-xs text-stone-400">
                          {r.sessionLenMin} min
                        </span>
                      </li>
                    );
                  })}
                  {sessions.length > 4 ? (
                    <li className="px-3 py-1.5 text-xs text-stone-400">
                      +{sessions.length - 4} more session
                      {sessions.length - 4 === 1 ? "" : "s"}
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--border)] pt-4">
              {r.status === "confirmed" && r.meetLink ? (
                <a
                  href={r.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                  Join class
                </a>
              ) : r.status === "confirmed" ? (
                <span className="text-sm text-stone-400">
                  Waiting for meeting link…
                </span>
              ) : null}
              <Link
                href={`/requests/${r.id}`}
                className="ml-auto text-sm font-medium text-brand-600 hover:underline"
              >
                Open course →
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
