import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPublicUserById } from "@/lib/repos/users";
import { ratingSummary, reviewsForUser } from "@/lib/repos/reviews";
import { coursesByTeacher } from "@/lib/repos/courses";
import { contributionStats } from "@/lib/repos/stats";
import { haveExchanged } from "@/lib/repos/requests";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Stars } from "@/components/ui/Stars";
import { ReviewForm } from "@/components/request/ReviewForm";

export const runtime = "nodejs";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="ss-card p-4 text-center">
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="text-xs uppercase tracking-wide text-stone-400">{label}</p>
    </div>
  );
}

export default function ProfilePage({ params }: { params: { id: string } }) {
  const profile = getPublicUserById(Number(params.id));
  if (!profile) notFound();

  const viewer = getCurrentUser();
  const summary = ratingSummary(profile.id);
  const reviews = reviewsForUser(profile.id);
  const courses = coursesByTeacher(profile.id);
  const stats = contributionStats(profile.id);
  const canReview =
    !!viewer && viewer.id !== profile.id && haveExchanged(viewer.id, profile.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-4">
      <div className="ss-card p-6">
        <div className="flex items-center gap-4">
          <Avatar name={profile.name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{profile.name}</h1>
            <div className="mt-1">
              <Stars value={summary.avg} count={summary.count} />
            </div>
          </div>
        </div>
        {(profile.background || profile.education) && (
          <div className="mt-4 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
            {profile.background ? (
              <p>
                <span className="text-stone-400">Background:</span>{" "}
                {profile.background}
              </p>
            ) : null}
            {profile.education ? (
              <p>
                <span className="text-stone-400">Education:</span>{" "}
                {profile.education}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Credits earned" value={`◈ ${stats.earned}`} />
        <StatTile label="Courses taught" value={stats.taught} />
        <StatTile label="Courses learned" value={stats.learned} />
        <StatTile label="Rating" value={summary.avg ? summary.avg.toFixed(1) : "—"} />
      </div>

      <div className="ss-card p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-stone-700">Can teach</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.teachTags.length ? (
                profile.teachTags.map((t) => (
                  <Badge key={t} tone="brand">
                    {t}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-stone-400">—</span>
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-stone-700">
              Wants to learn
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.learnTags.length ? (
                profile.learnTags.map((t) => (
                  <Badge key={t} tone="accent">
                    {t}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-stone-400">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {courses.length ? (
        <div className="ss-card p-6">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">
            Courses offered
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-[color:var(--border)] p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-stone-800">{c.skill}</p>
                  <Badge tone="brand">◈ {c.cost}</Badge>
                </div>
                <p className="mt-1 text-xs text-stone-400">
                  ~{c.estDays}d · {c.popularity} learner
                  {c.popularity === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ss-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">
          Reviews ({summary.count})
        </h2>
        {canReview ? (
          <div className="mb-5 rounded-xl bg-stone-50 p-4">
            <p className="mb-2 text-sm font-medium text-stone-700">
              Leave a review
            </p>
            <ReviewForm revieweeId={profile.id} revieweeName={profile.name} />
          </div>
        ) : null}
        {reviews.length ? (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="border-b border-[color:var(--border)] pb-4 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Avatar name={r.reviewerName} size="sm" />
                  <span className="text-sm font-medium text-stone-800">
                    {r.reviewerName}
                  </span>
                  <Stars value={r.rating} />
                </div>
                {r.text ? (
                  <p className="mt-1.5 text-sm text-stone-600">{r.text}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">No reviews yet.</p>
        )}
      </div>
    </div>
  );
}
