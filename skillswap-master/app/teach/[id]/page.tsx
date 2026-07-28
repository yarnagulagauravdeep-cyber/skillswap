import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCourse } from "@/lib/repos/courses";
import { listIncomingForTeacher } from "@/lib/repos/requests";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Stars } from "@/components/ui/Stars";
import { StatusBadge } from "@/components/request/StatusBadge";

export const runtime = "nodejs";

// What the teacher does next for each student, and where that lives.
const NEXT: Record<string, string> = {
  pending: "Review & schedule class →",
  accepted: "Waiting for student's times →",
  confirmed: "Share meet link & upload PDF →",
  completed: "View exchange →",
  rejected: "View →",
};

export default function CourseManagePage({
  params,
}: {
  params: { id: string };
}) {
  const user = requireUser();
  const course = getCourse(Number(params.id));
  if (!course) notFound();
  if (course.teacherId !== user.id) redirect("/home");

  const students = listIncomingForTeacher(user.id).filter(
    (r) => r.courseId === course.id,
  );
  const active = students.filter((r) =>
    ["pending", "accepted", "confirmed"].includes(r.status),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href="/home" className="text-sm text-stone-500 hover:text-stone-800">
        ← Back to home
      </Link>

      {/* Course data */}
      <div className="ss-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Course you teach</p>
            <h1 className="text-2xl font-bold text-stone-900">{course.skill}</h1>
          </div>
          <Badge tone="brand">◈ {course.cost} to learn</Badge>
        </div>

        {course.description ? (
          <p className="mt-3 text-stone-600">{course.description}</p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Length" value={`~${course.estDays} day${course.estDays === 1 ? "" : "s"}`} />
          <Stat label="Learners" value={course.popularity} />
          <Stat label="Active now" value={active.length} />
          <div className="rounded-xl border border-[color:var(--border)] p-3">
            <p className="text-xs uppercase tracking-wide text-stone-400">
              Your rating
            </p>
            <div className="mt-1">
              <Stars value={course.teacherRating} count={course.reviewCount} />
            </div>
          </div>
        </div>
      </div>

      {/* Students / exchanges — scheduling + PDF upload happen per student */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Students &amp; classes</h2>
          <span className="text-sm text-stone-400">
            Schedule a class and share PDFs from each exchange.
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {students.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[color:var(--border)] px-4 py-10 text-center text-sm text-stone-500">
              No students yet. Share your profile or wait for requests to come in.
            </p>
          ) : (
            students.map((r) => (
              <Link
                key={r.id}
                href={`/requests/${r.id}`}
                className="ss-card flex items-center gap-4 p-4 transition hover:shadow-md"
              >
                <Avatar name={r.studentName} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900">
                    {r.studentName}
                  </p>
                  <p className="text-sm font-medium text-brand-600">
                    {NEXT[r.status] ?? "View →"}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] p-3">
      <p className="text-xs uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-stone-900">{value}</p>
    </div>
  );
}
