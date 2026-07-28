import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listIncomingForTeacher } from "@/lib/repos/requests";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/request/StatusBadge";

export const runtime = "nodejs";

// Pending needs the teacher to act, so it sorts first; finished work sinks down.
const ORDER: Record<string, number> = {
  pending: 0,
  accepted: 1,
  confirmed: 2,
  completed: 3,
  rejected: 4,
};

export default function RequestsPage() {
  const user = requireUser();
  const incoming = listIncomingForTeacher(user.id).sort(
    (a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9),
  );

  const pendingCount = incoming.filter((r) => r.status === "pending").length;

  return (
    <div className="py-4">
      <p className="eyebrow">Your inbox</p>
      <h1 className="text-3xl font-bold tracking-tight text-stone-900">
        Requests to teach
      </h1>
      <p className="mt-1 text-stone-600">
        {pendingCount > 0
          ? `${pendingCount} request${pendingCount === 1 ? "" : "s"} waiting for your response.`
          : "Students who want to learn from you show up here."}
      </p>

      <div className="mt-6 space-y-3">
        {incoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[color:var(--border)] px-4 py-10 text-center text-sm text-stone-500">
            No one has requested your courses yet.{" "}
            <Link href="/teach" className="font-medium text-brand-600 hover:underline">
              List a course
            </Link>{" "}
            so students can find you.
          </p>
        ) : (
          incoming.map((r) => (
            <Link
              key={r.id}
              href={`/requests/${r.id}`}
              className="ss-card flex items-center gap-4 p-4 transition hover:shadow-md"
            >
              <Avatar name={r.studentName} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900">{r.skill}</p>
                <p className="text-sm text-stone-500">
                  {r.studentName} wants to learn · ◈ {r.cost}
                </p>
              </div>
              {r.status === "pending" ? (
                <span className="hidden rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 sm:inline">
                  Action needed
                </span>
              ) : null}
              <StatusBadge status={r.status} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
