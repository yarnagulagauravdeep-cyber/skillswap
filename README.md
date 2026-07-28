# SkillSwap 🌿

A community skill-sharing and micro-volunteering platform — built for **Hackwarts: The Triwizard Web Challenge** (Challenge 7, "The Herbology Hub").

Users list what they can **teach** and what they want to **learn**. The platform matches them, runs the whole exchange through a scheduling + materials flow, and settles every session with a **community credit system** — no money changes hands, only time and talent.

> "Expertise sits idle everywhere. It just needs a greenhouse to grow toward the people who need it."

---

## ✨ Features

- **Skill matching** — browse and search courses people are teaching, with optional AI-powered query expansion (see below)
- **Request → Accept → Confirm → Complete** exchange lifecycle, with credits held in escrow and released on completion
- **Scheduling** — teachers set weekly availability; students confirm a subset of slots, generating a full timetable to the expected end date
- **Live sessions** — teacher shares a meet link, student joins when it's live
- **Materials** — teachers upload PDFs; student reading time is tracked with an open/close timer
- **Reviews** — 1–5 star ratings + text, either direction, any time an exchange exists
- **Leaderboard & stats** — community-wide contribution ranking, rendered with Tremor
- **Polished landing/UI** — GSAP-animated hero, a constellation background, Tremor dashboards

---

## 🧱 Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router) — frontend, routing, and API routes in **one** codebase, no separate backend service |
| Language | TypeScript (strict) |
| UI runtime | React 18 |
| Styling | Tailwind CSS v3 |
| Components | [Tremor](https://tremor.so) (`@tremor/react` v3) for stats/leaderboard charts |
| Animation | GSAP |
| 3D/visuals | Three.js (landing background) |
| Database | **`node:sqlite`** — Node's built-in SQLite module, zero native builds |
| Local AI | [LM Studio](https://lmstudio.ai) (Gemma) — optional, used for semantic search query expansion; fails soft if not running |
| Package manager | npm |

> **Why `node:sqlite` and not `better-sqlite3`?** `better-sqlite3` needs a C++ toolchain to compile natively. Node 24's built-in `node:sqlite` gives real SQL with zero native compilation — ambient types are declared in `types/node-sqlite.d.ts` since `@types/node` doesn't cover it yet.

> **Version pinning:** `@tremor/react` v3 targets React 18 + Tailwind v3. Don't upgrade to React 19 / Next 15+ / Tailwind v4 without migrating off classic Tremor first.

---

## 🗂️ Project Structure

```
app/
  page.tsx                     # landing page (redirects logged-in users → /home)
  (auth)/login, (auth)/signup  # auth screens
  home/                        # learning + teaching course lists
  explore/                     # browse courses + embedded leaderboard
  teach/                       # create a course
  requests/, requests/[id]/    # exchange inbox + lifecycle orchestrator
  profile/[id]/                # public profile, stats, reviews
  api/                         # auth, courses, requests, materials, reviews,
                                # leaderboard, swaps, ai/search
components/
  ui/                          # Button, Field, Badge, Avatar, Stars, TagInput
  request/                     # Scheduler, Materials, ReviewForm, StatusBadge
  Nav.tsx, hooks.ts            # app shell + client data hooks (incl. polling)
lib/
  db.ts                        # lazy SQLite connection + migrations + demo seed
  auth.ts                      # session cookie auth (getCurrentUser, requireUser)
  crypto.ts                    # scrypt password hashing + session tokens
  ai.ts                        # defensive LM Studio client (query expansion)
  repos/                       # typed data access: users, credits, courses,
                                # requests, materials, reviews, stats
scripts/seed.mjs               # database seeding script
data/                          # SQLite db + uploads (git-ignored, auto-created)
```

---

## 💳 How credits work

Every user starts with **5 credits**. A course costs **1–4 credits**.

- `availableCredits = balance − heldCredits`
- Credits are **held in escrow** the moment a teacher accepts a request
- Credits are **released on completion**: teacher `+cost`, student `−cost`, and the course's popularity `+1`
- Joining/learning is blocked if `available < cost`

## 🔄 Exchange lifecycle

```
pending → accepted → confirmed → completed   (or rejected)
```

1. Student sends a request → **pending**
2. Teacher accepts — sets weekly availability, session length, expected end date, ground rules; credits are escrowed → **accepted**
3. Student confirms a subset of the teacher's offered slots → **confirmed**; a full timetable is generated out to the expected end date
4. Teacher shares a meet link; the student's "Join class" button activates
5. Teacher uploads materials (PDF); reading time is tracked via an open/close timer
6. Either party marks the exchange **completed** → credits release

Reviews can be left by either side at any point once an exchange exists.

**Real-time-ish updates:** there are no sockets — the client polls every ~4s (`usePoll` in `components/hooks.ts`) on the request inbox, request detail, and materials list.

---

## 🤖 AI: local, optional, fails soft

Search/match can optionally be boosted by a **locally-running LM Studio** instance (Gemma model) that expands a free-text query into related skills/synonyms before matching — e.g. searching "guitar" also surfaces courses tagged "music theory" or "fingerstyle."

- Runs against `http://127.0.0.1:1234` by default (`LMSTUDIO_URL` env var to override)
- Fully **defensive**: if LM Studio isn't running, `expandQuery()` returns `[]` and the app transparently falls back to plain keyword matching — the "AI" toggle just shows a notice
- No API keys, no cloud calls, no cost — everything runs on your machine

---

## 🚀 Getting Started

### Requirements
- **Node.js ≥ 22.5** (developed on Node 24 — `node:sqlite` requires this; you'll see an `ExperimentalWarning` at runtime, which is expected)
- (Optional) [LM Studio](https://lmstudio.ai) running locally with a chat-capable model loaded, for AI-assisted search

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

The database auto-creates and seeds two demo users on first request:

| Email | Password |
|---|---|
| `priya@demo.dev` | `password` |
| `arjun@demo.dev` | `password` |

Log in as both (e.g. one normal tab + one incognito window) to try both sides of an exchange.

### Other commands

```bash
npm run build   # production build (also type-checks and lints)
npm run start   # serve the production build
npm run lint    # ESLint
npm run seed    # re-run the seed script manually
```

### Resetting the database

Delete the `data/` folder — it's recreated and reseeded automatically on the next request.

---

## 🧭 Conventions for contributors

- `@/` is the import alias for the project root
- App Router files are **Server Components by default** — add `"use client"` for hooks/handlers
- Any route touching the database sets `export const runtime = "nodejs"`
- **Never import `lib/db` or `lib/repos/*` into a client component** (they pull in `node:sqlite`); client components use the plain shapes in `components/request/types.ts` instead
- All data access goes through `lib/repos/*` — no raw SQL in route handlers

---

## 🏰 Built for Hackwarts

Built in an 8-hour ideathon for VIT Chennai's **Hackwarts: The Triwizard Web Challenge**, hosted by the Office of Students' Welfare and Prodinno — Challenge 7, *The Herbology Hub*.
