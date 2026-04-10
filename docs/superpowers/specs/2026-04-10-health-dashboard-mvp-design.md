# Health Dashboard MVP — Design Spec

**Date:** 2026-04-10
**Status:** Draft for review
**Author:** brainstorming session (Claude + Onuchukwu)

## 1. Purpose

Turn the existing NestJS backend into a full-stack monorepo that renders a health dashboard for a user based on data fetched (for now: simulated as fetched) from external health data providers — starting with Particle Health. The dashboard displays normalized clinical data across six domains, auto-generates deterministic insights, and lets the user ask free-form questions about their own record.

The MVP's highest-leverage goal is to prove the **end-to-end data pipeline**: external provider → normalizer → DB → API → UI. Static fixtures stand in for live provider calls during MVP development, but every downstream layer (normalizer, DB schema, API, frontend) is exercised against real-shaped provider data. When we flip to live mode later, the only change is the fixture source.

This is **not** a clinical tool. No diagnosis. No treatment recommendations. No replacement for provider workflows.

## 2. Guardrails

- **No authentication** in the MVP. A demo-patient switcher in the header simulates "who's logged in."
- **No persisted chat history.** Single-shot Q&A only.
- **LLM output is constrained** to narrating structured flags produced by a deterministic rules engine. The LLM never invents findings.
- **LLM calls are stubbed** behind an interface for the MVP. Real provider (Anthropic) swaps in via environment variable later.
- **Clinical records are never mutated** to write back to providers.

## 3. Stack

| Layer | Choice |
| --- | --- |
| Monorepo tool | pnpm workspaces + Turborepo |
| Frontend framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Component kit | shadcn/ui |
| Backend framework | NestJS (existing) |
| ORM | TypeORM (existing) |
| Database | SQLite (dev) — Postgres swap is a config change |
| Language | TypeScript end-to-end |
| LLM (stubbed MVP) | Interface + templated stub; Anthropic impl for later |

## 4. Monorepo layout

```
health-app/
├── apps/
│   ├── web/                      # Next.js 14 dashboard
│   └── api/                      # NestJS backend (existing code migrates here)
├── packages/
│   ├── shared-types/             # TypeScript types shared by web + api
│   ├── fhir-normalizer/          # Pure: FHIR bundle → normalized records
│   └── insights-rules/           # Pure: normalized records → structured flags
├── fixtures/
│   └── particle/                 # Real-shaped FHIR bundle JSON files (seed data)
├── docs/
│   └── superpowers/specs/        # Design specs
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

**Rationale:**
- `fhir-normalizer` and `insights-rules` are extracted as pure TypeScript packages (no Nest DI, no DB coupling) so they can be unit-tested in isolation against fixtures and reused in future contexts (workers, CLIs, edge functions).
- `shared-types` is the contract between backend and frontend — a schema change in one place breaks compilation in both.
- No shared UI package in the MVP — only one frontend app. Extract later if a second consumer appears.

## 5. Data model

### 5.1 Shared types (`packages/shared-types`)

```ts
type AnatomyRef =
  | 'head' | 'brain' | 'eye-left' | 'eye-right' | 'ear-left' | 'ear-right'
  | 'mouth' | 'throat' | 'neck'
  | 'spine-cervical' | 'spine-thoracic' | 'spine-lumbar'
  | 'heart' | 'lungs' | 'liver' | 'stomach' | 'pancreas' | 'kidneys'
  | 'intestine-small' | 'intestine-large' | 'bladder'
  | 'shoulder-left' | 'shoulder-right' | 'elbow-left' | 'elbow-right'
  | 'wrist-left' | 'wrist-right' | 'hand-left' | 'hand-right'
  | 'hip-left' | 'hip-right' | 'knee-left' | 'knee-right'
  | 'ankle-left' | 'ankle-right' | 'foot-left' | 'foot-right'
  | 'skin' | 'systemic';

type ProviderSource = 'particle' | 'redox' | 'manual' | 'wearable';

