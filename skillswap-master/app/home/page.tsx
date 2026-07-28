import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { coursesByTeacher } from "@/lib/repos/courses";
import { Badge } from "@/components/ui/Badge";
import { LearningCourses } from "@/components/LearningCourses";
import { TeachingRequests } from "@/components/TeachingRequests";

export const runtime = "nodejs";

export default function HomePage() {
  const user = requireUser();
  const teaching = coursesByTeacher(user.id);

  return (
    <div className="py-4">
      <div>
        <p className="text-sm font-medium text-brand-600">Welcome back</p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Hi, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-stone-600">What would you like to do today?</p>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-900">Courses you&apos;re learning</h3>
          <Link href="/explore" className="text-sm font-medium text-brand-600 hover:underline">
            Find more
          </Link>
        </div>
        <LearningCourses userId={user.id} />
      </div>

      <TeachingRequests userId={user.id} />

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-900">Courses you teach</h3>
          <Link href="/teach" className="text-sm font-medium text-brand-600 hover:underline">
            + Add course
          </Link>
        </div>
        {teaching.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-[color:var(--border)] px-4 py-6 text-center text-sm text-stone-500">
            You haven&apos;t listed any courses yet. Teaching is how you earn credits!
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teaching.map((c) => (
              <Link
                key={c.id}
                href={`/teach/${c.id}`}
                className="ss-card block p-4 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-stone-900">{c.skill}</h4>
                  <Badge tone="brand">◈ {c.cost}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-stone-500">
                  {c.description || "No description"}
                </p>
                <p className="mt-3 text-xs text-stone-400">
                  ~{c.estDays} day{c.estDays > 1 ? "s" : ""} · {c.popularity} learner
                  {c.popularity === 1 ? "" : "s"}
                </p>
                <p className="mt-2 text-xs font-medium text-brand-600">
                  Manage class →
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
