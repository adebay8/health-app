# Health Dashboard Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 14 dashboard at `apps/web` that consumes the `/api/v1/dashboard/patients/*` API from the backend monorepo, renders a tabbed view of each demo patient's health data, surfaces deterministic insights + narration, and lets the user ask free-form questions.

**Architecture:** Server components by default — dashboard pages fetch from the NestJS API on the server via a typed `api-client.ts` that imports types directly from `@health-app/shared-types`. Two client components only: `patient-switcher.tsx` (reads/writes a `demo-patient-id` cookie, calls `router.refresh()` on change) and `ask-box.tsx` (posts the question to the API from the browser and renders the response). Tailwind + shadcn/ui for styling and primitives.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript 5, Tailwind CSS 3, shadcn/ui, pnpm workspaces, Turborepo.

**Reference spec:** `docs/superpowers/specs/2026-04-10-health-dashboard-mvp-design.md` Section 11.
**Backend plan (done):** `docs/superpowers/plans/2026-04-10-health-dashboard-backend.md`.

**API paths consumed:**
- `GET /api/v1/dashboard/patients` → `PatientSummary[]`
- `GET /api/v1/dashboard/patients/:id` → `NormalizedPatientPayload`
- `GET /api/v1/dashboard/patients/:id/insights` → `InsightsResponse`
- `POST /api/v1/dashboard/patients/:id/ask` → `AskResponse`
- `POST /api/v1/dashboard/patients/:id/refresh` → `NormalizedPatientPayload`

All responses come back wrapped by the backend's `TransformInterceptor` as `{ success: true, data: <payload> }`. The api-client unwraps this once centrally.

**Tests:** None for the frontend in MVP (per spec Section 12). The final smoke-test task walks the real app end-to-end in a browser (or via curl against the Next.js server) as verification.

---

## File Structure

```
apps/web/                              # New Next.js 14 App Router app
├── package.json                       # name: @health-app/web, workspace deps
├── next.config.mjs                    # transpilePackages for workspace libs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json                      # extends ../../tsconfig.base.json
├── components.json                    # shadcn/ui config
├── .env.local                         # NEXT_PUBLIC_API_BASE_URL
├── .gitignore
├── app/
│   ├── layout.tsx                     # <html>, <body>, global header with patient switcher
│   ├── page.tsx                       # redirects to /dashboard
│   ├── globals.css                    # Tailwind + shadcn base styles
│   └── dashboard/
│       ├── layout.tsx                 # tab nav (Overview | Conditions | Meds | Labs | Visits)
│       ├── page.tsx                   # Overview tab: summary + insights + cards grid + ask box
│       ├── conditions/page.tsx        # Conditions deep view
│       ├── medications/page.tsx       # Medications deep view + Allergies side panel
│       ├── labs/page.tsx              # Labs & Vitals deep view
│       └── visits/page.tsx            # Encounters deep view
├── components/
│   ├── ui/                            # shadcn-generated primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── alert.tsx
│   │   ├── separator.tsx
│   │   └── skeleton.tsx
│   ├── header.tsx                     # Server component — renders the patient switcher
│   ├── patient-switcher.tsx           # 'use client' — dropdown + cookie + router.refresh
│   ├── insights-panel.tsx             # Renders flags list + narration
│   ├── ask-box.tsx                    # 'use client' — POST /ask, render response
│   └── cards/
│       ├── summary-card.tsx
│       ├── conditions-card.tsx
│       ├── medications-card.tsx
│       ├── allergies-card.tsx
│       ├── labs-card.tsx
│       └── encounters-card.tsx
└── lib/
    ├── api-client.ts                  # Typed fetchers for all 5 endpoints
    ├── patient-context.ts             # Server-only helpers to resolve current patient id from cookie
    └── utils.ts                       # shadcn-generated cn() helper
```

---

## Phase A — Scaffold

### Task 1: Scaffold `apps/web` with Next.js 14

**Files:**
- Create: entire `apps/web/` tree via `create-next-app@14`
- Modify: `apps/web/package.json` (rename, add workspace deps)
- Modify: `apps/web/next.config.mjs` (transpile workspace packages)
- Modify: `apps/web/tsconfig.json` (extend base, add workspace paths)
- Delete: `apps/web/package-lock.json` (npm artifact from create-next-app)
- Delete: `apps/web/README.md` (default template noise)
- Delete: `apps/web/public/next.svg`, `apps/web/public/vercel.svg`