interface ProvenanceFields {
  providerSource: ProviderSource;
  providerRecordId: string;
  fetchedAt: string;              // ISO 8601
  rawSnapshot?: unknown;          // optional — original FHIR resource for debugging
}
```

### 5.2 Entities (`apps/api`, TypeORM)

Every clinical record carries provenance fields and (where meaningful) an `anatomyRef`.

1. **`Patient`** — extends the existing entity.
   - Existing: `id, firstName, lastName, dateOfBirth, gender, email, phoneNumber, isActive, createdAt, updatedAt`
   - New: `externalIds: { particle?: string; redox?: string }` (JSON column)

2. **`Condition`** — problem list.
   - `id, patientId, code, display, clinicalStatus ('active' | 'resolved' | 'inactive'), onsetDate, recordedDate, anatomyRef` + provenance.

3. **`Medication`**.
   - `id, patientId, code (RxNorm), display, dosage, frequency, status ('active' | 'completed' | 'stopped'), startDate, endDate` + provenance.

4. **`Allergy`**.
   - `id, patientId, substance, reaction, severity ('mild' | 'moderate' | 'severe'), recordedDate` + provenance.

5. **`Observation`** — labs + vitals unified.
   - `id, patientId, category ('lab' | 'vital-sign'), code (LOINC), display, value, unit, referenceRangeLow, referenceRangeHigh, interpretation ('normal' | 'low' | 'high' | 'critical'), effectiveDate, anatomyRef` + provenance.

6. **`Encounter`** — visit history.
   - `id, patientId, type ('ambulatory' | 'emergency' | 'inpatient' | 'virtual'), reason, providerName, startDate, endDate` + provenance.

### 5.3 What is **not** persisted

- **Insights** are regenerated on each request (deterministic function of the current record + rules engine).
- **Chat history** — single-shot Q&A, no persistence.

### 5.4 Why this shape is forward-compatible

- **3D body view (future):** `SELECT * FROM conditions WHERE patientId = ? AND anatomyRef = 'heart'`. No migration needed.
- **Cross-provider deduplication (future):** `(providerSource, providerRecordId)` is the idempotency key.
- **Diff over time (future):** `fetchedAt` + `rawSnapshot` replay history.

## 6. Normalizer (`packages/fhir-normalizer`)

Pure TypeScript package. Zero dependencies on Nest, TypeORM, or Express.

**Entry point:**
```ts
normalizeBundle(
  bundle: FhirBundle,
  opts: { source: ProviderSource; fetchedAt: string }
): NormalizedPatientPayload

interface NormalizedPatientPayload {
  patient: PatientRecord;
  conditions: ConditionRecord[];
  medications: MedicationRecord[];
  allergies: AllergyRecord[];
  observations: ObservationRecord[];
  encounters: EncounterRecord[];
  warnings: string[];        // unmapped fields, unknown codes — never throws
}
```

**Structure:**
```
packages/fhir-normalizer/
├── src/
│   ├── index.ts                  # normalizeBundle entry
│   ├── mappers/
│   │   ├── patient.ts
│   │   ├── condition.ts          # includes FHIR bodySite → anatomyRef mapping
│   │   ├── medication.ts
│   │   ├── allergy.ts
│   │   ├── observation.ts        # routes to lab or vital-sign via category
│   │   └── encounter.ts
│   ├── anatomy/
│   │   └── body-site-map.ts      # FHIR SNOMED bodySite codes → AnatomyRef enum
│   └── types.ts
└── test/
    └── fixtures/                 # anonymized real-shaped Particle bundles
```

Each mapper is trivially unit-testable — bundle in, object out. Unknown codes produce warnings rather than exceptions so a single bad resource doesn't break a whole bundle.

## 7. Seeding

On startup (dev mode) and via `pnpm seed`:

```
fixtures/particle/patient-sarah.json   ──┐
fixtures/particle/patient-carlos.json  ──┼──→  normalizeBundle()  ──→  TypeORM insert  ──→  SQLite
fixtures/particle/patient-mia.json     ──┘
```

Three demo patients:
- **Sarah Chen, 28** — healthy, minimal record.
- **Carlos Rivera, 55** — multiple chronic conditions (hypertension, type 2 diabetes, hyperlipidemia), several active medications, labs that trigger rules.
- **Mia Patel, 9** — pediatric case; immunizations, growth, minimal meds.

Seed is idempotent: re-running clears tables and re-seeds. Fast iteration during development.

## 8. Insights rules engine (`packages/insights-rules`)

Pure TypeScript package. Same isolation as the normalizer.

**Entry point:**
```ts
generateFlags(patient: NormalizedPatientPayload): InsightFlag[]

