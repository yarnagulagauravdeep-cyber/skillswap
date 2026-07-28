"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";

export function ProfileMenu({
  userId,
  name,
  available,
}: {
  userId: number;
  name: string;
  available: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="group relative">
      <button className="flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-200">
        <Avatar name={name} size="sm" />
      </button>

      {/* Hover/focus dropdown. The pt-2 forms a bridge so the menu stays open
          while the cursor travels from the avatar down into it. */}
      <div className="invisible absolute right-0 top-full z-40 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="w-56 rounded-xl border border-[color:var(--border)] bg-white p-1.5 shadow-lg shadow-stone-900/5">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-stone-900">
              {name}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              <span className="font-semibold text-brand-600">◈ {available}</span>{" "}
              credits available
            </p>
          </div>
          <div className="my-1 h-px bg-[color:var(--border)]" />
          <Link
            href={`/profile/${userId}`}
            className="block rounded-lg px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-100"
          >
            View profile
          </Link>
          <button
            onClick={logout}
            disabled={busy}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            {busy ? "Logging out…" : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}