- [ ] **Step 1: Verify current directory and branch**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
git status    # should be clean on main (or a new feature branch)
git branch --show-current
```

If on `main`: create a feature branch before proceeding.

```bash
git checkout -b feat/health-dashboard-frontend
```

- [ ] **Step 2: Run `create-next-app` into `apps/web`**

```bash
pnpm dlx create-next-app@14 apps/web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --use-pnpm
```

Answer any interactive prompt with the default (press Enter). Expected: a new `apps/web/` directory with all the Next.js 14 scaffold files.

- [ ] **Step 3: Delete the npm lockfile and template noise**

```bash
rm -f apps/web/package-lock.json apps/web/README.md apps/web/public/next.svg apps/web/public/vercel.svg
```

- [ ] **Step 4: Replace `apps/web/package.json`**

Read the scaffolded version first to see the exact dependency pins `create-next-app` produced, then REPLACE it with this content (keep the versions that were in the scaffold for next/react/typescript/tailwind — only change name, add workspace deps, and set `private: true`):

```json
{
  "name": "@health-app/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "@health-app/shared-types": "workspace:*",
    "next": "14.2.15",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.20",
    "eslint": "^8",
    "eslint-config-next": "14.2.15",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

Note: `dev` and `start` both use port `3001` so they don't collide with the backend on `3000`.

Note: If the scaffolded `next` version differs from `14.2.15`, use whatever version the scaffold actually generated. The key changes are: name, scripts, workspace dep, private flag.

- [ ] **Step 5: Replace `apps/web/next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@health-app/shared-types'],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
```

If `create-next-app` generated `next.config.js` instead of `.mjs`, rename it and use the content above.

- [ ] **Step 6: Replace `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Note: this file does NOT inherit `module: commonjs` from the base — it overrides to `esnext` because Next.js needs ES modules. All other base settings (decorators, strict, etc.) are inherited.

- [ ] **Step 7: Install dependencies from repo root**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm install
```

Expected: pnpm resolves `@health-app/shared-types` via the workspace, installs next/react/tailwind/etc. under `apps/web/node_modules/`.

- [ ] **Step 8: Verify the scaffold builds**

```bash
pnpm --filter @health-app/web build
```

Expected: successful Next.js build. Warnings about unused default page are OK.

- [ ] **Step 9: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): scaffold nextjs 14 app router app"
```

---

### Task 2: Initialize shadcn/ui and install base components

**Files:**
- Create: `apps/web/components.json` (shadcn config, created by `shadcn init`)
- Create: `apps/web/components/ui/button.tsx`
- Create: `apps/web/components/ui/card.tsx`
- Create: `apps/web/components/ui/dropdown-menu.tsx`
- Create: `apps/web/components/ui/input.tsx`
- Create: `apps/web/components/ui/badge.tsx`
- Create: `apps/web/components/ui/alert.tsx`
- Create: `apps/web/components/ui/separator.tsx`
- Create: `apps/web/components/ui/skeleton.tsx`
- Create: `apps/web/lib/utils.ts` (created by `shadcn init`)
- Modify: `apps/web/app/globals.css` (shadcn CSS vars injected)
- Modify: `apps/web/tailwind.config.ts` (shadcn theme extension)

- [ ] **Step 1: Run shadcn/ui init**

```bash
cd apps/web
pnpm dlx shadcn@latest init --yes --defaults --base-color slate
```

If `shadcn@latest` prompts despite `--yes --defaults`, answer:
- Would you like to use TypeScript? **yes**
- Which style? **default**
- Which color? **slate**
- Where is your global CSS file? **app/globals.css**
- Would you like to use CSS variables for colors? **yes**
- Where is your tailwind.config located? **tailwind.config.ts**
- Configure the import alias for components? **@/components**
- Configure the import alias for utils? **@/lib/utils**
- Are you using React Server Components? **yes**
- Write configuration to components.json? **yes**

Expected output: `components.json`, `lib/utils.ts`, updated `app/globals.css`, updated `tailwind.config.ts`.

- [ ] **Step 2: Add the shadcn components we need**

```bash
pnpm dlx shadcn@latest add button card dropdown-menu input badge alert separator skeleton
```

If shadcn prompts "Some dependencies are not installed, install them?" answer **yes** (installs `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`).

Expected: 8 files in `apps/web/components/ui/`.

- [ ] **Step 3: Return to repo root and verify the web build still passes**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm --filter @health-app/web build
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components.json apps/web/components/ui apps/web/lib/utils.ts apps/web/app/globals.css apps/web/tailwind.config.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): initialize shadcn/ui with base primitives"
```