interface InsightFlag {
  id: string;                           // stable hash — UI key
  severity: 'info' | 'watch' | 'concern';
  category: 'lab' | 'vital' | 'medication' | 'gap';
  metric?: string;                      // e.g., 'LDL'
  observedValue?: string;               // e.g., '148 mg/dL'
  message: string;                      // short, structured — NOT narrative
  anatomyRef?: AnatomyRef;
}
```

**MVP rule set:**
- **Vitals:** BP stages (normal/elevated/stage 1/stage 2), resting HR extremes.
- **Labs:** LDL / HDL / total cholesterol vs target ranges, glucose/A1C ranges, any lab already flagged `high`/`low`/`critical` by its own reference range.
- **Medication gaps:** `status='stopped'` without a recorded reason.
- **Preventive gaps:** no lipid panel in 12+ months → `gap` flag.
- **Allergy contradictions:** active medication whose substance matches a recorded allergy → `concern` flag.

**Structure:** one rule per file in `packages/insights-rules/src/rules/`. Each exports `(payload: NormalizedPatientPayload) => InsightFlag | null`. `generateFlags` runs all rules and filters nulls. Adding a new rule is one new file, zero plumbing.

## 9. LLM service (`apps/api`)

```ts
interface LlmService {
  narrateInsights(
    patient: NormalizedPatientPayload,
    flags: InsightFlag[]
  ): Promise<string>;

  answerQuestion(
    patient: NormalizedPatientPayload,
    question: string
  ): Promise<string>;
}
```

**Implementations:**
- **`StubLlmService`** (default, `LLM_PROVIDER=stub`) — templated responses. No API key. Good enough for UI development and demos.
- **`AnthropicLlmService`** (`LLM_PROVIDER=anthropic`) — real Claude call. System prompt is constrained to narrate the flags it is given. Never diagnose. Never prescribe. Never invent findings.

**Guardrails:**
- Both methods receive the **already-normalized** patient payload and (for narration) the **already-generated** flags — never raw FHIR, never unfiltered user input.
- LLM calls are wrapped with a timeout and a fallback: if the real provider fails, fall back to the stub so the dashboard never breaks on an outage.

## 10. API surface (`apps/api`)

REST endpoints, Swagger auto-generated (`@nestjs/swagger` already wired up):

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/api/patients` | `PatientSummary[]` — for the switcher |
| `GET` | `/api/patients/:id` | `NormalizedPatientPayload` |
| `GET` | `/api/patients/:id/insights` | `{ flags: InsightFlag[], narration: string }` |
| `POST` | `/api/patients/:id/ask` | Body `{ question: string }` → `{ answer: string }` |
| `POST` | `/api/patients/:id/refresh` | Re-runs normalizer against fixture (or live provider later) |

All responses use `shared-types` shapes. Existing Particle / Redox / wearables controllers stay in place — they become the data sources behind `/refresh` when live mode is enabled.

## 11. Frontend (`apps/web`)

### 11.1 Routes (Next.js App Router)

```
/                              → redirect to /dashboard
/dashboard                     → Overview tab (default)
/dashboard/conditions          → Conditions deep view
/dashboard/medications         → Medications deep view (with Allergies panel)
/dashboard/labs                → Labs & Vitals deep view
/dashboard/visits              → Encounters deep view
```

### 11.2 Layout decision

**Tabbed layout.** The Overview tab is a tight at-a-glance view (summary card, insights panel, Allergies card, small counters per domain, Ask-about-your-health box). Each other tab is the deep view for that domain. Balances demo-worthiness with drill-down depth.

**Allergies placement.** Allergies do not get their own tab — they are a short list for most patients, and their most important role is contextual (they interact with the medication rules). Allergies are rendered as a dedicated card on the Overview tab, and also shown as a side panel on the Medications tab so the user sees medication and allergy information together.

### 11.3 Patient switcher

- Lives in the persistent header across all pages.
- Reads a `demo-patient-id` cookie (defaults to the first seeded patient).
- On switch: sets the cookie and revalidates the current route.
- Server-side read means the switcher works without client JS on initial load.

### 11.4 Server vs client components

