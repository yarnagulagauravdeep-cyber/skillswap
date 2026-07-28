import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { availableCredits } from "@/lib/repos/credits";
import { ProfileMenu } from "@/components/ProfileMenu";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/requests", label: "Requests" },
];

export function Nav() {
  const user = getCurrentUser();
  // No navbar for signed-out visitors — the landing/auth pages stand on their own.
  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/home" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 font-display text-sm font-bold text-white shadow-sm">
            S
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-stone-900">
            Skill<span className="text-brand-600">Swap</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/teach"
            className="inline-flex items-center gap-1 rounded-xl bg-brand-500 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
          >
            <span aria-hidden>+</span> Teach
          </Link>
          <ProfileMenu
            userId={user.id}
            name={user.name}
            available={availableCredits(user.id)}
          />
        </div>
      </div>
    </header>
  );
}
