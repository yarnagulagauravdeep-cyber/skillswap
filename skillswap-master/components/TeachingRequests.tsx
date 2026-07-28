import Link from "next/link";
import { listIncomingForTeacher } from "@/lib/repos/requests";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/request/StatusBadge";

const CURRENT = ["pending", "accepted", "confirmed"];
// Pending requests need the teacher's action, so they surface first.
const ORDER: Record<string, number> = { pending: 0, accepted: 1, confirmed: 2 };

export function TeachingRequests({ userId }: { userId: number }) {
  const incoming = listIncomingForTeacher(userId)
    .filter((r) => CURRENT.includes(r.status))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  if (incoming.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="font-semibold text-stone-900">Requests to teach</h3>
      <div className="mt-3 space-y-3">
        {incoming.map((r) => (
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
        ))}
      </div>
    </div>
  );
}