- **Server components** by default. Dashboard pages fetch from `/api/patients/:id*` on the server — no CORS, no client fetch boilerplate, fast initial paint.
- **Client components** only where needed:
  - `ask-box.tsx` — interactive input, POSTs to `/api/patients/:id/ask`.
  - `patient-switcher.tsx` — dropdown interaction.

### 11.5 Structure

```
apps/web/
├── app/
│   ├── layout.tsx                    # header + patient switcher
│   ├── dashboard/
│   │   ├── layout.tsx                # tab nav
│   │   ├── page.tsx                  # Overview
│   │   ├── conditions/page.tsx
│   │   ├── medications/page.tsx
│   │   ├── labs/page.tsx
│   │   └── visits/page.tsx
│   └── globals.css
├── components/
│   ├── ui/                           # shadcn-generated components
│   ├── patient-switcher.tsx
│   ├── insights-panel.tsx
│   ├── ask-box.tsx                   # client component
│   └── cards/
│       ├── summary-card.tsx
│       ├── conditions-card.tsx
│       ├── medications-card.tsx
│       ├── allergies-card.tsx
│       ├── labs-card.tsx
│       └── encounters-card.tsx
├── lib/
│   └── api-client.ts                 # typed fetchers — imports shared-types
├── tailwind.config.ts
└── next.config.js
```

The `api-client.ts` module is the seam between frontend and backend. Because both sides depend on `shared-types`, a schema change breaks compilation on both sides simultaneously.

## 12. Testing

| Package | Strategy |
| --- | --- |
| `packages/fhir-normalizer` | Unit test per mapper against FHIR fixtures. Highest-value surface. |
| `packages/insights-rules` | Unit test per rule. Given a payload, assert expected flag. |
| `apps/api` | One e2e test per endpoint via Nest testing utilities + in-memory SQLite. No DB mocks — seed flow runs for real. |
| `apps/web` | **No tests in MVP.** Surface is small and changing rapidly. Add once UI stabilizes. |

## 13. Error handling

- **Normalizer:** collects warnings instead of throwing. One unmappable resource never breaks a bundle.
- **API:** typed error responses `{ error: string, code: string }`. The frontend `api-client` surfaces them as typed thrown errors.
- **LLM:** timeout + fallback to `StubLlmService` if the real provider fails. Dashboard never breaks on an LLM outage.
- **Missing data on the UI:** empty-state cards, not errors. "No conditions recorded" rather than a red banner.

## 14. Out of scope (MVP)

- Real authentication (demo switcher fakes it)
- Multi-turn chat / persisted chat history
- 3D body visualization (schema is ready; UI is v2)
- Live Particle API calls at runtime (fixtures seed the DB; config swap later)
- Writing data back to providers
- Clinician-facing views
- Real LLM provider calls (stubbed behind interface)
- Postgres (SQLite for dev)
- Cross-provider record deduplication (schema supports it; merging logic is later)
- Unit/integration tests for the web app

## 15. Migration notes for the existing backend

The current `/src/*` moves into `apps/api/src/*`. Existing modules (`particle`, `patients`, `redox`, `wearables`, `common`, `database`) remain intact. The existing `Patient` entity gains one new column (`externalIds`). New modules are added for `Condition`, `Medication`, `Allergy`, `Observation`, `Encounter`, `Insights`, and `Llm`. Nothing already working gets broken.

## 16. Definition of done (MVP)

- [ ] Monorepo scaffolded (pnpm + Turborepo); existing backend moved into `apps/api`; builds and runs.
- [ ] `packages/shared-types` published with all normalized record types + `AnatomyRef` + `InsightFlag`.
- [ ] `packages/fhir-normalizer` with mappers for all six domains + unit tests against fixtures.
- [ ] `packages/insights-rules` with the MVP rule set + unit tests per rule.
- [ ] Three demo patient fixtures in `fixtures/particle/` representing sparse / dense / pediatric profiles.
- [ ] TypeORM entities for the six domains; seed command wired up and idempotent.
- [ ] Five REST endpoints implemented with Swagger docs and e2e tests.
- [ ] `StubLlmService` returns templated narrations and Q&A responses.
- [ ] Next.js app with tabbed dashboard, patient switcher, summary / conditions / medications / allergies / labs / encounters cards, insights panel, Ask box.
- [ ] `turbo dev` starts both apps together; `turbo build` produces deployable artifacts.