---

### Task 3: Create the typed API client

**Files:**
- Create: `apps/web/lib/api-client.ts`
- Create: `apps/web/.env.local` (not committed)
- Create: `apps/web/.env.example` (committed template)

- [ ] **Step 1: Create `apps/web/.env.local`** (gitignored — do NOT commit)

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

- [ ] **Step 2: Create `apps/web/.env.example`** (committed)

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

- [ ] **Step 3: Create `apps/web/lib/api-client.ts`**

```ts
import type {
  AskRequest,
  AskResponse,
  InsightsResponse,
  NormalizedPatientPayload,
  PatientSummary,
} from '@health-app/shared-types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

// Every backend response is wrapped by the TransformInterceptor as
// { success: true, data: <payload> }. This helper unwraps it once.
interface Envelope<T> {
  success: boolean;
  data: T;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    // Server components: disable Next.js fetch caching so a new
    // /refresh POST immediately shows fresh data on the next server render.
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, `${res.status} ${res.statusText}: ${body}`);
  }

  const env: Envelope<T> = await res.json();
  return env.data;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function listPatients(): Promise<PatientSummary[]> {
  return request<PatientSummary[]>('/dashboard/patients');
}

export async function getPatient(
  patientId: string,
): Promise<NormalizedPatientPayload> {
  return request<NormalizedPatientPayload>(`/dashboard/patients/${patientId}`);
}

export async function getInsights(
  patientId: string,
): Promise<InsightsResponse> {
  return request<InsightsResponse>(
    `/dashboard/patients/${patientId}/insights`,
  );
}

export async function askQuestion(
  patientId: string,
  question: string,
): Promise<AskResponse> {
  const body: AskRequest = { question };
  return request<AskResponse>(`/dashboard/patients/${patientId}/ask`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function refreshPatient(
  patientId: string,
): Promise<NormalizedPatientPayload> {
  return request<NormalizedPatientPayload>(
    `/dashboard/patients/${patientId}/refresh`,
    { method: 'POST' },
  );
}
```

- [ ] **Step 4: Build to verify the type imports resolve**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm --filter @health-app/web build
```

Expected: clean build. If `@health-app/shared-types` can't be found, the workspace dep is broken — check `apps/web/package.json` has `"@health-app/shared-types": "workspace:*"` and re-run `pnpm install`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api-client.ts apps/web/.env.example
git commit -m "feat(web): add typed api client for dashboard endpoints"
```

---

## Phase B — Layout and navigation

### Task 4: Patient-context helper + patient switcher (client component)

**Files:**
- Create: `apps/web/lib/patient-context.ts`
- Create: `apps/web/components/patient-switcher.tsx`

- [ ] **Step 1: Create `apps/web/lib/patient-context.ts`**

Server-only helper that reads the `demo-patient-id` cookie and resolves to a concrete patient id. If no cookie (first visit) it falls back to the first patient in the API's list.

```ts
import { cookies } from 'next/headers';
import { listPatients } from './api-client';

export const PATIENT_COOKIE_NAME = 'demo-patient-id';

// Resolve the "current" patient id for server components.
// Falls back to the first patient from the backend if the cookie is absent.
export async function getCurrentPatientId(): Promise<string> {
  const cookieStore = cookies();
  const fromCookie = cookieStore.get(PATIENT_COOKIE_NAME)?.value;
  if (fromCookie) return fromCookie;

  const patients = await listPatients();
  if (patients.length === 0) {
    throw new Error('No demo patients available — run `pnpm seed` in apps/api.');
  }
  return patients[0].id;
}
```

- [ ] **Step 2: Create `apps/web/components/patient-switcher.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { PatientSummary } from '@health-app/shared-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export const PATIENT_COOKIE_NAME = 'demo-patient-id';

interface Props {
  patients: PatientSummary[];
  currentPatientId: string;
}

export function PatientSwitcher({ patients, currentPatientId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const current =
    patients.find((p) => p.id === currentPatientId) ?? patients[0];

  function selectPatient(id: string) {
    document.cookie = `${PATIENT_COOKIE_NAME}=${id}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => {
      router.refresh();
    });
  }

  if (!current) {
    return (
      <span className="text-sm text-muted-foreground">No demo patients</span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          {current.firstName} {current.lastName}
          <span aria-hidden="true" className="ml-2">▾</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {patients.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => selectPatient(p.id)}>
            {p.firstName} {p.lastName}
            <span className="ml-2 text-xs text-muted-foreground">
              {p.gender} · {p.dateOfBirth}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/patient-context.ts apps/web/components/patient-switcher.tsx
git commit -m "feat(web): add patient-context helper and switcher client component"
```

---

### Task 5: Root layout with header

**Files:**
- Create: `apps/web/components/header.tsx`
- Replace: `apps/web/app/layout.tsx` (default scaffold version)
- Replace: `apps/web/app/page.tsx` (default scaffold version)

- [ ] **Step 1: Create `apps/web/components/header.tsx`** (server component)

```tsx
import Link from 'next/link';
import { PatientSwitcher } from './patient-switcher';
import { listPatients } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';

export async function Header() {
  const patients = await listPatients();
  const currentPatientId = await getCurrentPatientId();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Health
        </Link>
        <PatientSwitcher
          patients={patients}
          currentPatientId={currentPatientId}
        />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Replace `apps/web/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/header';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Health Dashboard',
  description: 'Aggregated health data for demo patients',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Replace `apps/web/app/page.tsx`** (redirect to /dashboard)

```tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard');
}
```

- [ ] **Step 4: Build to verify**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm --filter @health-app/web build
```

Expected: clean build. The build may emit a warning that `app/page.tsx` uses redirect at build time — that's fine.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/header.tsx apps/web/app/layout.tsx apps/web/app/page.tsx
git commit -m "feat(web): add root layout with header and home redirect"
```

---

### Task 6: Dashboard layout with tab nav

**Files:**
- Create: `apps/web/app/dashboard/layout.tsx`

- [ ] **Step 1: Create `apps/web/app/dashboard/layout.tsx`**

```tsx
import Link from 'next/link';

const TABS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/conditions', label: 'Conditions' },
  { href: '/dashboard/medications', label: 'Medications' },
  { href: '/dashboard/labs', label: 'Labs & Vitals' },
  { href: '/dashboard/visits', label: 'Visits' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground data-[active=true]:border-primary data-[active=true]:text-foreground"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
```

Note: This initial version does not highlight the active tab visually — that requires either a client component with `usePathname()` or Next.js's segment-based active detection. We'll revisit if the smoke test shows it's needed for usability, but it's not required for the MVP to function.

- [ ] **Step 2: Build and commit**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm --filter @health-app/web build
git add apps/web/app/dashboard/layout.tsx
git commit -m "feat(web): add dashboard tab navigation layout"
```

---

## Phase C — Shared components

### Task 7: Domain cards (summary, conditions, medications, allergies, labs, encounters)

**Files:**
- Create: `apps/web/components/cards/summary-card.tsx`
- Create: `apps/web/components/cards/conditions-card.tsx`
- Create: `apps/web/components/cards/medications-card.tsx`
- Create: `apps/web/components/cards/allergies-card.tsx`
- Create: `apps/web/components/cards/labs-card.tsx`
- Create: `apps/web/components/cards/encounters-card.tsx`

All six cards are pure server components (stateless JSX). They each take a slice of the normalized payload and render a shadcn `Card`.

- [ ] **Step 1: `apps/web/components/cards/summary-card.tsx`**

```tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { NormalizedPatientPayload } from '@health-app/shared-types';

function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function SummaryCard({ payload }: { payload: NormalizedPatientPayload }) {
  const { patient, conditions, medications } = payload;
  const age = ageFromDob(patient.dateOfBirth);
  const activeConditions = conditions.filter((c) => c.clinicalStatus === 'active').length;
  const activeMeds = medications.filter((m) => m.status === 'active').length;

  return (
    <Card className="bg-gradient-to-br from-blue-900 to-purple-900 text-white">
      <CardHeader className="pb-2">
        <div className="text-xs uppercase tracking-wide text-white/70">Summary</div>
        <CardTitle className="text-2xl text-white">
          {patient.firstName} {patient.lastName}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-white/90">
        {age} yo · {patient.gender} · {activeConditions} active condition
        {activeConditions === 1 ? '' : 's'} · {activeMeds} active medication
        {activeMeds === 1 ? '' : 's'}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: `apps/web/components/cards/conditions-card.tsx`**

```tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ConditionRecord } from '@health-app/shared-types';

export function ConditionsCard({ conditions }: { conditions: ConditionRecord[] }) {
  if (conditions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conditions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No conditions recorded.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Conditions ({conditions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {conditions.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{c.display}</div>
              {c.onsetDate && (
                <div className="text-xs text-muted-foreground">
                  Onset: {c.onsetDate}
                </div>
              )}
            </div>
            <Badge variant={c.clinicalStatus === 'active' ? 'default' : 'secondary'}>
              {c.clinicalStatus}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: `apps/web/components/cards/medications-card.tsx`**

```tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MedicationRecord } from '@health-app/shared-types';

export function MedicationsCard({ medications }: { medications: MedicationRecord[] }) {
  if (medications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medications</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No medications recorded.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Medications ({medications.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {medications.map((m) => (
          <div key={m.id} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{m.display}</div>
              {m.dosage && (
                <div className="text-xs text-muted-foreground">{m.dosage}</div>
              )}
            </div>
            <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>
              {m.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: `apps/web/components/cards/allergies-card.tsx`**

```tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AllergyRecord } from '@health-app/shared-types';

function severityVariant(s: AllergyRecord['severity']): 'default' | 'secondary' | 'destructive' {
  if (s === 'severe') return 'destructive';
  if (s === 'moderate') return 'default';
  return 'secondary';
}

export function AllergiesCard({ allergies }: { allergies: AllergyRecord[] }) {
  if (allergies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allergies</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No allergies recorded.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Allergies ({allergies.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {allergies.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{a.substance}</div>
              {a.reaction && (
                <div className="text-xs text-muted-foreground">
                  Reaction: {a.reaction}
                </div>
              )}
            </div>
            {a.severity && (
              <Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: `apps/web/components/cards/labs-card.tsx`**

```tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ObservationRecord } from '@health-app/shared-types';

function interpretationVariant(
  i: ObservationRecord['interpretation'],
): 'default' | 'secondary' | 'destructive' {
  if (i === 'critical' || i === 'high' || i === 'low') return 'destructive';
  if (i === 'normal') return 'secondary';
  return 'default';
}

export function LabsCard({ observations }: { observations: ObservationRecord[] }) {
  const labs = observations.filter((o) => o.category === 'lab');
  const vitals = observations.filter((o) => o.category === 'vital-sign');

  if (labs.length === 0 && vitals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Labs &amp; Vitals</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No observations recorded.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Labs &amp; Vitals ({labs.length + vitals.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {labs.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Labs</div>
            {labs.map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-3">
                <div className="font-medium">{o.display}</div>
                <div className="flex items-center gap-2">
                  <span>
                    {o.value}
                    {o.unit ? ` ${o.unit}` : ''}
                  </span>
                  {o.interpretation && (
                    <Badge variant={interpretationVariant(o.interpretation)}>
                      {o.interpretation}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {vitals.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Vitals</div>
            {vitals.map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-3">
                <div className="font-medium">{o.display}</div>
                <span>
                  {o.value}
                  {o.unit ? ` ${o.unit}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: `apps/web/components/cards/encounters-card.tsx`**

```tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EncounterRecord } from '@health-app/shared-types';

export function EncountersCard({ encounters }: { encounters: EncounterRecord[] }) {
  if (encounters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visits</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No visits recorded.
        </CardContent>
      </Card>
    );
  }

  const sorted = [...encounters].sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visits ({encounters.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {sorted.map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{e.reason ?? 'Visit'}</div>
              <div className="text-xs text-muted-foreground">
                {e.startDate.slice(0, 10)}
                {e.providerName ? ` · ${e.providerName}` : ''}
              </div>
            </div>
            <Badge variant="secondary">{e.type}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 7: Build and commit**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm --filter @health-app/web build
git add apps/web/components/cards
git commit -m "feat(web): add all six domain card components"
```

---

### Task 8: Insights panel

**Files:**
- Create: `apps/web/components/insights-panel.tsx`

- [ ] **Step 1: Create `apps/web/components/insights-panel.tsx`**

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { InsightsResponse, InsightFlag } from '@health-app/shared-types';

function severityVariant(
  s: InsightFlag['severity'],
): 'default' | 'secondary' | 'destructive' {
  if (s === 'concern') return 'destructive';
  if (s === 'watch') return 'default';
  return 'secondary';
}

export function InsightsPanel({ insights }: { insights: InsightsResponse }) {
  const { flags, narration } = insights;

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-900 dark:text-amber-200">
          Insights {flags.length > 0 ? `(${flags.length})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {narration && (
          <p className="text-sm text-amber-900 dark:text-amber-100">{narration}</p>
        )}
        {flags.length > 0 && (
          <div className="space-y-2">
            {flags.map((f) => (
              <div
                key={f.id}
                className="flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-white p-2 text-sm dark:border-amber-900 dark:bg-background"
              >
                <div>
                  <div className="font-medium">
                    {f.metric ?? f.category}
                    {f.observedValue ? ` — ${f.observedValue}` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">{f.message}</div>
                </div>
                <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
              </div>
            ))}
          </div>
        )}
        {flags.length === 0 && !narration && (
          <p className="text-sm text-muted-foreground">
            Nothing flagged right now.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Build and commit**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm --filter @health-app/web build
git add apps/web/components/insights-panel.tsx
git commit -m "feat(web): add insights panel component"
```

---

### Task 9: Ask box (client component)

**Files:**
- Create: `apps/web/components/ask-box.tsx`

- [ ] **Step 1: Create `apps/web/components/ask-box.tsx`**

```tsx
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { askQuestion } from '@/lib/api-client';

interface Props {
  patientId: string;
}

export function AskBox({ patientId }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await askQuestion(patientId, question.trim());
      setAnswer(res.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-emerald-900 dark:text-emerald-200">
          Ask about your health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What should I ask my doctor about my LDL?"
            disabled={isLoading}
            aria-label="Question"
          />
          <Button type="submit" disabled={isLoading || !question.trim()}>
            {isLoading ? 'Asking…' : 'Ask'}
          </Button>
        </form>
        {answer && (
          <div className="rounded-md border border-emerald-200 bg-white p-3 text-sm dark:border-emerald-900 dark:bg-background">
            {answer}
          </div>
        )}
        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Build and commit**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm --filter @health-app/web build
git add apps/web/components/ask-box.tsx
git commit -m "feat(web): add ask-box client component"
```

---

## Phase D — Pages

### Task 10: Overview page

**Files:**
- Create: `apps/web/app/dashboard/page.tsx`

- [ ] **Step 1: Create `apps/web/app/dashboard/page.tsx`**

```tsx
import { getInsights, getPatient } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';
import { SummaryCard } from '@/components/cards/summary-card';
import { InsightsPanel } from '@/components/insights-panel';
import { ConditionsCard } from '@/components/cards/conditions-card';
import { MedicationsCard } from '@/components/cards/medications-card';
import { AllergiesCard } from '@/components/cards/allergies-card';
import { LabsCard } from '@/components/cards/labs-card';
import { EncountersCard } from '@/components/cards/encounters-card';
import { AskBox } from '@/components/ask-box';

export default async function DashboardPage() {
  const patientId = await getCurrentPatientId();
  const [payload, insights] = await Promise.all([
    getPatient(patientId),
    getInsights(patientId),
  ]);

  return (
    <div className="space-y-4">
      <SummaryCard payload={payload} />
      <InsightsPanel insights={insights} />
      <div className="grid gap-4 md:grid-cols-2">
        <ConditionsCard conditions={payload.conditions} />
        <MedicationsCard medications={payload.medications} />
        <AllergiesCard allergies={payload.allergies} />
        <LabsCard observations={payload.observations} />
      </div>
      <EncountersCard encounters={payload.encounters} />
      <AskBox patientId={patientId} />
    </div>
  );
}
```

- [ ] **Step 2: Build and commit**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm --filter @health-app/web build
git add apps/web/app/dashboard/page.tsx
git commit -m "feat(web): add overview dashboard page"
```

---

### Task 11: Conditions deep view

**Files:**
- Create: `apps/web/app/dashboard/conditions/page.tsx`

- [ ] **Step 1: Create `apps/web/app/dashboard/conditions/page.tsx`**

```tsx
import { getPatient } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';
import { ConditionsCard } from '@/components/cards/conditions-card';

export default async function ConditionsPage() {
  const patientId = await getCurrentPatientId();
  const payload = await getPatient(patientId);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Conditions</h2>
      <ConditionsCard conditions={payload.conditions} />
    </div>
  );
}
```

- [ ] **Step 2: Build and commit**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm --filter @health-app/web build
git add apps/web/app/dashboard/conditions/page.tsx
git commit -m "feat(web): add conditions deep view page"
```

---

### Task 12: Medications deep view (with allergies side panel)

**Files:**
- Create: `apps/web/app/dashboard/medications/page.tsx`

- [ ] **Step 1: Create `apps/web/app/dashboard/medications/page.tsx`**

```tsx
import { getPatient } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';
import { MedicationsCard } from '@/components/cards/medications-card';
import { AllergiesCard } from '@/components/cards/allergies-card';

export default async function MedicationsPage() {
  const patientId = await getCurrentPatientId();
  const payload = await getPatient(patientId);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Medications</h2>
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <MedicationsCard medications={payload.medications} />
        <AllergiesCard allergies={payload.allergies} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build and commit**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm --filter @health-app/web build
git add apps/web/app/dashboard/medications/page.tsx
git commit -m "feat(web): add medications deep view with allergies panel"
```

---

### Task 13: Labs deep view

**Files:**
- Create: `apps/web/app/dashboard/labs/page.tsx`

- [ ] **Step 1: Create `apps/web/app/dashboard/labs/page.tsx`**

```tsx
import { getPatient } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';
import { LabsCard } from '@/components/cards/labs-card';

export default async function LabsPage() {
  const patientId = await getCurrentPatientId();
  const payload = await getPatient(patientId);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Labs &amp; Vitals</h2>
      <LabsCard observations={payload.observations} />
    </div>
  );
}
```

- [ ] **Step 2: Build and commit**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm --filter @health-app/web build
git add apps/web/app/dashboard/labs/page.tsx
git commit -m "feat(web): add labs & vitals deep view page"
```

---

### Task 14: Visits deep view

**Files:**
- Create: `apps/web/app/dashboard/visits/page.tsx`

- [ ] **Step 1: Create `apps/web/app/dashboard/visits/page.tsx`**

```tsx
import { getPatient } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';
import { EncountersCard } from '@/components/cards/encounters-card';

export default async function VisitsPage() {
  const patientId = await getCurrentPatientId();
  const payload = await getPatient(patientId);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Visits</h2>
      <EncountersCard encounters={payload.encounters} />
    </div>
  );
}
```

- [ ] **Step 2: Build and commit**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm --filter @health-app/web build
git add apps/web/app/dashboard/visits/page.tsx
git commit -m "feat(web): add visits deep view page"
```

---

## Phase E — Integration and smoke test

### Task 15: Turborepo dev script runs web + api together

**Files:**
- Modify: `turbo.json` (already has `dev` task; verify it's set up for parallelism)
- Modify: root `package.json` (the `dev` script already delegates to turbo — no change needed if already present, but verify)
- Verify: `apps/api/package.json` already has a `dev` script (it does: `nest start --watch`)
- Verify: `apps/web/package.json` already has a `dev` script (we added `next dev -p 3001` in Task 1)

- [ ] **Step 1: Inspect `turbo.json`** — confirm the `dev` task exists

```bash
cat /Users/onuchukwu/Documents/Projects/health-app/turbo.json
```

Expected: a `tasks.dev` entry with `"cache": false` and `"persistent": true`. If present (it should be from the backend plan's Task 1), proceed.

- [ ] **Step 2: Verify root `package.json` has `"dev": "turbo dev"`**

```bash
cat /Users/onuchukwu/Documents/Projects/health-app/package.json | grep -A 2 '"scripts"'
```

Expected: `"dev": "turbo dev"` (or similar). If present, proceed.

- [ ] **Step 3: Start both apps in parallel from the repo root**

```bash
cd /Users/onuchukwu/Documents/Projects/health-app
pnpm dev
```

Expected: both the api (port 3000) and the web (port 3001) log "ready" / "running on" messages. Turbo runs them in parallel. Leave this command running in a background terminal for the next task.

If turbo's dev output is noisy, you can alternatively run them in two separate terminals:

Terminal A:
```bash
pnpm --filter @health-app/api dev
```

Terminal B:
```bash
pnpm --filter @health-app/web dev
```

- [ ] **Step 4: Verify both ports respond**

```bash
curl -s -o /dev/null -w "api: %{http_code}\n" http://localhost:3000/api/v1/dashboard/patients
curl -s -o /dev/null -w "web: %{http_code}\n" http://localhost:3001/dashboard
```

Expected: `api: 200`, `web: 200`.

- [ ] **Step 5: No commit needed unless you had to modify `turbo.json` or the root `package.json`.**

If you did modify them, commit:

```bash
git add turbo.json package.json
git commit -m "chore: wire turbo dev to run api and web in parallel"
```

Otherwise, skip the commit and proceed to Task 16.

---

### Task 16: End-to-end smoke test

**Files:** none modified

This task is purely verification — no code changes. It exercises the full stack from the frontend to the backend to confirm the dashboard works end-to-end for all three demo patients.

**Prerequisites:**
- Both apps must be running (from Task 15).
- The api's SQLite DB must be seeded. If you've rebuilt the DB schema or run e2e tests, re-seed with:
  ```bash
  pnpm --filter @health-app/api seed
  ```

- [ ] **Step 1: Confirm the api is running and seeded**

```bash
curl -s http://localhost:3000/api/v1/dashboard/patients | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const arr=j.data||j;console.log(arr.length,'patients:',arr.map(p=>p.firstName).join(', '));});"
```

Expected: `3 patients: Sarah, Carlos, Mia` (order may vary).

- [ ] **Step 2: Render the Overview page for the default (first) patient**

```bash
curl -s http://localhost:3001/dashboard | grep -o '<title>[^<]*</title>'
```

Expected: `<title>Health Dashboard</title>`.

- [ ] **Step 3: Inspect the rendered HTML to confirm patient data flows through**

```bash
curl -s http://localhost:3001/dashboard > /tmp/dashboard.html
grep -c 'Insights' /tmp/dashboard.html
grep -c 'Conditions' /tmp/dashboard.html
grep -c 'Medications' /tmp/dashboard.html
grep -c 'Allergies' /tmp/dashboard.html
grep -c 'Labs' /tmp/dashboard.html
```

Expected: each grep returns ≥ 1. If any return 0, the card is either missing or not receiving data — investigate.

- [ ] **Step 4: Open the browser and manually click through the full flow**

This is the only manual step in the plan. In a web browser:

1. Visit `http://localhost:3001`. It should redirect to `/dashboard`.
2. The header should show a patient name dropdown (e.g., "Sarah Chen ▾").
3. The Overview page should show:
   - A blue/purple gradient summary card
   - An amber Insights panel (possibly empty for Sarah, should show flags for Carlos)
   - Four cards in a grid: Conditions, Medications, Allergies, Labs & Vitals
   - An Encounters ("Visits") card below the grid
   - A green "Ask about your health" box at the bottom
4. Click the patient dropdown in the header, select "Carlos Rivera". The page should reload showing Carlos's data:
   - Summary: 56 yo · male · 3 active conditions · 3 active medications (age may differ based on current date)
   - Insights: at least 4 concern flags — LDL, A1C, Fasting glucose, Blood pressure
   - Conditions card: 3 conditions (Hypertension, Diabetes, Hyperlipidemia)
5. Click through each tab (Conditions, Medications, Labs & Vitals, Visits) and confirm data loads.
6. On the Overview tab, type "Should I worry about my LDL?" in the Ask box and submit. A stubbed response containing "Carlos" should appear below.
7. Switch to Mia Patel. Verify the page still renders (mostly empty states except for the labs card).

- [ ] **Step 5: Record results**

Report which of the 7 check points pass/fail. If all 7 pass, the dashboard MVP is complete.

- [ ] **Step 6: Stop the dev servers**

In the terminal running `pnpm dev`, Ctrl+C to stop. Or:

```bash
pkill -f 'next dev' 2>/dev/null
pkill -f 'nest start' 2>/dev/null
```

- [ ] **Step 7: Append a "plan complete" marker**

Append this to the bottom of this plan file:

```markdown

---

**Status:** Frontend plan complete. Dashboard MVP is end-to-end functional against the backend from `2026-04-10-health-dashboard-backend.md`.
```

- [ ] **Step 8: Commit the plan-complete marker**

```bash
git add docs/superpowers/plans/2026-04-11-health-dashboard-frontend.md
git commit -m "docs(plan): mark frontend plan complete"
```

---

## Out of scope for this plan

Tracked here so reviewers don't look for them:

- Active-tab highlighting in the dashboard nav (requires a client component with `usePathname()`) — noted in Task 6
- Loading skeletons (shadcn `Skeleton` primitive is installed in Task 2 but not wired up yet)
- The 3D body visualization (schema is ready, UI is a future plan)
- Unit / component tests (spec Section 12 explicitly defers these)
- Real authentication (demo switcher still fakes it)
- Multi-turn chat history (single-shot Q&A only)
- Live Particle API wiring (the `/refresh` endpoint currently re-normalizes the fixture — same plan will apply when swapped to live)
- Mobile responsive tuning (Tailwind defaults give a usable layout at laptop widths; mobile is v2)
- Error boundaries (`error.tsx` at each route segment) — deferred until a real error path exists to handle
- Dark mode toggle (shadcn's `slate` base supports dark mode, but we don't expose a toggle yet)
- SEO meta tags beyond the default `<title>`

---

**Status:** Frontend plan complete. Dashboard MVP is end-to-end functional against the backend from `2026-04-10-health-dashboard-backend.md`.
