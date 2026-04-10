# Health Dashboard Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing NestJS backend into a pnpm + Turborepo monorepo and implement the full ingest → normalize → DB → API pipeline with FHIR fixtures, deterministic insights rules, and a stubbed LLM service.

**Architecture:** Two pure TypeScript packages (`fhir-normalizer`, `insights-rules`) hold the clinical logic with no Nest coupling. A `shared-types` package holds the contract between web and api. The API seeds its SQLite DB from real-shaped FHIR fixture bundles by running the normalizer, so every downstream layer is exercised against production-shaped data. The LLM service is behind an interface with a templated stub implementation.

**Tech Stack:** pnpm workspaces, Turborepo, TypeScript 5.9, NestJS 11, TypeORM 0.3, SQLite, Jest (apps/api), Vitest (pure packages), class-validator/class-transformer.

**Scope:** Backend only. Frontend dashboard ships in a follow-up plan (`2026-04-10-health-dashboard-frontend.md`) after this plan's API is green.

**Reference spec:** `docs/superpowers/specs/2026-04-10-health-dashboard-mvp-design.md`

**API path prefix:** The existing backend uses `setGlobalPrefix('api/v1')`. All API paths in this plan are written without the prefix for brevity but actually resolve under `/api/v1/...`.

---

## File Structure

```
health-app/                                    # repo root (becomes monorepo root)
├── package.json                               # root workspace orchestrator
├── pnpm-workspace.yaml                        # workspace glob config
├── turbo.json                                 # Turborepo pipeline config
├── tsconfig.base.json                         # shared TS compiler options
├── apps/
│   └── api/                                   # moved from root ./src
│       ├── package.json
│       ├── tsconfig.json                      # extends tsconfig.base.json
│       ├── nest-cli.json
│       ├── jest.config.js
│       ├── src/
│       │   ├── app.module.ts                  # (migrated)
│       │   ├── main.ts                        # (migrated)
│       │   ├── database/                      # (migrated)
│       │   ├── common/                        # (migrated)
│       │   ├── particle/                      # (migrated, unchanged)
│       │   ├── redox/                         # (migrated, unchanged)
│       │   ├── wearables/                     # (migrated, unchanged)
│       │   ├── patients/
│       │   │   ├── entities/
│       │   │   │   └── patient.entity.ts      # (migrated, + externalIds column)
│       │   │   └── ...                        # (migrated)
│       │   ├── clinical/                      # NEW
│       │   │   ├── entities/
│       │   │   │   ├── condition.entity.ts
│       │   │   │   ├── medication.entity.ts
│       │   │   │   ├── allergy.entity.ts
│       │   │   │   ├── observation.entity.ts
│       │   │   │   └── encounter.entity.ts
│       │   │   └── clinical.module.ts
│       │   ├── seed/                          # NEW
│       │   │   ├── seed.module.ts
│       │   │   ├── seed.service.ts
│       │   │   └── seed.cli.ts                # pnpm seed entrypoint
│       │   ├── llm/                           # NEW
│       │   │   ├── llm.module.ts
│       │   │   ├── llm.service.ts             # interface + factory
│       │   │   └── stub-llm.service.ts
│       │   ├── dashboard/                     # NEW
│       │   │   ├── dashboard.module.ts
│       │   │   ├── dashboard.controller.ts    # GET patients, GET :id, POST :id/refresh
│       │   │   ├── dashboard.service.ts
│       │   │   ├── insights.controller.ts     # GET :id/insights, POST :id/ask
│       │   │   └── insights.service.ts
│       │   └── ...
│       └── test/
│           └── dashboard.e2e-spec.ts
├── packages/
│   ├── shared-types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── anatomy.ts                     # AnatomyRef union
│   │       ├── provenance.ts                  # ProvenanceFields, ProviderSource
│   │       ├── patient.ts                     # PatientRecord, PatientSummary
│   │       ├── condition.ts                   # ConditionRecord
│   │       ├── medication.ts                  # MedicationRecord
│   │       ├── allergy.ts                     # AllergyRecord
│   │       ├── observation.ts                 # ObservationRecord
│   │       ├── encounter.ts                   # EncounterRecord
│   │       ├── payload.ts                     # NormalizedPatientPayload
│   │       └── insights.ts                    # InsightFlag
│   ├── fhir-normalizer/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── src/
│   │   │   ├── index.ts                       # normalizeBundle entry
│   │   │   ├── fhir-types.ts                  # minimal FHIR type shims
│   │   │   ├── anatomy/
│   │   │   │   └── body-site-map.ts
│   │   │   └── mappers/
│   │   │       ├── patient.ts
│   │   │       ├── condition.ts
│   │   │       ├── medication.ts
│   │   │       ├── allergy.ts
│   │   │       ├── observation.ts
│   │   │       └── encounter.ts
│   │   └── test/
│   │       ├── mappers/
│   │       │   ├── patient.test.ts
│   │       │   ├── condition.test.ts
│   │       │   ├── medication.test.ts
│   │       │   ├── allergy.test.ts
│   │       │   ├── observation.test.ts
│   │       │   └── encounter.test.ts
│   │       └── normalize-bundle.test.ts
│   └── insights-rules/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       ├── src/
│       │   ├── index.ts                       # generateFlags entry
│       │   └── rules/
│       │       ├── blood-pressure.ts
│       │       ├── lipids.ts
│       │       ├── glucose.ts
│       │       ├── preventive-lipid-gap.ts
│       │       └── allergy-medication.ts
│       └── test/
│           └── rules/
│               ├── blood-pressure.test.ts
│               ├── lipids.test.ts
│               ├── glucose.test.ts
│               ├── preventive-lipid-gap.test.ts
│               └── allergy-medication.test.ts
└── fixtures/
    └── particle/
        ├── patient-sarah.json                 # healthy 28yo
        ├── patient-carlos.json                # 55yo, multiple conditions
        └── patient-mia.json                   # pediatric
```

---

## Phase A — Monorepo scaffold

### Task 1: Initialize pnpm workspace + Turborepo at root

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Modify: `package.json` (root becomes workspace orchestrator)
- Modify: `.gitignore`

- [ ] **Step 1: Verify pnpm is installed**

Run: `pnpm --version`
Expected: any version ≥ 8. If missing: `npm install -g pnpm`.

- [ ] **Step 2: Create `pnpm-workspace.yaml` at repo root**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Create `turbo.json` at repo root**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "seed": {
      "cache": false,
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json` at repo root**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "moduleResolution": "node",
    "declaration": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 5: Replace `package.json` with workspace root**

```json
{
  "name": "health-app",
  "version": "1.0.0",
  "private": true,
  "description": "Health app monorepo",
  "author": "Onuchukwu Adebayo <adebayop.o@gmail.com>",
  "license": "MIT",
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint",
    "seed": "turbo run seed --filter=@health-app/api"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.9.3"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 6: Add `.turbo/` to `.gitignore`**

Add this line to `.gitignore` (keep the existing contents):

```
.turbo/
```

- [ ] **Step 7: Commit**

```bash
git add pnpm-workspace.yaml turbo.json tsconfig.base.json package.json .gitignore
git commit -m "chore: initialize pnpm + turborepo workspace"
```

---

### Task 2: Move existing NestJS backend into `apps/api`

**Files:**
- Move: all of `src/` → `apps/api/src/`
- Move: `nest-cli.json` → `apps/api/nest-cli.json`
- Move: `tsconfig.json` → `apps/api/tsconfig.json`
- Move: `health-app.db` → `apps/api/health-app.db`
- Move: `.env` → `apps/api/.env`
- Move: `private key.pem`, `public key.pem`, `private keyjwk.json`, `public keyjwk.json` → `apps/api/`
- Create: `apps/api/package.json`

- [ ] **Step 1: Create `apps/api/` directory**

```bash
mkdir -p apps/api
```

- [ ] **Step 2: Move the existing backend files into `apps/api/`**

```bash
git mv src apps/api/src
git mv nest-cli.json apps/api/nest-cli.json
git mv tsconfig.json apps/api/tsconfig.json
git mv health-app.db apps/api/health-app.db
git mv .env apps/api/.env
git mv "private key.pem" apps/api/private-key.pem
git mv "public key.pem" apps/api/public-key.pem
git mv "private keyjwk.json" apps/api/private-keyjwk.json
git mv "public keyjwk.json" apps/api/public-keyjwk.json
```

Note: key filenames are renamed to remove spaces. If any module in `src/` references these keys by old filename, those references are updated in Step 4.

- [ ] **Step 3: Create `apps/api/package.json`**

```json
{
  "name": "@health-app/api",
  "version": "1.0.0",
  "private": true,
  "main": "dist/main.js",
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main.js",
    "start:prod": "node dist/main.js",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.config.js",
    "seed": "ts-node src/seed/seed.cli.ts"
  },
  "dependencies": {
    "@health-app/shared-types": "workspace:*",
    "@health-app/fhir-normalizer": "workspace:*",
    "@health-app/insights-rules": "workspace:*",
    "@nestjs/axios": "^4.0.1",
    "@nestjs/common": "^11.1.13",
    "@nestjs/config": "^4.0.3",
    "@nestjs/core": "^11.1.13",
    "@nestjs/mapped-types": "^2.1.0",
    "@nestjs/platform-express": "^11.1.13",
    "@nestjs/swagger": "^11.2.6",
    "@nestjs/typeorm": "^11.0.0",
    "axios": "^1.13.4",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.3",
    "jose": "^6.1.3",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2",
    "sqlite3": "^5.1.7",
    "typeorm": "^0.3.28"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.16",
    "@nestjs/schematics": "^11.0.9",
    "@nestjs/testing": "^11.1.13",
    "@types/express": "^5.0.6",
    "@types/jest": "^29.5.12",
    "@types/node": "^25.2.1",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 4: Update `apps/api/tsconfig.json` to extend the base and scope to its own dist**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./",
    "sourceMap": true,
    "removeComments": true,
    "incremental": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 5: Grep for any stale references to the old key filenames and fix them**

Use the Grep tool to search for `private key.pem` and `public key.pem` in `apps/api/src/`. If found, update those references to `private-key.pem` and `public-key.pem` respectively. If nothing is found, skip.

- [ ] **Step 6: Delete the stale root-level node_modules and dist**

```bash
rm -rf node_modules dist package-lock.json
```

- [ ] **Step 7: Commit**

```bash
git add apps/api package.json
git commit -m "chore: move nestjs backend into apps/api"
```

---

### Task 3: Install dependencies and verify the migrated backend builds and runs

**Files:** none modified

- [ ] **Step 1: Install from the repo root**

```bash
pnpm install
```

Expected: installs deps for the root and `apps/api`. Packages under `packages/*` don't exist yet — pnpm simply doesn't find them, which is fine.

- [ ] **Step 2: Build the api**

```bash
pnpm --filter @health-app/api build
```

Expected: a clean build writing to `apps/api/dist/`.

- [ ] **Step 3: Start the api in dev mode**

```bash
pnpm --filter @health-app/api dev
```

Expected: logs `Application is running on: http://localhost:3000`. Ctrl+C to stop.

- [ ] **Step 4: Sanity-check with curl in a second terminal**

```bash
curl http://localhost:3000/api/v1/patients
```

Expected: a JSON response (array, possibly empty). Non-200 means something in the migration broke — fix before proceeding.

- [ ] **Step 5: Commit the lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "chore: add pnpm lockfile"
```

---

## Phase B — Shared types package

### Task 4: Create `packages/shared-types` with all normalized types

**Files:**
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/tsconfig.json`
- Create: `packages/shared-types/src/index.ts`
- Create: `packages/shared-types/src/anatomy.ts`
- Create: `packages/shared-types/src/provenance.ts`
- Create: `packages/shared-types/src/patient.ts`
- Create: `packages/shared-types/src/condition.ts`
- Create: `packages/shared-types/src/medication.ts`
- Create: `packages/shared-types/src/allergy.ts`
- Create: `packages/shared-types/src/observation.ts`
- Create: `packages/shared-types/src/encounter.ts`
- Create: `packages/shared-types/src/payload.ts`
- Create: `packages/shared-types/src/insights.ts`

- [ ] **Step 1: Create `packages/shared-types/package.json`**

```json
{
  "name": "@health-app/shared-types",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Create `packages/shared-types/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `packages/shared-types/src/anatomy.ts`**

```ts
export type AnatomyRef =
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
```

- [ ] **Step 4: Create `packages/shared-types/src/provenance.ts`**

```ts
export type ProviderSource = 'particle' | 'redox' | 'manual' | 'wearable';

export interface ProvenanceFields {
  providerSource: ProviderSource;
  providerRecordId: string;
  fetchedAt: string;           // ISO 8601 timestamp
  rawSnapshot?: unknown;
}
```

- [ ] **Step 5: Create `packages/shared-types/src/patient.ts`**

```ts
export type Gender = 'male' | 'female' | 'other' | 'unknown';

export interface ExternalIds {
  particle?: string;
  redox?: string;
}

export interface PatientRecord {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;         // ISO date (YYYY-MM-DD)
  gender: Gender;
  email?: string;
  phoneNumber?: string;
  externalIds: ExternalIds;
}

export interface PatientSummary {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
}
```

- [ ] **Step 6: Create `packages/shared-types/src/condition.ts`**

```ts
import { AnatomyRef } from './anatomy';
import { ProvenanceFields } from './provenance';

export type ConditionClinicalStatus = 'active' | 'resolved' | 'inactive';

export interface ConditionRecord extends ProvenanceFields {
  id: string;
  patientId: string;
  code: string;                // SNOMED / ICD-10
  codeSystem: string;          // e.g. "http://snomed.info/sct"
  display: string;
  clinicalStatus: ConditionClinicalStatus;
  onsetDate?: string;
  recordedDate: string;
  anatomyRef?: AnatomyRef;
}
```

- [ ] **Step 7: Create `packages/shared-types/src/medication.ts`**

```ts
import { ProvenanceFields } from './provenance';

export type MedicationStatus = 'active' | 'completed' | 'stopped';

export interface MedicationRecord extends ProvenanceFields {
  id: string;
  patientId: string;
  code: string;                // RxNorm
  codeSystem: string;
  display: string;
  dosage?: string;
  frequency?: string;
  status: MedicationStatus;
  startDate?: string;
  endDate?: string;
}
```

- [ ] **Step 8: Create `packages/shared-types/src/allergy.ts`**

```ts
import { ProvenanceFields } from './provenance';

export type AllergySeverity = 'mild' | 'moderate' | 'severe';

export interface AllergyRecord extends ProvenanceFields {
  id: string;
  patientId: string;
  substance: string;
  reaction?: string;
  severity: AllergySeverity;
  recordedDate: string;
}
```

- [ ] **Step 9: Create `packages/shared-types/src/observation.ts`**

```ts
import { AnatomyRef } from './anatomy';
import { ProvenanceFields } from './provenance';

export type ObservationCategory = 'lab' | 'vital-sign';
export type ObservationInterpretation = 'normal' | 'low' | 'high' | 'critical';

export interface ObservationRecord extends ProvenanceFields {
  id: string;
  patientId: string;
  category: ObservationCategory;
  code: string;                // LOINC
  codeSystem: string;
  display: string;
  value: string;               // string so we can represent "138/86" as one value when needed
  unit?: string;
  referenceRangeLow?: number;
  referenceRangeHigh?: number;
  interpretation?: ObservationInterpretation;
  effectiveDate: string;
  anatomyRef?: AnatomyRef;
}
```

- [ ] **Step 10: Create `packages/shared-types/src/encounter.ts`**

```ts
import { ProvenanceFields } from './provenance';

export type EncounterType = 'ambulatory' | 'emergency' | 'inpatient' | 'virtual';

export interface EncounterRecord extends ProvenanceFields {
  id: string;
  patientId: string;
  type: EncounterType;
  reason?: string;
  providerName?: string;
  startDate: string;
  endDate?: string;
}
```

- [ ] **Step 11: Create `packages/shared-types/src/payload.ts`**

```ts
import { AllergyRecord } from './allergy';
import { ConditionRecord } from './condition';
import { EncounterRecord } from './encounter';
import { MedicationRecord } from './medication';
import { ObservationRecord } from './observation';
import { PatientRecord } from './patient';

export interface NormalizedPatientPayload {
  patient: PatientRecord;
  conditions: ConditionRecord[];
  medications: MedicationRecord[];
  allergies: AllergyRecord[];
  observations: ObservationRecord[];
  encounters: EncounterRecord[];
  warnings: string[];
}
```

- [ ] **Step 12: Create `packages/shared-types/src/insights.ts`**

```ts
import { AnatomyRef } from './anatomy';

export type InsightSeverity = 'info' | 'watch' | 'concern';
export type InsightCategory = 'lab' | 'vital' | 'medication' | 'gap';

export interface InsightFlag {
  id: string;                  // stable hash — UI key
  severity: InsightSeverity;
  category: InsightCategory;
  metric?: string;
  observedValue?: string;
  message: string;             // short, structured — NOT narrative
  anatomyRef?: AnatomyRef;
}

export interface InsightsResponse {
  flags: InsightFlag[];
  narration: string;
}
```

- [ ] **Step 13: Create `packages/shared-types/src/index.ts` — barrel file**

```ts
export * from './anatomy';
export * from './provenance';
export * from './patient';
export * from './condition';
export * from './medication';
export * from './allergy';
export * from './observation';
export * from './encounter';
export * from './payload';
export * from './insights';
```

- [ ] **Step 14: Install and build**

```bash
pnpm install
pnpm --filter @health-app/shared-types build
```

Expected: `packages/shared-types/dist/` exists with `.js` and `.d.ts` files.

- [ ] **Step 15: Commit**

```bash
git add packages/shared-types pnpm-lock.yaml
git commit -m "feat(shared-types): add normalized record types"
```

---

## Phase C — FHIR normalizer package (TDD)

### Task 5: Scaffold `packages/fhir-normalizer`

**Files:**
- Create: `packages/fhir-normalizer/package.json`
- Create: `packages/fhir-normalizer/tsconfig.json`
- Create: `packages/fhir-normalizer/vitest.config.ts`
- Create: `packages/fhir-normalizer/src/index.ts`
- Create: `packages/fhir-normalizer/src/fhir-types.ts`
- Create: `packages/fhir-normalizer/src/anatomy/body-site-map.ts`

- [ ] **Step 1: Create `packages/fhir-normalizer/package.json`**

```json
{
  "name": "@health-app/fhir-normalizer",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@health-app/shared-types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/fhir-normalizer/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Create `packages/fhir-normalizer/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globals: false,
  },
});
```

- [ ] **Step 4: Create `packages/fhir-normalizer/src/fhir-types.ts` — minimal FHIR type shims**

```ts
// Minimal FHIR R4 type shims. We only declare the fields we read.
// Full FHIR types (e.g. @types/fhir) are huge and noisy; a narrow shim is clearer.

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirReference {
  reference?: string;
  display?: string;
}

export interface FhirQuantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirRange {
  low?: FhirQuantity;
  high?: FhirQuantity;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirPatient {
  resourceType: 'Patient';
  id?: string;
  name?: Array<{ given?: string[]; family?: string }>;
  birthDate?: string;
  gender?: string;
  telecom?: Array<{ system?: string; value?: string }>;
}

export interface FhirCondition {
  resourceType: 'Condition';
  id?: string;
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  clinicalStatus?: FhirCodeableConcept;
  onsetDateTime?: string;
  recordedDate?: string;
  bodySite?: FhirCodeableConcept[];
}

export interface FhirMedicationStatement {
  resourceType: 'MedicationStatement' | 'MedicationRequest';
  id?: string;
  status?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  subject?: FhirReference;
  effectivePeriod?: FhirPeriod;
  effectiveDateTime?: string;
  dosage?: Array<{
    text?: string;
    timing?: { code?: FhirCodeableConcept; repeat?: { frequency?: number; period?: number; periodUnit?: string } };
  }>;
}

export interface FhirAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id?: string;
  code?: FhirCodeableConcept;
  reaction?: Array<{
    manifestation?: FhirCodeableConcept[];
    severity?: 'mild' | 'moderate' | 'severe';
  }>;
  recordedDate?: string;
}

export interface FhirObservation {
  resourceType: 'Observation';
  id?: string;
  status?: string;
  category?: FhirCodeableConcept[];
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  effectiveDateTime?: string;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  component?: Array<{ code?: FhirCodeableConcept; valueQuantity?: FhirQuantity }>;
  referenceRange?: Array<FhirRange>;
  interpretation?: FhirCodeableConcept[];
  bodySite?: FhirCodeableConcept;
}

export interface FhirEncounter {
  resourceType: 'Encounter';
  id?: string;
  class?: FhirCoding;
  type?: FhirCodeableConcept[];
  reasonCode?: FhirCodeableConcept[];
  subject?: FhirReference;
  period?: FhirPeriod;
  participant?: Array<{ individual?: FhirReference }>;
}

export type FhirResource =
  | FhirPatient
  | FhirCondition
  | FhirMedicationStatement
  | FhirAllergyIntolerance
  | FhirObservation
  | FhirEncounter
  | { resourceType: string; id?: string; [k: string]: unknown };

export interface FhirBundleEntry {
  resource?: FhirResource;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type?: string;
  entry?: FhirBundleEntry[];
}
```

- [ ] **Step 5: Create `packages/fhir-normalizer/src/anatomy/body-site-map.ts`**

```ts
import { AnatomyRef } from '@health-app/shared-types';

// Map common SNOMED bodySite codes to our canonical AnatomyRef enum.
// This is intentionally small for MVP — extend as fixtures expose new codes.
const SNOMED_TO_ANATOMY: Record<string, AnatomyRef> = {
  '80891009': 'heart',           // Heart structure
  '39607008': 'lungs',            // Lung structure
  '10200004': 'liver',            // Liver structure
  '64033007': 'kidneys',          // Kidney structure
  '69536005': 'head',             // Head structure
  '12738006': 'brain',            // Brain structure
  '69695003': 'stomach',          // Stomach structure
  '181277001': 'knee-left',       // Left knee (example — actual SNOMED varies)
  '181278006': 'knee-right',      // Right knee (example)
  '122494005': 'spine-cervical',  // Cervical spine
  '122495006': 'spine-thoracic',  // Thoracic spine
  '122496007': 'spine-lumbar',    // Lumbar spine
};

// Display-text-based fallback for bundles that lack SNOMED codes.
const TEXT_TO_ANATOMY: Array<[RegExp, AnatomyRef]> = [
  [/\bheart\b/i, 'heart'],
  [/\blung/i, 'lungs'],
  [/\bliver\b/i, 'liver'],
  [/\bkidney/i, 'kidneys'],
  [/\bbrain\b/i, 'brain'],
  [/\bpancreas\b/i, 'pancreas'],
  [/\bleft knee\b/i, 'knee-left'],
  [/\bright knee\b/i, 'knee-right'],
  [/\bleft shoulder\b/i, 'shoulder-left'],
  [/\bright shoulder\b/i, 'shoulder-right'],
  [/\bcervical spine\b/i, 'spine-cervical'],
  [/\bthoracic spine\b/i, 'spine-thoracic'],
  [/\blumbar spine\b/i, 'spine-lumbar'],
  [/\bskin\b/i, 'skin'],
];

export function resolveAnatomyRef(
  bodySite: { coding?: Array<{ system?: string; code?: string; display?: string }>; text?: string } | undefined,
): AnatomyRef | undefined {
  if (!bodySite) return undefined;

  for (const coding of bodySite.coding ?? []) {
    if (coding.code && SNOMED_TO_ANATOMY[coding.code]) {
      return SNOMED_TO_ANATOMY[coding.code];
    }
  }

  const text = bodySite.text ?? bodySite.coding?.[0]?.display;
  if (text) {
    for (const [pattern, ref] of TEXT_TO_ANATOMY) {
      if (pattern.test(text)) return ref;
    }
  }

  return undefined;
}
```

- [ ] **Step 6: Create an empty `packages/fhir-normalizer/src/index.ts` placeholder (filled in Task 12)**

```ts
// Filled in Task 12 — normalizeBundle entry point.
export {};
```

- [ ] **Step 7: Install and build**

```bash
pnpm install
pnpm --filter @health-app/fhir-normalizer build
```

Expected: build succeeds. No source files yet = empty dist (fine).

- [ ] **Step 8: Commit**

```bash
git add packages/fhir-normalizer pnpm-lock.yaml
git commit -m "feat(fhir-normalizer): scaffold package with fhir type shims and anatomy map"
```

---

### Task 6: Create three anonymized Particle FHIR fixture bundles

**Files:**
- Create: `fixtures/particle/patient-sarah.json` (healthy 28yo)
- Create: `fixtures/particle/patient-carlos.json` (55yo chronic)
- Create: `fixtures/particle/patient-mia.json` (pediatric)

- [ ] **Step 1: Create `fixtures/particle/patient-sarah.json`**

Sarah Chen — healthy 28yo female. Minimal record: demographics, one lifetime condition (seasonal allergic rhinitis), no active meds, one allergy (penicillin), a recent lipid panel with normal values, normal BP, one ambulatory visit.

```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "particle-sarah-001",
        "name": [{ "given": ["Sarah"], "family": "Chen" }],
        "birthDate": "1997-06-12",
        "gender": "female",
        "telecom": [
          { "system": "email", "value": "sarah.chen@example.com" },
          { "system": "phone", "value": "+15551234567" }
        ]
      }
    },
    {
      "resource": {
        "resourceType": "Condition",
        "id": "particle-sarah-cond-1",
        "code": {
          "coding": [
            { "system": "http://snomed.info/sct", "code": "61582004", "display": "Allergic rhinitis" }
          ],
          "text": "Seasonal allergic rhinitis"
        },
        "subject": { "reference": "Patient/particle-sarah-001" },
        "clinicalStatus": { "coding": [{ "code": "active", "display": "Active" }] },
        "recordedDate": "2020-04-15",
        "onsetDateTime": "2015-05-01"
      }
    },
    {
      "resource": {
        "resourceType": "AllergyIntolerance",
        "id": "particle-sarah-allergy-1",
        "code": {
          "coding": [{ "system": "http://www.nlm.nih.gov/research/umls/rxnorm", "code": "7984", "display": "Penicillin G" }],
          "text": "Penicillin"
        },
        "recordedDate": "2018-09-02",
        "reaction": [
          {
            "manifestation": [{ "text": "Hives" }],
            "severity": "moderate"
          }
        ]
      }
    },
    {
      "resource": {
        "resourceType": "Observation",
        "id": "particle-sarah-obs-1",
        "status": "final",
        "category": [
          { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "laboratory" }] }
        ],
        "code": {
          "coding": [{ "system": "http://loinc.org", "code": "13457-7", "display": "LDL Cholesterol" }],
          "text": "LDL Cholesterol"
        },
        "subject": { "reference": "Patient/particle-sarah-001" },
        "effectiveDateTime": "2025-11-10",
        "valueQuantity": { "value": 92, "unit": "mg/dL", "system": "http://unitsofmeasure.org", "code": "mg/dL" },
        "referenceRange": [{ "low": { "value": 0 }, "high": { "value": 100 } }],
        "interpretation": [{ "coding": [{ "code": "N", "display": "Normal" }] }]
      }
    },
    {
      "resource": {
        "resourceType": "Observation",
        "id": "particle-sarah-obs-2",
        "status": "final",
        "category": [
          { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs" }] }
        ],
        "code": {
          "coding": [{ "system": "http://loinc.org", "code": "85354-9", "display": "Blood pressure panel" }],
          "text": "Blood pressure"
        },
        "subject": { "reference": "Patient/particle-sarah-001" },
        "effectiveDateTime": "2025-11-10",
        "component": [
          {
            "code": { "coding": [{ "code": "8480-6", "display": "Systolic" }] },
            "valueQuantity": { "value": 118, "unit": "mmHg" }
          },
          {
            "code": { "coding": [{ "code": "8462-4", "display": "Diastolic" }] },
            "valueQuantity": { "value": 76, "unit": "mmHg" }
          }
        ]
      }
    },
    {
      "resource": {
        "resourceType": "Encounter",
        "id": "particle-sarah-enc-1",
        "class": { "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "AMB", "display": "Ambulatory" },
        "type": [{ "text": "Annual physical exam" }],
        "reasonCode": [{ "text": "Annual wellness visit" }],
        "subject": { "reference": "Patient/particle-sarah-001" },
        "period": { "start": "2025-11-10T09:00:00Z", "end": "2025-11-10T09:45:00Z" },
        "participant": [{ "individual": { "display": "Dr. Anita Rao" } }]
      }
    }
  ]
}
```

- [ ] **Step 2: Create `fixtures/particle/patient-carlos.json`**

Carlos Rivera — 55yo male. Dense record: hypertension + type 2 diabetes + hyperlipidemia (all `active` Conditions with systemic/heart anatomyRef as appropriate), active medications (metformin 500mg BID, lisinopril 10mg daily, atorvastatin 20mg nightly), one allergy (sulfa), labs that should trip rules (LDL 148 mg/dL high, A1C 7.8% high, glucose 165 mg/dL high), recent BP 142/88 (stage 1), two encounters (annual physical + endocrinology follow-up).

Follow the Sarah fixture structure. Each Condition has a SNOMED code. Each Medication uses `MedicationStatement` with `medicationCodeableConcept` (RxNorm) and a `dosage[0].text` string ("500 mg twice daily"). Each Observation has proper `referenceRange` and `interpretation`. The hypertension Condition should have a bodySite mapping to `heart`; diabetes and hyperlipidemia use `systemic`.

Use the following IDs: `particle-carlos-001` patient, `particle-carlos-cond-1` (hypertension), `particle-carlos-cond-2` (T2DM), `particle-carlos-cond-3` (hyperlipidemia), `particle-carlos-med-1` (metformin), `particle-carlos-med-2` (lisinopril), `particle-carlos-med-3` (atorvastatin), `particle-carlos-allergy-1` (sulfa), `particle-carlos-obs-1` (LDL 148), `particle-carlos-obs-2` (A1C 7.8), `particle-carlos-obs-3` (glucose 165), `particle-carlos-obs-4` (BP 142/88), `particle-carlos-enc-1` (annual physical 2025-11-05), `particle-carlos-enc-2` (endocrinology follow-up 2026-01-20).

Codes to use:
- Hypertension: SNOMED `38341003` "Hypertensive disorder"
- T2DM: SNOMED `44054006` "Diabetes mellitus type 2"
- Hyperlipidemia: SNOMED `55822004` "Hyperlipidemia"
- Metformin: RxNorm `6809`
- Lisinopril: RxNorm `29046`
- Atorvastatin: RxNorm `83367`
- LDL: LOINC `13457-7`, value 148, refRange 0-100, interpretation `H`
- A1C: LOINC `4548-4`, value 7.8, unit `%`, refRange 4.0-5.6, interpretation `H`
- Glucose (fasting): LOINC `1558-6`, value 165, unit `mg/dL`, refRange 70-99, interpretation `H`
- BP panel: LOINC `85354-9`, components 8480-6 (systolic=142) and 8462-4 (diastolic=88)

- [ ] **Step 3: Create `fixtures/particle/patient-mia.json`**

Mia Patel — 9yo female. Pediatric record: no conditions, no medications, no allergies, immunization observations (category `vital-signs` for simplicity — or omit immunizations and include growth percentiles instead: height 132cm, weight 28kg, heart rate 84, BP 98/62), one ambulatory well-child visit.

Patient ID: `particle-mia-001`. Birthdate `2016-08-22`, gender `female`. Growth observations use LOINC codes:
- Height: LOINC `8302-2`, value 132, unit `cm`
- Weight: LOINC `29463-7`, value 28, unit `kg`
- Heart rate: LOINC `8867-4`, value 84, unit `/min`
- BP: same code as above, 98/62

Encounter: `particle-mia-enc-1` well-child visit, `2025-09-15`.

- [ ] **Step 4: Validate the fixtures are valid JSON**

```bash
node -e "['sarah','carlos','mia'].forEach(n => JSON.parse(require('fs').readFileSync('fixtures/particle/patient-'+n+'.json','utf8')) && console.log(n,'ok'))"
```

Expected: `sarah ok`, `carlos ok`, `mia ok`.

- [ ] **Step 5: Commit**

```bash
git add fixtures/particle
git commit -m "feat(fixtures): add three particle fhir fixture bundles"
```

---

### Task 7: TDD — Patient mapper

**Files:**
- Test: `packages/fhir-normalizer/test/mappers/patient.test.ts`
- Create: `packages/fhir-normalizer/src/mappers/patient.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/fhir-normalizer/test/mappers/patient.test.ts
import { describe, it, expect } from 'vitest';
import { mapPatient } from '../../src/mappers/patient';
import type { FhirPatient } from '../../src/fhir-types';

describe('mapPatient', () => {
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('maps a fully-populated FHIR Patient to a PatientRecord', () => {
    const fhir: FhirPatient = {
      resourceType: 'Patient',
      id: 'particle-sarah-001',
      name: [{ given: ['Sarah'], family: 'Chen' }],
      birthDate: '1997-06-12',
      gender: 'female',
      telecom: [
        { system: 'email', value: 'sarah.chen@example.com' },
        { system: 'phone', value: '+15551234567' },
      ],
    };

    const result = mapPatient(fhir, { source: 'particle', fetchedAt });

    expect(result.record).toEqual({
      id: expect.any(String),
      firstName: 'Sarah',
      lastName: 'Chen',
      dateOfBirth: '1997-06-12',
      gender: 'female',
      email: 'sarah.chen@example.com',
      phoneNumber: '+15551234567',
      externalIds: { particle: 'particle-sarah-001' },
    });
    expect(result.warnings).toEqual([]);
  });

  it('normalizes unknown gender values to "unknown"', () => {
    const fhir: FhirPatient = {
      resourceType: 'Patient',
      id: 'x',
      name: [{ given: ['A'], family: 'B' }],
      birthDate: '2000-01-01',
      gender: 'not-a-valid-value',
    };

    const result = mapPatient(fhir, { source: 'particle', fetchedAt });

    expect(result.record.gender).toBe('unknown');
    expect(result.warnings).toContain('patient.gender: unknown value "not-a-valid-value" — defaulted to "unknown"');
  });

  it('leaves email and phone undefined if telecom is missing', () => {
    const fhir: FhirPatient = {
      resourceType: 'Patient',
      id: 'x',
      name: [{ given: ['A'], family: 'B' }],
      birthDate: '2000-01-01',
      gender: 'male',
    };

    const result = mapPatient(fhir, { source: 'particle', fetchedAt });

    expect(result.record.email).toBeUndefined();
    expect(result.record.phoneNumber).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: FAIL — `Cannot find module '../../src/mappers/patient'`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// packages/fhir-normalizer/src/mappers/patient.ts
import { randomUUID } from 'crypto';
import type { Gender, PatientRecord, ProviderSource } from '@health-app/shared-types';
import type { FhirPatient } from '../fhir-types';

export interface MapPatientResult {
  record: PatientRecord;
  warnings: string[];
}

const VALID_GENDERS: ReadonlySet<Gender> = new Set(['male', 'female', 'other', 'unknown']);

export function mapPatient(
  fhir: FhirPatient,
  opts: { source: ProviderSource; fetchedAt: string },
): MapPatientResult {
  const warnings: string[] = [];

  const given = fhir.name?.[0]?.given ?? [];
  const family = fhir.name?.[0]?.family ?? '';
  const firstName = given.join(' ').trim();
  const lastName = family.trim();

  let gender: Gender = 'unknown';
  if (fhir.gender) {
    if (VALID_GENDERS.has(fhir.gender as Gender)) {
      gender = fhir.gender as Gender;
    } else {
      warnings.push(`patient.gender: unknown value "${fhir.gender}" — defaulted to "unknown"`);
    }
  }

  const email = fhir.telecom?.find((t) => t.system === 'email')?.value;
  const phoneNumber = fhir.telecom?.find((t) => t.system === 'phone')?.value;

  const externalIds: PatientRecord['externalIds'] = {};
  if (fhir.id) externalIds[opts.source as 'particle' | 'redox'] = fhir.id;

  return {
    record: {
      id: randomUUID(),
      firstName,
      lastName,
      dateOfBirth: fhir.birthDate ?? '',
      gender,
      email,
      phoneNumber,
      externalIds,
    },
    warnings,
  };
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/fhir-normalizer/src/mappers/patient.ts packages/fhir-normalizer/test/mappers/patient.test.ts
git commit -m "feat(fhir-normalizer): add patient mapper"
```

---

### Task 8: TDD — Condition mapper

**Files:**
- Test: `packages/fhir-normalizer/test/mappers/condition.test.ts`
- Create: `packages/fhir-normalizer/src/mappers/condition.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/fhir-normalizer/test/mappers/condition.test.ts
import { describe, it, expect } from 'vitest';
import { mapCondition } from '../../src/mappers/condition';
import type { FhirCondition } from '../../src/fhir-types';

describe('mapCondition', () => {
  const patientId = 'internal-patient-id';
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('maps an active condition with a SNOMED code and body site', () => {
    const fhir: FhirCondition = {
      resourceType: 'Condition',
      id: 'particle-carlos-cond-1',
      code: {
        coding: [{ system: 'http://snomed.info/sct', code: '38341003', display: 'Hypertensive disorder' }],
        text: 'Hypertension',
      },
      clinicalStatus: { coding: [{ code: 'active', display: 'Active' }] },
      recordedDate: '2020-03-12',
      onsetDateTime: '2019-12-01',
      bodySite: [{ text: 'heart' }],
    };

    const result = mapCondition(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.record).toMatchObject({
      patientId,
      code: '38341003',
      codeSystem: 'http://snomed.info/sct',
      display: 'Hypertension',
      clinicalStatus: 'active',
      onsetDate: '2019-12-01',
      recordedDate: '2020-03-12',
      anatomyRef: 'heart',
      providerSource: 'particle',
      providerRecordId: 'particle-carlos-cond-1',
      fetchedAt,
    });
    expect(result.warnings).toEqual([]);
  });

  it('defaults clinicalStatus to "active" and warns when missing', () => {
    const fhir: FhirCondition = {
      resourceType: 'Condition',
      id: 'x',
      code: { coding: [{ code: '1' }], text: 'Something' },
      recordedDate: '2020-01-01',
    };

    const result = mapCondition(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.record.clinicalStatus).toBe('active');
    expect(result.warnings.some((w) => w.includes('clinicalStatus'))).toBe(true);
  });

  it('returns undefined anatomyRef when bodySite is absent', () => {
    const fhir: FhirCondition = {
      resourceType: 'Condition',
      id: 'x',
      code: { coding: [{ code: '1' }], text: 'Something' },
      clinicalStatus: { coding: [{ code: 'active' }] },
      recordedDate: '2020-01-01',
    };

    const result = mapCondition(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.record.anatomyRef).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// packages/fhir-normalizer/src/mappers/condition.ts
import { randomUUID } from 'crypto';
import type {
  ConditionClinicalStatus,
  ConditionRecord,
  ProviderSource,
} from '@health-app/shared-types';
import type { FhirCondition } from '../fhir-types';
import { resolveAnatomyRef } from '../anatomy/body-site-map';

export interface MapConditionResult {
  record: ConditionRecord;
  warnings: string[];
}

const VALID_STATUSES: ReadonlySet<ConditionClinicalStatus> = new Set([
  'active',
  'resolved',
  'inactive',
]);

export function mapCondition(
  fhir: FhirCondition,
  opts: { patientId: string; source: ProviderSource; fetchedAt: string },
): MapConditionResult {
  const warnings: string[] = [];

  const coding = fhir.code?.coding?.[0];
  const code = coding?.code ?? '';
  const codeSystem = coding?.system ?? '';
  const display = fhir.code?.text ?? coding?.display ?? '';

  let clinicalStatus: ConditionClinicalStatus = 'active';
  const rawStatus = fhir.clinicalStatus?.coding?.[0]?.code;
  if (!rawStatus) {
    warnings.push(`condition ${fhir.id}: clinicalStatus missing — defaulted to "active"`);
  } else if (VALID_STATUSES.has(rawStatus as ConditionClinicalStatus)) {
    clinicalStatus = rawStatus as ConditionClinicalStatus;
  } else {
    warnings.push(`condition ${fhir.id}: unknown clinicalStatus "${rawStatus}" — defaulted to "active"`);
  }

  const anatomyRef = resolveAnatomyRef(fhir.bodySite?.[0]);

  return {
    record: {
      id: randomUUID(),
      patientId: opts.patientId,
      code,
      codeSystem,
      display,
      clinicalStatus,
      onsetDate: fhir.onsetDateTime,
      recordedDate: fhir.recordedDate ?? '',
      anatomyRef,
      providerSource: opts.source,
      providerRecordId: fhir.id ?? '',
      fetchedAt: opts.fetchedAt,
      rawSnapshot: fhir,
    },
    warnings,
  };
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: PASS (all tests across patient + condition = 6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/fhir-normalizer/src/mappers/condition.ts packages/fhir-normalizer/test/mappers/condition.test.ts
git commit -m "feat(fhir-normalizer): add condition mapper"
```

---

### Task 9: TDD — Medication mapper

**Files:**
- Test: `packages/fhir-normalizer/test/mappers/medication.test.ts`
- Create: `packages/fhir-normalizer/src/mappers/medication.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/fhir-normalizer/test/mappers/medication.test.ts
import { describe, it, expect } from 'vitest';
import { mapMedication } from '../../src/mappers/medication';
import type { FhirMedicationStatement } from '../../src/fhir-types';

describe('mapMedication', () => {
  const patientId = 'internal-patient-id';
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('maps an active RxNorm-coded medication with dosage text', () => {
    const fhir: FhirMedicationStatement = {
      resourceType: 'MedicationStatement',
      id: 'particle-carlos-med-1',
      status: 'active',
      medicationCodeableConcept: {
        coding: [
          { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '6809', display: 'Metformin' },
        ],
        text: 'Metformin 500 mg',
      },
      effectivePeriod: { start: '2021-04-10' },
      dosage: [{ text: '500 mg twice daily' }],
    };

    const result = mapMedication(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.record).toMatchObject({
      patientId,
      code: '6809',
      codeSystem: 'http://www.nlm.nih.gov/research/umls/rxnorm',
      display: 'Metformin 500 mg',
      dosage: '500 mg twice daily',
      status: 'active',
      startDate: '2021-04-10',
      providerSource: 'particle',
      providerRecordId: 'particle-carlos-med-1',
      fetchedAt,
    });
    expect(result.warnings).toEqual([]);
  });

  it('maps FHIR "stopped" to our "stopped" status', () => {
    const fhir: FhirMedicationStatement = {
      resourceType: 'MedicationStatement',
      id: 'x',
      status: 'stopped',
      medicationCodeableConcept: { coding: [{ code: '1' }], text: 'Drug X' },
    };
    const result = mapMedication(fhir, { patientId, source: 'particle', fetchedAt });
    expect(result.record.status).toBe('stopped');
  });

  it('defaults status to "active" and warns when missing', () => {
    const fhir: FhirMedicationStatement = {
      resourceType: 'MedicationStatement',
      id: 'x',
      medicationCodeableConcept: { coding: [{ code: '1' }], text: 'Drug X' },
    };
    const result = mapMedication(fhir, { patientId, source: 'particle', fetchedAt });
    expect(result.record.status).toBe('active');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// packages/fhir-normalizer/src/mappers/medication.ts
import { randomUUID } from 'crypto';
import type {
  MedicationRecord,
  MedicationStatus,
  ProviderSource,
} from '@health-app/shared-types';
import type { FhirMedicationStatement } from '../fhir-types';

export interface MapMedicationResult {
  record: MedicationRecord;
  warnings: string[];
}

function normalizeStatus(raw: string | undefined, warnings: string[], id: string): MedicationStatus {
  if (!raw) {
    warnings.push(`medication ${id}: status missing — defaulted to "active"`);
    return 'active';
  }
  if (raw === 'active' || raw === 'completed' || raw === 'stopped') return raw;
  // FHIR has more statuses than we model — map them to our three buckets.
  if (raw === 'on-hold' || raw === 'cancelled' || raw === 'entered-in-error') {
    warnings.push(`medication ${id}: FHIR status "${raw}" mapped to "stopped"`);
    return 'stopped';
  }
  if (raw === 'intended' || raw === 'not-taken' || raw === 'unknown') {
    warnings.push(`medication ${id}: FHIR status "${raw}" mapped to "active"`);
    return 'active';
  }
  warnings.push(`medication ${id}: unknown status "${raw}" — defaulted to "active"`);
  return 'active';
}

export function mapMedication(
  fhir: FhirMedicationStatement,
  opts: { patientId: string; source: ProviderSource; fetchedAt: string },
): MapMedicationResult {
  const warnings: string[] = [];

  const coding = fhir.medicationCodeableConcept?.coding?.[0];
  const code = coding?.code ?? '';
  const codeSystem = coding?.system ?? '';
  const display = fhir.medicationCodeableConcept?.text ?? coding?.display ?? '';

  const status = normalizeStatus(fhir.status, warnings, fhir.id ?? 'unknown');

  const dosage = fhir.dosage?.[0]?.text;
  const startDate = fhir.effectivePeriod?.start ?? fhir.effectiveDateTime;
  const endDate = fhir.effectivePeriod?.end;

  return {
    record: {
      id: randomUUID(),
      patientId: opts.patientId,
      code,
      codeSystem,
      display,
      dosage,
      status,
      startDate,
      endDate,
      providerSource: opts.source,
      providerRecordId: fhir.id ?? '',
      fetchedAt: opts.fetchedAt,
      rawSnapshot: fhir,
    },
    warnings,
  };
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: PASS (9 tests total).

- [ ] **Step 5: Commit**

```bash
git add packages/fhir-normalizer/src/mappers/medication.ts packages/fhir-normalizer/test/mappers/medication.test.ts
git commit -m "feat(fhir-normalizer): add medication mapper"
```

---

### Task 10: TDD — Allergy mapper

**Files:**
- Test: `packages/fhir-normalizer/test/mappers/allergy.test.ts`
- Create: `packages/fhir-normalizer/src/mappers/allergy.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/fhir-normalizer/test/mappers/allergy.test.ts
import { describe, it, expect } from 'vitest';
import { mapAllergy } from '../../src/mappers/allergy';
import type { FhirAllergyIntolerance } from '../../src/fhir-types';

describe('mapAllergy', () => {
  const patientId = 'internal-patient-id';
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('maps a penicillin allergy with severity and reaction text', () => {
    const fhir: FhirAllergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      id: 'particle-sarah-allergy-1',
      code: {
        coding: [{ code: '7984', display: 'Penicillin G' }],
        text: 'Penicillin',
      },
      recordedDate: '2018-09-02',
      reaction: [
        { manifestation: [{ text: 'Hives' }], severity: 'moderate' },
      ],
    };

    const result = mapAllergy(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.record).toMatchObject({
      patientId,
      substance: 'Penicillin',
      reaction: 'Hives',
      severity: 'moderate',
      recordedDate: '2018-09-02',
      providerRecordId: 'particle-sarah-allergy-1',
    });
    expect(result.warnings).toEqual([]);
  });

  it('defaults severity to "mild" when missing', () => {
    const fhir: FhirAllergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      id: 'x',
      code: { text: 'Peanut' },
      recordedDate: '2020-01-01',
    };
    const result = mapAllergy(fhir, { patientId, source: 'particle', fetchedAt });
    expect(result.record.severity).toBe('mild');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// packages/fhir-normalizer/src/mappers/allergy.ts
import { randomUUID } from 'crypto';
import type {
  AllergyRecord,
  AllergySeverity,
  ProviderSource,
} from '@health-app/shared-types';
import type { FhirAllergyIntolerance } from '../fhir-types';

export interface MapAllergyResult {
  record: AllergyRecord;
  warnings: string[];
}

const VALID_SEVERITIES: ReadonlySet<AllergySeverity> = new Set(['mild', 'moderate', 'severe']);

export function mapAllergy(
  fhir: FhirAllergyIntolerance,
  opts: { patientId: string; source: ProviderSource; fetchedAt: string },
): MapAllergyResult {
  const warnings: string[] = [];

  const substance =
    fhir.code?.text ?? fhir.code?.coding?.[0]?.display ?? '';

  const firstReaction = fhir.reaction?.[0];
  const reaction = firstReaction?.manifestation?.[0]?.text ?? undefined;

  let severity: AllergySeverity = 'mild';
  if (firstReaction?.severity && VALID_SEVERITIES.has(firstReaction.severity)) {
    severity = firstReaction.severity;
  }

  return {
    record: {
      id: randomUUID(),
      patientId: opts.patientId,
      substance,
      reaction,
      severity,
      recordedDate: fhir.recordedDate ?? '',
      providerSource: opts.source,
      providerRecordId: fhir.id ?? '',
      fetchedAt: opts.fetchedAt,
      rawSnapshot: fhir,
    },
    warnings,
  };
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: PASS (11 tests total).

- [ ] **Step 5: Commit**

```bash
git add packages/fhir-normalizer/src/mappers/allergy.ts packages/fhir-normalizer/test/mappers/allergy.test.ts
git commit -m "feat(fhir-normalizer): add allergy mapper"
```

---

### Task 11: TDD — Observation mapper (labs + vitals + BP panel)

**Files:**
- Test: `packages/fhir-normalizer/test/mappers/observation.test.ts`
- Create: `packages/fhir-normalizer/src/mappers/observation.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/fhir-normalizer/test/mappers/observation.test.ts
import { describe, it, expect } from 'vitest';
import { mapObservation } from '../../src/mappers/observation';
import type { FhirObservation } from '../../src/fhir-types';

describe('mapObservation', () => {
  const patientId = 'internal-patient-id';
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('maps a lab observation (LDL) with reference range and interpretation', () => {
    const fhir: FhirObservation = {
      resourceType: 'Observation',
      id: 'particle-carlos-obs-1',
      status: 'final',
      category: [{ coding: [{ code: 'laboratory' }] }],
      code: {
        coding: [{ system: 'http://loinc.org', code: '13457-7', display: 'LDL Cholesterol' }],
        text: 'LDL Cholesterol',
      },
      effectiveDateTime: '2025-11-10',
      valueQuantity: { value: 148, unit: 'mg/dL' },
      referenceRange: [{ low: { value: 0 }, high: { value: 100 } }],
      interpretation: [{ coding: [{ code: 'H', display: 'High' }] }],
    };

    const result = mapObservation(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      patientId,
      category: 'lab',
      code: '13457-7',
      display: 'LDL Cholesterol',
      value: '148',
      unit: 'mg/dL',
      referenceRangeLow: 0,
      referenceRangeHigh: 100,
      interpretation: 'high',
      effectiveDate: '2025-11-10',
    });
  });

  it('maps a vital-signs blood pressure panel into TWO observation records', () => {
    const fhir: FhirObservation = {
      resourceType: 'Observation',
      id: 'particle-carlos-obs-4',
      status: 'final',
      category: [{ coding: [{ code: 'vital-signs' }] }],
      code: {
        coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }],
      },
      effectiveDateTime: '2025-11-10',
      component: [
        {
          code: { coding: [{ code: '8480-6', display: 'Systolic' }] },
          valueQuantity: { value: 142, unit: 'mmHg' },
        },
        {
          code: { coding: [{ code: '8462-4', display: 'Diastolic' }] },
          valueQuantity: { value: 88, unit: 'mmHg' },
        },
      ],
    };

    const result = mapObservation(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({
      category: 'vital-sign',
      code: '8480-6',
      display: 'Systolic',
      value: '142',
      unit: 'mmHg',
    });
    expect(result.records[1]).toMatchObject({
      category: 'vital-sign',
      code: '8462-4',
      display: 'Diastolic',
      value: '88',
      unit: 'mmHg',
    });
  });

  it('maps FHIR interpretation codes to our buckets', () => {
    const cases: Array<[string, 'normal' | 'low' | 'high' | 'critical']> = [
      ['N', 'normal'],
      ['H', 'high'],
      ['HH', 'critical'],
      ['L', 'low'],
      ['LL', 'critical'],
    ];
    for (const [fhirCode, expected] of cases) {
      const fhir: FhirObservation = {
        resourceType: 'Observation',
        id: 'x',
        category: [{ coding: [{ code: 'laboratory' }] }],
        code: { coding: [{ code: '1' }], text: 'X' },
        effectiveDateTime: '2025-01-01',
        valueQuantity: { value: 1, unit: 'u' },
        interpretation: [{ coding: [{ code: fhirCode }] }],
      };
      const result = mapObservation(fhir, { patientId, source: 'particle', fetchedAt });
      expect(result.records[0].interpretation).toBe(expected);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// packages/fhir-normalizer/src/mappers/observation.ts
import { randomUUID } from 'crypto';
import type {
  ObservationCategory,
  ObservationInterpretation,
  ObservationRecord,
  ProviderSource,
} from '@health-app/shared-types';
import type { FhirObservation } from '../fhir-types';
import { resolveAnatomyRef } from '../anatomy/body-site-map';

export interface MapObservationResult {
  records: ObservationRecord[];
  warnings: string[];
}

function mapCategory(raw: string | undefined): ObservationCategory {
  // FHIR uses "laboratory" / "vital-signs" / etc. We collapse to two buckets.
  if (raw === 'vital-signs') return 'vital-sign';
  return 'lab';
}

function mapInterpretation(raw: string | undefined): ObservationInterpretation | undefined {
  if (!raw) return undefined;
  const u = raw.toUpperCase();
  if (u === 'N') return 'normal';
  if (u === 'H') return 'high';
  if (u === 'L') return 'low';
  if (u === 'HH' || u === 'LL' || u === 'CRITICAL') return 'critical';
  return undefined;
}

export function mapObservation(
  fhir: FhirObservation,
  opts: { patientId: string; source: ProviderSource; fetchedAt: string },
): MapObservationResult {
  const warnings: string[] = [];
  const records: ObservationRecord[] = [];

  const category = mapCategory(fhir.category?.[0]?.coding?.[0]?.code);
  const effectiveDate = fhir.effectiveDateTime ?? '';
  const interpretation = mapInterpretation(fhir.interpretation?.[0]?.coding?.[0]?.code);
  const anatomyRef = resolveAnatomyRef(fhir.bodySite);

  const components = fhir.component ?? [];

  if (components.length > 0) {
    // Panel observations (e.g. BP) produce one record per component.
    for (const comp of components) {
      const compCoding = comp.code?.coding?.[0];
      records.push({
        id: randomUUID(),
        patientId: opts.patientId,
        category,
        code: compCoding?.code ?? '',
        codeSystem: compCoding?.system ?? 'http://loinc.org',
        display: compCoding?.display ?? '',
        value: comp.valueQuantity?.value?.toString() ?? '',
        unit: comp.valueQuantity?.unit,
        effectiveDate,
        anatomyRef,
        providerSource: opts.source,
        providerRecordId: `${fhir.id ?? ''}:${compCoding?.code ?? ''}`,
        fetchedAt: opts.fetchedAt,
        rawSnapshot: { parent: fhir.id, component: comp },
      });
    }
  } else {
    // Single-value observation.
    const coding = fhir.code?.coding?.[0];
    records.push({
      id: randomUUID(),
      patientId: opts.patientId,
      category,
      code: coding?.code ?? '',
      codeSystem: coding?.system ?? '',
      display: fhir.code?.text ?? coding?.display ?? '',
      value:
        fhir.valueQuantity?.value?.toString() ?? fhir.valueString ?? '',
      unit: fhir.valueQuantity?.unit,
      referenceRangeLow: fhir.referenceRange?.[0]?.low?.value,
      referenceRangeHigh: fhir.referenceRange?.[0]?.high?.value,
      interpretation,
      effectiveDate,
      anatomyRef,
      providerSource: opts.source,
      providerRecordId: fhir.id ?? '',
      fetchedAt: opts.fetchedAt,
      rawSnapshot: fhir,
    });
  }

  return { records, warnings };
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/fhir-normalizer/src/mappers/observation.ts packages/fhir-normalizer/test/mappers/observation.test.ts
git commit -m "feat(fhir-normalizer): add observation mapper with bp panel splitting"
```

---

### Task 12: TDD — Encounter mapper

**Files:**
- Test: `packages/fhir-normalizer/test/mappers/encounter.test.ts`
- Create: `packages/fhir-normalizer/src/mappers/encounter.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/fhir-normalizer/test/mappers/encounter.test.ts
import { describe, it, expect } from 'vitest';
import { mapEncounter } from '../../src/mappers/encounter';
import type { FhirEncounter } from '../../src/fhir-types';

describe('mapEncounter', () => {
  const patientId = 'internal-patient-id';
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('maps an ambulatory encounter with reason and provider', () => {
    const fhir: FhirEncounter = {
      resourceType: 'Encounter',
      id: 'particle-sarah-enc-1',
      class: { code: 'AMB', display: 'Ambulatory' },
      type: [{ text: 'Annual physical exam' }],
      reasonCode: [{ text: 'Annual wellness visit' }],
      period: { start: '2025-11-10T09:00:00Z', end: '2025-11-10T09:45:00Z' },
      participant: [{ individual: { display: 'Dr. Anita Rao' } }],
    };

    const result = mapEncounter(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.record).toMatchObject({
      patientId,
      type: 'ambulatory',
      reason: 'Annual wellness visit',
      providerName: 'Dr. Anita Rao',
      startDate: '2025-11-10T09:00:00Z',
      endDate: '2025-11-10T09:45:00Z',
      providerRecordId: 'particle-sarah-enc-1',
    });
  });

  it('maps the FHIR v3-ActCode classes EMER, IMP, VR to our buckets', () => {
    const cases: Array<[string, 'ambulatory' | 'emergency' | 'inpatient' | 'virtual']> = [
      ['AMB', 'ambulatory'],
      ['EMER', 'emergency'],
      ['IMP', 'inpatient'],
      ['VR', 'virtual'],
    ];
    for (const [code, expected] of cases) {
      const fhir: FhirEncounter = {
        resourceType: 'Encounter',
        id: 'x',
        class: { code },
        period: { start: '2025-01-01' },
      };
      const result = mapEncounter(fhir, { patientId, source: 'particle', fetchedAt });
      expect(result.record.type).toBe(expected);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// packages/fhir-normalizer/src/mappers/encounter.ts
import { randomUUID } from 'crypto';
import type {
  EncounterRecord,
  EncounterType,
  ProviderSource,
} from '@health-app/shared-types';
import type { FhirEncounter } from '../fhir-types';

export interface MapEncounterResult {
  record: EncounterRecord;
  warnings: string[];
}

function mapType(raw: string | undefined, warnings: string[]): EncounterType {
  switch (raw) {
    case 'AMB':
      return 'ambulatory';
    case 'EMER':
      return 'emergency';
    case 'IMP':
    case 'ACUTE':
      return 'inpatient';
    case 'VR':
      return 'virtual';
    default:
      if (raw) warnings.push(`encounter class "${raw}" mapped to "ambulatory"`);
      return 'ambulatory';
  }
}

export function mapEncounter(
  fhir: FhirEncounter,
  opts: { patientId: string; source: ProviderSource; fetchedAt: string },
): MapEncounterResult {
  const warnings: string[] = [];

  const type = mapType(fhir.class?.code, warnings);
  const reason = fhir.reasonCode?.[0]?.text ?? fhir.type?.[0]?.text;
  const providerName = fhir.participant?.[0]?.individual?.display;

  return {
    record: {
      id: randomUUID(),
      patientId: opts.patientId,
      type,
      reason,
      providerName,
      startDate: fhir.period?.start ?? '',
      endDate: fhir.period?.end,
      providerSource: opts.source,
      providerRecordId: fhir.id ?? '',
      fetchedAt: opts.fetchedAt,
      rawSnapshot: fhir,
    },
    warnings,
  };
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/fhir-normalizer/src/mappers/encounter.ts packages/fhir-normalizer/test/mappers/encounter.test.ts
git commit -m "feat(fhir-normalizer): add encounter mapper"
```

---

### Task 13: TDD — `normalizeBundle` integration

**Files:**
- Test: `packages/fhir-normalizer/test/normalize-bundle.test.ts`
- Replace: `packages/fhir-normalizer/src/index.ts`

- [ ] **Step 1: Write the failing integration test against the Sarah fixture**

```ts
// packages/fhir-normalizer/test/normalize-bundle.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { normalizeBundle } from '../src';
import type { FhirBundle } from '../src/fhir-types';

function loadFixture(name: string): FhirBundle {
  const path = resolve(__dirname, '../../..', 'fixtures', 'particle', name);
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('normalizeBundle', () => {
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('normalizes the Sarah fixture into a complete payload', () => {
    const bundle = loadFixture('patient-sarah.json');
    const result = normalizeBundle(bundle, { source: 'particle', fetchedAt });

    expect(result.patient.firstName).toBe('Sarah');
    expect(result.patient.lastName).toBe('Chen');
    expect(result.patient.externalIds.particle).toBe('particle-sarah-001');

    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0].display).toContain('Allergic');

    expect(result.allergies).toHaveLength(1);
    expect(result.allergies[0].substance).toBe('Penicillin');

    // BP panel splits into 2 observation records + 1 LDL lab = 3 total
    expect(result.observations).toHaveLength(3);

    expect(result.encounters).toHaveLength(1);
    expect(result.encounters[0].type).toBe('ambulatory');

    expect(result.warnings).toEqual([]);

    // Every clinical record points at the same internal patientId
    const pid = result.patient.id;
    result.conditions.forEach((c) => expect(c.patientId).toBe(pid));
    result.allergies.forEach((a) => expect(a.patientId).toBe(pid));
    result.observations.forEach((o) => expect(o.patientId).toBe(pid));
    result.encounters.forEach((e) => expect(e.patientId).toBe(pid));
  });

  it('normalizes the Carlos fixture and carries through status values', () => {
    const bundle = loadFixture('patient-carlos.json');
    const result = normalizeBundle(bundle, { source: 'particle', fetchedAt });

    expect(result.conditions.length).toBeGreaterThanOrEqual(3);
    expect(result.medications.length).toBeGreaterThanOrEqual(3);
    expect(result.medications.every((m) => m.status === 'active')).toBe(true);

    const ldl = result.observations.find((o) => o.display.includes('LDL'));
    expect(ldl?.interpretation).toBe('high');
  });

  it('returns an empty payload (with no throws) for a bundle with no entries', () => {
    const bundle: FhirBundle = { resourceType: 'Bundle', entry: [] };
    const result = normalizeBundle(bundle, { source: 'particle', fetchedAt });
    expect(result.conditions).toEqual([]);
    expect(result.patient.id).toBe('');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: FAIL — `normalizeBundle` is not exported yet.

- [ ] **Step 3: Replace `packages/fhir-normalizer/src/index.ts` with the real entry**

```ts
// packages/fhir-normalizer/src/index.ts
import type {
  AllergyRecord,
  ConditionRecord,
  EncounterRecord,
  MedicationRecord,
  NormalizedPatientPayload,
  ObservationRecord,
  PatientRecord,
  ProviderSource,
} from '@health-app/shared-types';
import type {
  FhirAllergyIntolerance,
  FhirBundle,
  FhirCondition,
  FhirEncounter,
  FhirMedicationStatement,
  FhirObservation,
  FhirPatient,
} from './fhir-types';
import { mapPatient } from './mappers/patient';
import { mapCondition } from './mappers/condition';
import { mapMedication } from './mappers/medication';
import { mapAllergy } from './mappers/allergy';
import { mapObservation } from './mappers/observation';
import { mapEncounter } from './mappers/encounter';

export * from './fhir-types';
export { mapPatient } from './mappers/patient';
export { mapCondition } from './mappers/condition';
export { mapMedication } from './mappers/medication';
export { mapAllergy } from './mappers/allergy';
export { mapObservation } from './mappers/observation';
export { mapEncounter } from './mappers/encounter';

export interface NormalizeOptions {
  source: ProviderSource;
  fetchedAt: string;
}

const EMPTY_PATIENT: PatientRecord = {
  id: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'unknown',
  externalIds: {},
};

export function normalizeBundle(
  bundle: FhirBundle,
  opts: NormalizeOptions,
): NormalizedPatientPayload {
  const warnings: string[] = [];
  const conditions: ConditionRecord[] = [];
  const medications: MedicationRecord[] = [];
  const allergies: AllergyRecord[] = [];
  const observations: ObservationRecord[] = [];
  const encounters: EncounterRecord[] = [];

  let patient: PatientRecord = EMPTY_PATIENT;

  // First pass: find the Patient so we know our internal patientId.
  const patientEntry = bundle.entry?.find(
    (e) => e.resource?.resourceType === 'Patient',
  );
  if (patientEntry?.resource) {
    const res = mapPatient(patientEntry.resource as FhirPatient, opts);
    patient = res.record;
    warnings.push(...res.warnings);
  } else {
    warnings.push('bundle: no Patient resource found');
  }

  // Second pass: map every other resource, attaching to the patient.
  for (const entry of bundle.entry ?? []) {
    const r = entry.resource;
    if (!r) continue;
    switch (r.resourceType) {
      case 'Patient':
        break; // already handled
      case 'Condition': {
        const { record, warnings: ws } = mapCondition(r as FhirCondition, {
          patientId: patient.id,
          ...opts,
        });
        conditions.push(record);
        warnings.push(...ws);
        break;
      }
      case 'MedicationStatement':
      case 'MedicationRequest': {
        const { record, warnings: ws } = mapMedication(
          r as FhirMedicationStatement,
          { patientId: patient.id, ...opts },
        );
        medications.push(record);
        warnings.push(...ws);
        break;
      }
      case 'AllergyIntolerance': {
        const { record, warnings: ws } = mapAllergy(
          r as FhirAllergyIntolerance,
          { patientId: patient.id, ...opts },
        );
        allergies.push(record);
        warnings.push(...ws);
        break;
      }
      case 'Observation': {
        const { records, warnings: ws } = mapObservation(
          r as FhirObservation,
          { patientId: patient.id, ...opts },
        );
        observations.push(...records);
        warnings.push(...ws);
        break;
      }
      case 'Encounter': {
        const { record, warnings: ws } = mapEncounter(r as FhirEncounter, {
          patientId: patient.id,
          ...opts,
        });
        encounters.push(record);
        warnings.push(...ws);
        break;
      }
      default:
        warnings.push(`bundle: skipped unsupported resourceType "${r.resourceType}"`);
    }
  }

  return {
    patient,
    conditions,
    medications,
    allergies,
    observations,
    encounters,
    warnings,
  };
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
pnpm --filter @health-app/fhir-normalizer test
```

Expected: PASS (all mapper tests + normalize-bundle tests).

- [ ] **Step 5: Build the package**

```bash
pnpm --filter @health-app/fhir-normalizer build
```

Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add packages/fhir-normalizer/src/index.ts packages/fhir-normalizer/test/normalize-bundle.test.ts
git commit -m "feat(fhir-normalizer): add normalizeBundle entry point"
```

---

## Phase D — Insights rules package (TDD)

### Task 14: Scaffold `packages/insights-rules` + blood-pressure rule (TDD)

**Files:**
- Create: `packages/insights-rules/package.json`
- Create: `packages/insights-rules/tsconfig.json`
- Create: `packages/insights-rules/vitest.config.ts`
- Create: `packages/insights-rules/src/index.ts`
- Test: `packages/insights-rules/test/rules/blood-pressure.test.ts`
- Create: `packages/insights-rules/src/rules/blood-pressure.ts`

- [ ] **Step 1: Create `packages/insights-rules/package.json`**

```json
{
  "name": "@health-app/insights-rules",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@health-app/shared-types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/insights-rules/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Create `packages/insights-rules/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['test/**/*.test.ts'], globals: false },
});
```

- [ ] **Step 4: Create a placeholder `packages/insights-rules/src/index.ts`**

```ts
// Filled in Task 19 — generateFlags entry point.
export {};
```

- [ ] **Step 5: Write the failing blood-pressure rule test**

```ts
// packages/insights-rules/test/rules/blood-pressure.test.ts
import { describe, it, expect } from 'vitest';
import { bloodPressureRule } from '../../src/rules/blood-pressure';
import type { NormalizedPatientPayload, ObservationRecord } from '@health-app/shared-types';

function obs(code: string, value: string, date = '2025-11-10'): ObservationRecord {
  return {
    id: crypto.randomUUID(),
    patientId: 'p',
    category: 'vital-sign',
    code,
    codeSystem: 'http://loinc.org',
    display: code === '8480-6' ? 'Systolic' : 'Diastolic',
    value,
    unit: 'mmHg',
    effectiveDate: date,
    providerSource: 'particle',
    providerRecordId: 'x',
    fetchedAt: '2026-04-10T00:00:00Z',
  };
}

function payload(observations: ObservationRecord[]): NormalizedPatientPayload {
  return {
    patient: {
      id: 'p', firstName: 'X', lastName: 'Y', dateOfBirth: '1990-01-01',
      gender: 'male', externalIds: {},
    },
    conditions: [], medications: [], allergies: [],
    observations, encounters: [], warnings: [],
  };
}

describe('bloodPressureRule', () => {
  it('returns no flag for normal BP (118/76)', () => {
    const flags = bloodPressureRule(payload([obs('8480-6', '118'), obs('8462-4', '76')]));
    expect(flags).toEqual([]);
  });

  it('flags stage 1 hypertension (138/86)', () => {
    const flags = bloodPressureRule(payload([obs('8480-6', '138'), obs('8462-4', '86')]));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      severity: 'watch',
      category: 'vital',
      metric: 'Blood pressure',
      observedValue: '138/86',
      anatomyRef: 'heart',
    });
    expect(flags[0].message).toContain('Stage 1');
  });

  it('flags stage 2 hypertension (152/94) as "concern"', () => {
    const flags = bloodPressureRule(payload([obs('8480-6', '152'), obs('8462-4', '94')]));
    expect(flags[0].severity).toBe('concern');
    expect(flags[0].message).toContain('Stage 2');
  });

  it('uses only the most recent BP reading when multiple exist', () => {
    const flags = bloodPressureRule(
      payload([
        obs('8480-6', '118', '2023-01-01'),
        obs('8462-4', '76', '2023-01-01'),
        obs('8480-6', '152', '2025-11-10'),
        obs('8462-4', '94', '2025-11-10'),
      ]),
    );
    expect(flags[0].severity).toBe('concern');
  });

  it('returns no flag when BP readings are missing', () => {
    expect(bloodPressureRule(payload([]))).toEqual([]);
  });
});
```

- [ ] **Step 6: Run the test and verify it fails**

```bash
pnpm install
pnpm --filter @health-app/insights-rules test
```

Expected: FAIL — module not found.

- [ ] **Step 7: Write `packages/insights-rules/src/rules/blood-pressure.ts`**

```ts
import { createHash } from 'crypto';
import type { InsightFlag, NormalizedPatientPayload } from '@health-app/shared-types';

const SYSTOLIC_LOINC = '8480-6';
const DIASTOLIC_LOINC = '8462-4';

function stableId(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 12);
}

interface BPReading {
  systolic: number;
  diastolic: number;
  date: string;
}

function latestBPReading(payload: NormalizedPatientPayload): BPReading | undefined {
  const systolics = payload.observations
    .filter((o) => o.code === SYSTOLIC_LOINC)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  const diastolics = payload.observations
    .filter((o) => o.code === DIASTOLIC_LOINC)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

  const sys = systolics[0];
  const dia = diastolics.find((d) => d.effectiveDate === sys?.effectiveDate);
  if (!sys || !dia) return undefined;

  return {
    systolic: Number(sys.value),
    diastolic: Number(dia.value),
    date: sys.effectiveDate,
  };
}

export function bloodPressureRule(
  payload: NormalizedPatientPayload,
): InsightFlag[] {
  const bp = latestBPReading(payload);
  if (!bp) return [];

  const { systolic, diastolic } = bp;
  const observedValue = `${systolic}/${diastolic}`;

  let severity: 'info' | 'watch' | 'concern';
  let stageText: string;

  if (systolic >= 140 || diastolic >= 90) {
    severity = 'concern';
    stageText = 'Stage 2 hypertension';
  } else if (systolic >= 130 || diastolic >= 80) {
    severity = 'watch';
    stageText = 'Stage 1 hypertension';
  } else if (systolic >= 120) {
    severity = 'info';
    stageText = 'Elevated blood pressure';
  } else {
    return [];
  }

  return [
    {
      id: stableId(`bp:${bp.date}:${observedValue}`),
      severity,
      category: 'vital',
      metric: 'Blood pressure',
      observedValue,
      message: `${stageText} — last reading ${observedValue} mmHg on ${bp.date}`,
      anatomyRef: 'heart',
    },
  ];
}
```

- [ ] **Step 8: Run the test and verify it passes**

```bash
pnpm --filter @health-app/insights-rules test
```

Expected: PASS (5 tests).

- [ ] **Step 9: Commit**

```bash
git add packages/insights-rules
git commit -m "feat(insights-rules): add blood-pressure rule"
```

---

### Task 15: TDD — Lipids rule (LDL/HDL/total cholesterol)

**Files:**
- Test: `packages/insights-rules/test/rules/lipids.test.ts`
- Create: `packages/insights-rules/src/rules/lipids.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/insights-rules/test/rules/lipids.test.ts
import { describe, it, expect } from 'vitest';
import { lipidsRule } from '../../src/rules/lipids';
import type { NormalizedPatientPayload, ObservationRecord } from '@health-app/shared-types';

function labObs(code: string, display: string, value: string): ObservationRecord {
  return {
    id: crypto.randomUUID(),
    patientId: 'p',
    category: 'lab',
    code,
    codeSystem: 'http://loinc.org',
    display,
    value,
    unit: 'mg/dL',
    effectiveDate: '2025-11-10',
    providerSource: 'particle',
    providerRecordId: 'x',
    fetchedAt: '2026-04-10T00:00:00Z',
  };
}

function payload(obs: ObservationRecord[]): NormalizedPatientPayload {
  return {
    patient: { id: 'p', firstName: 'X', lastName: 'Y', dateOfBirth: '1990-01-01', gender: 'male', externalIds: {} },
    conditions: [], medications: [], allergies: [],
    observations: obs, encounters: [], warnings: [],
  };
}

describe('lipidsRule', () => {
  it('flags LDL above 130 as concern', () => {
    const flags = lipidsRule(payload([labObs('13457-7', 'LDL Cholesterol', '148')]));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      severity: 'concern',
      category: 'lab',
      metric: 'LDL',
      observedValue: '148 mg/dL',
    });
  });

  it('flags LDL 100-129 as watch', () => {
    const flags = lipidsRule(payload([labObs('13457-7', 'LDL Cholesterol', '118')]));
    expect(flags[0].severity).toBe('watch');
  });

  it('does not flag LDL under 100', () => {
    expect(lipidsRule(payload([labObs('13457-7', 'LDL', '92')]))).toEqual([]);
  });

  it('flags HDL below 40 as watch', () => {
    const flags = lipidsRule(payload([labObs('2085-9', 'HDL Cholesterol', '32')]));
    expect(flags[0]).toMatchObject({ metric: 'HDL', severity: 'watch' });
  });

  it('flags total cholesterol above 240 as concern', () => {
    const flags = lipidsRule(payload([labObs('2093-3', 'Total Cholesterol', '255')]));
    expect(flags[0]).toMatchObject({ metric: 'Total cholesterol', severity: 'concern' });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm --filter @health-app/insights-rules test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the rule**

```ts
// packages/insights-rules/src/rules/lipids.ts
import { createHash } from 'crypto';
import type { InsightFlag, NormalizedPatientPayload, ObservationRecord } from '@health-app/shared-types';

const LDL = '13457-7';
const HDL = '2085-9';
const TOTAL_CHOL = '2093-3';

function stableId(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 12);
}

function latest(obs: ObservationRecord[], code: string): ObservationRecord | undefined {
  return obs
    .filter((o) => o.code === code)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
}

export function lipidsRule(payload: NormalizedPatientPayload): InsightFlag[] {
  const flags: InsightFlag[] = [];

  const ldl = latest(payload.observations, LDL);
  if (ldl) {
    const v = Number(ldl.value);
    if (v >= 130) {
      flags.push({
        id: stableId(`ldl:${ldl.effectiveDate}:${v}`),
        severity: 'concern',
        category: 'lab',
        metric: 'LDL',
        observedValue: `${v} mg/dL`,
        message: `LDL ${v} mg/dL is above the target (<100). Discuss with your provider.`,
      });
    } else if (v >= 100) {
      flags.push({
        id: stableId(`ldl:${ldl.effectiveDate}:${v}`),
        severity: 'watch',
        category: 'lab',
        metric: 'LDL',
        observedValue: `${v} mg/dL`,
        message: `LDL ${v} mg/dL is near the upper limit (<100). Worth keeping an eye on.`,
      });
    }
  }

  const hdl = latest(payload.observations, HDL);
  if (hdl) {
    const v = Number(hdl.value);
    if (v < 40) {
      flags.push({
        id: stableId(`hdl:${hdl.effectiveDate}:${v}`),
        severity: 'watch',
        category: 'lab',
        metric: 'HDL',
        observedValue: `${v} mg/dL`,
        message: `HDL ${v} mg/dL is below the typical target (≥40).`,
      });
    }
  }

  const total = latest(payload.observations, TOTAL_CHOL);
  if (total) {
    const v = Number(total.value);
    if (v >= 240) {
      flags.push({
        id: stableId(`total:${total.effectiveDate}:${v}`),
        severity: 'concern',
        category: 'lab',
        metric: 'Total cholesterol',
        observedValue: `${v} mg/dL`,
        message: `Total cholesterol ${v} mg/dL is high (<200).`,
      });
    } else if (v >= 200) {
      flags.push({
        id: stableId(`total:${total.effectiveDate}:${v}`),
        severity: 'watch',
        category: 'lab',
        metric: 'Total cholesterol',
        observedValue: `${v} mg/dL`,
        message: `Total cholesterol ${v} mg/dL is borderline (<200).`,
      });
    }
  }

  return flags;
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
pnpm --filter @health-app/insights-rules test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/insights-rules/src/rules/lipids.ts packages/insights-rules/test/rules/lipids.test.ts
git commit -m "feat(insights-rules): add lipids rule"
```

---

### Task 16: TDD — Glucose / A1C rule

**Files:**
- Test: `packages/insights-rules/test/rules/glucose.test.ts`
- Create: `packages/insights-rules/src/rules/glucose.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/insights-rules/test/rules/glucose.test.ts
import { describe, it, expect } from 'vitest';
import { glucoseRule } from '../../src/rules/glucose';
import type { NormalizedPatientPayload, ObservationRecord } from '@health-app/shared-types';

function obs(code: string, display: string, value: string, unit: string): ObservationRecord {
  return {
    id: crypto.randomUUID(), patientId: 'p', category: 'lab',
    code, codeSystem: 'http://loinc.org', display, value, unit,
    effectiveDate: '2025-11-10', providerSource: 'particle',
    providerRecordId: 'x', fetchedAt: '2026-04-10T00:00:00Z',
  };
}

function payload(observations: ObservationRecord[]): NormalizedPatientPayload {
  return {
    patient: { id: 'p', firstName: 'X', lastName: 'Y', dateOfBirth: '1990-01-01', gender: 'male', externalIds: {} },
    conditions: [], medications: [], allergies: [],
    observations, encounters: [], warnings: [],
  };
}

describe('glucoseRule', () => {
  it('flags A1C >= 6.5% as concern (diabetes range)', () => {
    const flags = glucoseRule(payload([obs('4548-4', 'Hemoglobin A1C', '7.8', '%')]));
    expect(flags[0]).toMatchObject({ severity: 'concern', metric: 'A1C', observedValue: '7.8 %' });
  });

  it('flags A1C 5.7-6.4% as watch (prediabetes)', () => {
    const flags = glucoseRule(payload([obs('4548-4', 'Hemoglobin A1C', '6.0', '%')]));
    expect(flags[0].severity).toBe('watch');
  });

  it('flags fasting glucose >= 126 as concern', () => {
    const flags = glucoseRule(payload([obs('1558-6', 'Fasting glucose', '165', 'mg/dL')]));
    expect(flags[0]).toMatchObject({ severity: 'concern', metric: 'Fasting glucose' });
  });

  it('flags fasting glucose 100-125 as watch (impaired fasting glucose)', () => {
    const flags = glucoseRule(payload([obs('1558-6', 'Fasting glucose', '110', 'mg/dL')]));
    expect(flags[0].severity).toBe('watch');
  });

  it('does not flag normal values', () => {
    expect(glucoseRule(payload([obs('4548-4', 'A1C', '5.2', '%')]))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm --filter @health-app/insights-rules test
```

Expected: FAIL.

- [ ] **Step 3: Write the rule**

```ts
// packages/insights-rules/src/rules/glucose.ts
import { createHash } from 'crypto';
import type { InsightFlag, NormalizedPatientPayload, ObservationRecord } from '@health-app/shared-types';

const A1C = '4548-4';
const FASTING_GLUCOSE = '1558-6';

function stableId(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 12);
}

function latest(obs: ObservationRecord[], code: string): ObservationRecord | undefined {
  return obs
    .filter((o) => o.code === code)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
}

export function glucoseRule(payload: NormalizedPatientPayload): InsightFlag[] {
  const flags: InsightFlag[] = [];

  const a1c = latest(payload.observations, A1C);
  if (a1c) {
    const v = Number(a1c.value);
    if (v >= 6.5) {
      flags.push({
        id: stableId(`a1c:${a1c.effectiveDate}:${v}`),
        severity: 'concern',
        category: 'lab',
        metric: 'A1C',
        observedValue: `${v} %`,
        message: `A1C ${v}% is in the diabetes range (≥6.5%). Discuss with your provider.`,
      });
    } else if (v >= 5.7) {
      flags.push({
        id: stableId(`a1c:${a1c.effectiveDate}:${v}`),
        severity: 'watch',
        category: 'lab',
        metric: 'A1C',
        observedValue: `${v} %`,
        message: `A1C ${v}% is in the prediabetes range (5.7-6.4%).`,
      });
    }
  }

  const glucose = latest(payload.observations, FASTING_GLUCOSE);
  if (glucose) {
    const v = Number(glucose.value);
    if (v >= 126) {
      flags.push({
        id: stableId(`glu:${glucose.effectiveDate}:${v}`),
        severity: 'concern',
        category: 'lab',
        metric: 'Fasting glucose',
        observedValue: `${v} mg/dL`,
        message: `Fasting glucose ${v} mg/dL is in the diabetes range (≥126).`,
      });
    } else if (v >= 100) {
      flags.push({
        id: stableId(`glu:${glucose.effectiveDate}:${v}`),
        severity: 'watch',
        category: 'lab',
        metric: 'Fasting glucose',
        observedValue: `${v} mg/dL`,
        message: `Fasting glucose ${v} mg/dL is in the impaired fasting glucose range (100-125).`,
      });
    }
  }

  return flags;
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
pnpm --filter @health-app/insights-rules test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/insights-rules/src/rules/glucose.ts packages/insights-rules/test/rules/glucose.test.ts
git commit -m "feat(insights-rules): add glucose/A1C rule"
```

---

### Task 17: TDD — Preventive lipid gap rule

**Files:**
- Test: `packages/insights-rules/test/rules/preventive-lipid-gap.test.ts`
- Create: `packages/insights-rules/src/rules/preventive-lipid-gap.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/insights-rules/test/rules/preventive-lipid-gap.test.ts
import { describe, it, expect } from 'vitest';
import { preventiveLipidGapRule } from '../../src/rules/preventive-lipid-gap';
import type { NormalizedPatientPayload, ObservationRecord } from '@health-app/shared-types';

function ldl(date: string, value = '92'): ObservationRecord {
  return {
    id: crypto.randomUUID(), patientId: 'p', category: 'lab',
    code: '13457-7', codeSystem: 'http://loinc.org', display: 'LDL',
    value, unit: 'mg/dL', effectiveDate: date,
    providerSource: 'particle', providerRecordId: 'x', fetchedAt: '2026-04-10T00:00:00Z',
  };
}

function payload(observations: ObservationRecord[]): NormalizedPatientPayload {
  return {
    patient: { id: 'p', firstName: 'X', lastName: 'Y', dateOfBirth: '1990-01-01', gender: 'male', externalIds: {} },
    conditions: [], medications: [], allergies: [],
    observations, encounters: [], warnings: [],
  };
}

describe('preventiveLipidGapRule', () => {
  const now = new Date('2026-04-10T00:00:00Z');

  it('flags when no lipid panel exists at all', () => {
    const flags = preventiveLipidGapRule(payload([]), now);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      severity: 'info',
      category: 'gap',
      message: expect.stringContaining('lipid panel'),
    });
  });

  it('flags when most recent LDL is older than 12 months', () => {
    const flags = preventiveLipidGapRule(payload([ldl('2024-01-01')]), now);
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe('info');
  });

  it('does not flag when most recent LDL is within 12 months', () => {
    expect(preventiveLipidGapRule(payload([ldl('2025-08-01')]), now)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm --filter @health-app/insights-rules test
```

Expected: FAIL.

- [ ] **Step 3: Write the rule**

```ts
// packages/insights-rules/src/rules/preventive-lipid-gap.ts
import { createHash } from 'crypto';
import type { InsightFlag, NormalizedPatientPayload } from '@health-app/shared-types';

const LIPID_CODES = new Set(['13457-7', '2085-9', '2093-3']); // LDL, HDL, total

function stableId(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 12);
}

export function preventiveLipidGapRule(
  payload: NormalizedPatientPayload,
  now: Date = new Date(),
): InsightFlag[] {
  const lipids = payload.observations.filter((o) => LIPID_CODES.has(o.code));

  if (lipids.length === 0) {
    return [
      {
        id: stableId('gap:lipid:never'),
        severity: 'info',
        category: 'gap',
        metric: 'Lipid panel',
        message: 'No lipid panel on record. Consider discussing annual lipid screening with your provider.',
      },
    ];
  }

  const mostRecent = lipids
    .map((o) => new Date(o.effectiveDate))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  if (mostRecent < twelveMonthsAgo) {
    const dateStr = mostRecent.toISOString().slice(0, 10);
    return [
      {
        id: stableId(`gap:lipid:${dateStr}`),
        severity: 'info',
        category: 'gap',
        metric: 'Lipid panel',
        message: `Last lipid panel was ${dateStr}. Consider scheduling an annual check.`,
      },
    ];
  }

  return [];
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
pnpm --filter @health-app/insights-rules test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/insights-rules/src/rules/preventive-lipid-gap.ts packages/insights-rules/test/rules/preventive-lipid-gap.test.ts
git commit -m "feat(insights-rules): add preventive lipid gap rule"
```

---

### Task 18: TDD — Allergy / medication contradiction rule

**Files:**
- Test: `packages/insights-rules/test/rules/allergy-medication.test.ts`
- Create: `packages/insights-rules/src/rules/allergy-medication.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/insights-rules/test/rules/allergy-medication.test.ts
import { describe, it, expect } from 'vitest';
import { allergyMedicationRule } from '../../src/rules/allergy-medication';
import type {
  AllergyRecord, MedicationRecord, NormalizedPatientPayload,
} from '@health-app/shared-types';

function allergy(substance: string): AllergyRecord {
  return {
    id: crypto.randomUUID(), patientId: 'p', substance,
    severity: 'moderate', recordedDate: '2020-01-01',
    providerSource: 'particle', providerRecordId: 'x', fetchedAt: '2026-04-10T00:00:00Z',
  };
}

function med(display: string, status: 'active' | 'stopped' = 'active'): MedicationRecord {
  return {
    id: crypto.randomUUID(), patientId: 'p',
    code: '1', codeSystem: 'rxnorm', display,
    status,
    providerSource: 'particle', providerRecordId: 'x', fetchedAt: '2026-04-10T00:00:00Z',
  };
}

function payload(allergies: AllergyRecord[], medications: MedicationRecord[]): NormalizedPatientPayload {
  return {
    patient: { id: 'p', firstName: 'X', lastName: 'Y', dateOfBirth: '1990-01-01', gender: 'male', externalIds: {} },
    conditions: [], medications, allergies,
    observations: [], encounters: [], warnings: [],
  };
}

describe('allergyMedicationRule', () => {
  it('flags an active medication whose display contains an allergen', () => {
    const flags = allergyMedicationRule(payload([allergy('Penicillin')], [med('Penicillin VK 250 mg')]));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      severity: 'concern',
      category: 'medication',
      message: expect.stringContaining('Penicillin'),
    });
  });

  it('does not flag stopped medications', () => {
    expect(
      allergyMedicationRule(payload([allergy('Penicillin')], [med('Penicillin VK', 'stopped')])),
    ).toEqual([]);
  });

  it('does not flag when no allergy matches', () => {
    expect(
      allergyMedicationRule(payload([allergy('Sulfa')], [med('Metformin 500 mg')])),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm --filter @health-app/insights-rules test
```

Expected: FAIL.

- [ ] **Step 3: Write the rule**

```ts
// packages/insights-rules/src/rules/allergy-medication.ts
import { createHash } from 'crypto';
import type { InsightFlag, NormalizedPatientPayload } from '@health-app/shared-types';

function stableId(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 12);
}

export function allergyMedicationRule(
  payload: NormalizedPatientPayload,
): InsightFlag[] {
  const flags: InsightFlag[] = [];

  for (const allergy of payload.allergies) {
    const substance = allergy.substance.trim().toLowerCase();
    if (!substance) continue;
    for (const med of payload.medications) {
      if (med.status !== 'active') continue;
      if (med.display.toLowerCase().includes(substance)) {
        flags.push({
          id: stableId(`allergy-med:${allergy.id}:${med.id}`),
          severity: 'concern',
          category: 'medication',
          metric: 'Allergy contradiction',
          message: `Active medication "${med.display}" may conflict with recorded ${allergy.substance} allergy. Confirm with your provider.`,
        });
      }
    }
  }

  return flags;
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
pnpm --filter @health-app/insights-rules test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/insights-rules/src/rules/allergy-medication.ts packages/insights-rules/test/rules/allergy-medication.test.ts
git commit -m "feat(insights-rules): add allergy/medication contradiction rule"
```

---

### Task 19: `generateFlags` runner

**Files:**
- Replace: `packages/insights-rules/src/index.ts`

- [ ] **Step 1: Replace `packages/insights-rules/src/index.ts`**

```ts
// packages/insights-rules/src/index.ts
import type { InsightFlag, NormalizedPatientPayload } from '@health-app/shared-types';
import { bloodPressureRule } from './rules/blood-pressure';
import { lipidsRule } from './rules/lipids';
import { glucoseRule } from './rules/glucose';
import { preventiveLipidGapRule } from './rules/preventive-lipid-gap';
import { allergyMedicationRule } from './rules/allergy-medication';

export type RuleFn = (
  payload: NormalizedPatientPayload,
  now?: Date,
) => InsightFlag[];

export const ALL_RULES: RuleFn[] = [
  bloodPressureRule,
  lipidsRule,
  glucoseRule,
  preventiveLipidGapRule,
  allergyMedicationRule,
];

export function generateFlags(
  payload: NormalizedPatientPayload,
  now: Date = new Date(),
): InsightFlag[] {
  const flags: InsightFlag[] = [];
  for (const rule of ALL_RULES) {
    flags.push(...rule(payload, now));
  }
  return flags;
}

export { bloodPressureRule } from './rules/blood-pressure';
export { lipidsRule } from './rules/lipids';
export { glucoseRule } from './rules/glucose';
export { preventiveLipidGapRule } from './rules/preventive-lipid-gap';
export { allergyMedicationRule } from './rules/allergy-medication';
```

- [ ] **Step 2: Build**

```bash
pnpm --filter @health-app/insights-rules build
```

Expected: clean build.

- [ ] **Step 3: Run all insights-rules tests**

```bash
pnpm --filter @health-app/insights-rules test
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/insights-rules/src/index.ts
git commit -m "feat(insights-rules): add generateFlags runner"
```

---

## Phase E — Backend entities + seed flow

### Task 20: Add clinical entities to `apps/api`

**Files:**
- Modify: `apps/api/src/patients/entities/patient.entity.ts` (add `externalIds`)
- Create: `apps/api/src/clinical/entities/condition.entity.ts`
- Create: `apps/api/src/clinical/entities/medication.entity.ts`
- Create: `apps/api/src/clinical/entities/allergy.entity.ts`
- Create: `apps/api/src/clinical/entities/observation.entity.ts`
- Create: `apps/api/src/clinical/entities/encounter.entity.ts`
- Create: `apps/api/src/clinical/clinical.module.ts`
- Modify: `apps/api/src/app.module.ts` (import `ClinicalModule`)

- [ ] **Step 1: Add `externalIds` column to the existing `Patient` entity**

Add a new column at the end of the class body (before `createdAt`):

```ts
// apps/api/src/patients/entities/patient.entity.ts — add this import
import { ExternalIds } from '@health-app/shared-types';

// and add this column inside the @Entity class
@Column({ type: 'simple-json', nullable: true })
externalIds?: ExternalIds;
```

- [ ] **Step 2: Create `apps/api/src/clinical/entities/condition.entity.ts`**

```ts
import {
  Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import type {
  AnatomyRef, ConditionClinicalStatus, ProviderSource,
} from '@health-app/shared-types';

@Entity('conditions')
export class Condition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column() code: string;
  @Column() codeSystem: string;
  @Column() display: string;
  @Column() clinicalStatus: ConditionClinicalStatus;

  @Column({ type: 'date', nullable: true })
  onsetDate?: string;

  @Column({ type: 'date' })
  recordedDate: string;

  @Column({ nullable: true })
  anatomyRef?: AnatomyRef;

  @Column() providerSource: ProviderSource;
  @Column() providerRecordId: string;
  @Column({ type: 'datetime' }) fetchedAt: string;

  @Column({ type: 'simple-json', nullable: true })
  rawSnapshot?: unknown;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 3: Create `apps/api/src/clinical/entities/medication.entity.ts`**

```ts
import {
  Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import type { MedicationStatus, ProviderSource } from '@health-app/shared-types';

@Entity('medications')
export class Medication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column() code: string;
  @Column() codeSystem: string;
  @Column() display: string;
  @Column({ nullable: true }) dosage?: string;
  @Column({ nullable: true }) frequency?: string;
  @Column() status: MedicationStatus;

  @Column({ type: 'date', nullable: true }) startDate?: string;
  @Column({ type: 'date', nullable: true }) endDate?: string;

  @Column() providerSource: ProviderSource;
  @Column() providerRecordId: string;
  @Column({ type: 'datetime' }) fetchedAt: string;

  @Column({ type: 'simple-json', nullable: true })
  rawSnapshot?: unknown;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 4: Create `apps/api/src/clinical/entities/allergy.entity.ts`**

```ts
import {
  Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import type { AllergySeverity, ProviderSource } from '@health-app/shared-types';

@Entity('allergies')
export class Allergy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column() substance: string;
  @Column({ nullable: true }) reaction?: string;
  @Column() severity: AllergySeverity;

  @Column({ type: 'date' })
  recordedDate: string;

  @Column() providerSource: ProviderSource;
  @Column() providerRecordId: string;
  @Column({ type: 'datetime' }) fetchedAt: string;

  @Column({ type: 'simple-json', nullable: true })
  rawSnapshot?: unknown;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 5: Create `apps/api/src/clinical/entities/observation.entity.ts`**

```ts
import {
  Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import type {
  AnatomyRef, ObservationCategory, ObservationInterpretation, ProviderSource,
} from '@health-app/shared-types';

@Entity('observations')
export class Observation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column() category: ObservationCategory;
  @Column() code: string;
  @Column() codeSystem: string;
  @Column() display: string;
  @Column() value: string;
  @Column({ nullable: true }) unit?: string;
  @Column({ type: 'float', nullable: true }) referenceRangeLow?: number;
  @Column({ type: 'float', nullable: true }) referenceRangeHigh?: number;
  @Column({ nullable: true }) interpretation?: ObservationInterpretation;

  @Column({ type: 'datetime' })
  effectiveDate: string;

  @Column({ nullable: true })
  anatomyRef?: AnatomyRef;

  @Column() providerSource: ProviderSource;
  @Column() providerRecordId: string;
  @Column({ type: 'datetime' }) fetchedAt: string;

  @Column({ type: 'simple-json', nullable: true })
  rawSnapshot?: unknown;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 6: Create `apps/api/src/clinical/entities/encounter.entity.ts`**

```ts
import {
  Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import type { EncounterType, ProviderSource } from '@health-app/shared-types';

@Entity('encounters')
export class Encounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column() type: EncounterType;
  @Column({ nullable: true }) reason?: string;
  @Column({ nullable: true }) providerName?: string;

  @Column({ type: 'datetime' })
  startDate: string;

  @Column({ type: 'datetime', nullable: true })
  endDate?: string;

  @Column() providerSource: ProviderSource;
  @Column() providerRecordId: string;
  @Column({ type: 'datetime' }) fetchedAt: string;

  @Column({ type: 'simple-json', nullable: true })
  rawSnapshot?: unknown;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 7: Create `apps/api/src/clinical/clinical.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Condition } from './entities/condition.entity';
import { Medication } from './entities/medication.entity';
import { Allergy } from './entities/allergy.entity';
import { Observation } from './entities/observation.entity';
import { Encounter } from './entities/encounter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Condition, Medication, Allergy, Observation, Encounter]),
  ],
  exports: [TypeOrmModule],
})
export class ClinicalModule {}
```

- [ ] **Step 8: Import `ClinicalModule` in `apps/api/src/app.module.ts`**

Add the import and include in the `imports` array:

```ts
import { ClinicalModule } from './clinical/clinical.module';
// ...
@Module({
  imports: [
    // existing imports...
    ClinicalModule,
  ],
  // ...
})
```

- [ ] **Step 9: Build and verify**

```bash
pnpm --filter @health-app/api build
```

Expected: clean build. TypeORM `synchronize: true` will create the tables on next app startup.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/patients/entities/patient.entity.ts apps/api/src/clinical apps/api/src/app.module.ts
git commit -m "feat(api): add clinical entities (condition, medication, allergy, observation, encounter)"
```

---

### Task 21: Seed service + CLI

**Files:**
- Create: `apps/api/src/seed/seed.service.ts`
- Create: `apps/api/src/seed/seed.module.ts`
- Create: `apps/api/src/seed/seed.cli.ts`

- [ ] **Step 1: Create `apps/api/src/seed/seed.service.ts`**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { normalizeBundle } from '@health-app/fhir-normalizer';
import type { FhirBundle } from '@health-app/fhir-normalizer';

import { Patient } from '../patients/entities/patient.entity';
import { Condition } from '../clinical/entities/condition.entity';
import { Medication } from '../clinical/entities/medication.entity';
import { Allergy } from '../clinical/entities/allergy.entity';
import { Observation } from '../clinical/entities/observation.entity';
import { Encounter } from '../clinical/entities/encounter.entity';

const FIXTURE_FILES = [
  'patient-sarah.json',
  'patient-carlos.json',
  'patient-mia.json',
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(Condition) private readonly conditions: Repository<Condition>,
    @InjectRepository(Medication) private readonly medications: Repository<Medication>,
    @InjectRepository(Allergy) private readonly allergies: Repository<Allergy>,
    @InjectRepository(Observation) private readonly observations: Repository<Observation>,
    @InjectRepository(Encounter) private readonly encounters: Repository<Encounter>,
  ) {}

  async seed(): Promise<void> {
    const fetchedAt = new Date().toISOString();
    const fixturesDir = resolve(process.cwd(), '../../fixtures/particle');

    await this.clear();

    for (const filename of FIXTURE_FILES) {
      const path = resolve(fixturesDir, filename);
      this.logger.log(`Loading fixture: ${path}`);
      const bundle: FhirBundle = JSON.parse(readFileSync(path, 'utf8'));
      const normalized = normalizeBundle(bundle, { source: 'particle', fetchedAt });

      if (normalized.warnings.length > 0) {
        this.logger.warn(`Warnings for ${filename}: ${JSON.stringify(normalized.warnings)}`);
      }

      await this.persistPayload(normalized);
      this.logger.log(`Seeded ${normalized.patient.firstName} ${normalized.patient.lastName}`);
    }
  }

  private async clear(): Promise<void> {
    // Order matters: clinical records reference patients.
    await this.conditions.clear();
    await this.medications.clear();
    await this.allergies.clear();
    await this.observations.clear();
    await this.encounters.clear();
    await this.patients.clear();
  }

  private async persistPayload(
    p: ReturnType<typeof normalizeBundle>,
  ): Promise<void> {
    // Patient first.
    const savedPatient = await this.patients.save(
      this.patients.create({
        id: p.patient.id,
        firstName: p.patient.firstName,
        lastName: p.patient.lastName,
        dateOfBirth: p.patient.dateOfBirth,
        gender: p.patient.gender as any,
        email: p.patient.email ?? '',
        phoneNumber: p.patient.phoneNumber ?? '',
        externalIds: p.patient.externalIds,
      }),
    );

    if (p.conditions.length) {
      await this.conditions.save(p.conditions.map((c) => ({ ...c, patientId: savedPatient.id })));
    }
    if (p.medications.length) {
      await this.medications.save(p.medications.map((m) => ({ ...m, patientId: savedPatient.id })));
    }
    if (p.allergies.length) {
      await this.allergies.save(p.allergies.map((a) => ({ ...a, patientId: savedPatient.id })));
    }
    if (p.observations.length) {
      await this.observations.save(p.observations.map((o) => ({ ...o, patientId: savedPatient.id })));
    }
    if (p.encounters.length) {
      await this.encounters.save(p.encounters.map((e) => ({ ...e, patientId: savedPatient.id })));
    }
  }
}
```

- [ ] **Step 2: Create `apps/api/src/seed/seed.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Patient } from '../patients/entities/patient.entity';
import { Condition } from '../clinical/entities/condition.entity';
import { Medication } from '../clinical/entities/medication.entity';
import { Allergy } from '../clinical/entities/allergy.entity';
import { Observation } from '../clinical/entities/observation.entity';
import { Encounter } from '../clinical/entities/encounter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, Condition, Medication, Allergy, Observation, Encounter]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
```

- [ ] **Step 3: Create `apps/api/src/seed/seed.cli.ts`**

```ts
// Usage: pnpm --filter @health-app/api seed
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const seeder = app.get(SeedService);
    await seeder.seed();
    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();
```

- [ ] **Step 4: Import `SeedModule` in `apps/api/src/app.module.ts`**

Add to imports:

```ts
import { SeedModule } from './seed/seed.module';
// ...
imports: [..., SeedModule],
```

- [ ] **Step 5: Run the seed command**

```bash
cd apps/api && pnpm seed && cd ../..
```

Expected: logs "Seeded Sarah Chen", "Seeded Carlos Rivera", "Seeded Mia Patel", then "Seeding complete."

- [ ] **Step 6: Verify rows landed in the DB**

```bash
sqlite3 apps/api/health-app.db "SELECT COUNT(*) FROM patients; SELECT COUNT(*) FROM conditions; SELECT COUNT(*) FROM observations;"
```

Expected: 3 patients, ≥4 conditions, ≥8 observations.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/seed apps/api/src/app.module.ts
git commit -m "feat(api): add seed service and CLI"
```

---

## Phase F — API endpoints

### Task 22: LLM service interface + stub implementation

**Files:**
- Create: `apps/api/src/llm/llm.service.ts`
- Create: `apps/api/src/llm/stub-llm.service.ts`
- Create: `apps/api/src/llm/llm.module.ts`

- [ ] **Step 1: Create `apps/api/src/llm/llm.service.ts`**

```ts
import type { InsightFlag, NormalizedPatientPayload } from '@health-app/shared-types';

export const LLM_SERVICE = Symbol('LLM_SERVICE');

export interface LlmService {
  narrateInsights(
    patient: NormalizedPatientPayload,
    flags: InsightFlag[],
  ): Promise<string>;

  answerQuestion(
    patient: NormalizedPatientPayload,
    question: string,
  ): Promise<string>;
}
```

- [ ] **Step 2: Create `apps/api/src/llm/stub-llm.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import type { InsightFlag, NormalizedPatientPayload } from '@health-app/shared-types';
import type { LlmService } from './llm.service';

@Injectable()
export class StubLlmService implements LlmService {
  async narrateInsights(
    patient: NormalizedPatientPayload,
    flags: InsightFlag[],
  ): Promise<string> {
    const firstName = patient.patient.firstName || 'there';

    if (flags.length === 0) {
      return `Hi ${firstName} — your record looks clean based on the data we have. Keep up your regular check-ins with your provider.`;
    }

    const concern = flags.find((f) => f.severity === 'concern');
    const watch = flags.find((f) => f.severity === 'watch');
    const top = concern ?? watch ?? flags[0];

    const lead = concern
      ? `Hi ${firstName} — there's something worth bringing up with your provider.`
      : `Hi ${firstName} — a few things are worth keeping an eye on.`;

    const body = top.observedValue
      ? `${top.metric ?? 'One metric'} is ${top.observedValue}: ${top.message}`
      : top.message;

    const tail =
      flags.length > 1
        ? ` There ${flags.length - 1 === 1 ? 'is' : 'are'} ${flags.length - 1} other item${flags.length - 1 === 1 ? '' : 's'} flagged too — see the list below.`
        : '';

    return `${lead} ${body}${tail}`;
  }

  async answerQuestion(
    patient: NormalizedPatientPayload,
    question: string,
  ): Promise<string> {
    const firstName = patient.patient.firstName || 'there';
    const conditionCount = patient.conditions.length;
    const medCount = patient.medications.filter((m) => m.status === 'active').length;
    return (
      `Thanks for the question, ${firstName}. (This is a stubbed response — ` +
      `your record currently has ${conditionCount} condition(s) and ${medCount} active medication(s).) ` +
      `I can't give medical advice; please discuss "${question}" with your provider.`
    );
  }
}
```

- [ ] **Step 3: Create `apps/api/src/llm/llm.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { LLM_SERVICE } from './llm.service';
import { StubLlmService } from './stub-llm.service';

@Module({
  providers: [
    {
      provide: LLM_SERVICE,
      useClass: StubLlmService,
    },
  ],
  exports: [LLM_SERVICE],
})
export class LlmModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/llm
git commit -m "feat(api): add llm service interface with stub implementation"
```

---

### Task 23: Dashboard service — load normalized payload from the DB

**Files:**
- Create: `apps/api/src/dashboard/dashboard.service.ts`
- Create: `apps/api/src/dashboard/dashboard.module.ts`
- Create: `apps/api/src/dashboard/dashboard.controller.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `apps/api/src/dashboard/dashboard.service.ts`**

```ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { normalizeBundle, type FhirBundle } from '@health-app/fhir-normalizer';
import type {
  AllergyRecord, ConditionRecord, EncounterRecord,
  MedicationRecord, NormalizedPatientPayload, ObservationRecord,
  PatientRecord, PatientSummary,
} from '@health-app/shared-types';

import { Patient } from '../patients/entities/patient.entity';
import { Condition } from '../clinical/entities/condition.entity';
import { Medication } from '../clinical/entities/medication.entity';
import { Allergy } from '../clinical/entities/allergy.entity';
import { Observation } from '../clinical/entities/observation.entity';
import { Encounter } from '../clinical/entities/encounter.entity';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(Condition) private readonly conditions: Repository<Condition>,
    @InjectRepository(Medication) private readonly medications: Repository<Medication>,
    @InjectRepository(Allergy) private readonly allergies: Repository<Allergy>,
    @InjectRepository(Observation) private readonly observations: Repository<Observation>,
    @InjectRepository(Encounter) private readonly encounters: Repository<Encounter>,
  ) {}

  async listPatients(): Promise<PatientSummary[]> {
    const rows = await this.patients.find({ where: { isActive: true } });
    return rows.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender as any,
    }));
  }

  async getPatientPayload(patientId: string): Promise<NormalizedPatientPayload> {
    const patient = await this.patients.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);

    const [conditions, medications, allergies, observations, encounters] = await Promise.all([
      this.conditions.find({ where: { patientId } }),
      this.medications.find({ where: { patientId } }),
      this.allergies.find({ where: { patientId } }),
      this.observations.find({ where: { patientId } }),
      this.encounters.find({ where: { patientId } }),
    ]);

    const patientRecord: PatientRecord = {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender as any,
      email: patient.email || undefined,
      phoneNumber: patient.phoneNumber || undefined,
      externalIds: patient.externalIds ?? {},
    };

    return {
      patient: patientRecord,
      conditions: conditions as unknown as ConditionRecord[],
      medications: medications as unknown as MedicationRecord[],
      allergies: allergies as unknown as AllergyRecord[],
      observations: observations as unknown as ObservationRecord[],
      encounters: encounters as unknown as EncounterRecord[],
      warnings: [],
    };
  }

  async refreshFromFixture(patientId: string): Promise<NormalizedPatientPayload> {
    const patient = await this.patients.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);

    const particleId = patient.externalIds?.particle;
    if (!particleId) throw new NotFoundException(`Patient has no particle externalId`);

    const filename = `patient-${patient.firstName.toLowerCase()}.json`;
    const path = resolve(process.cwd(), '../../fixtures/particle', filename);
    const bundle: FhirBundle = JSON.parse(readFileSync(path, 'utf8'));
    const normalized = normalizeBundle(bundle, {
      source: 'particle',
      fetchedAt: new Date().toISOString(),
    });

    this.logger.log(`Refreshed patient ${patientId} from ${filename} (${normalized.warnings.length} warnings)`);
    return this.getPatientPayload(patientId);
  }
}
```

- [ ] **Step 2: Create `apps/api/src/dashboard/dashboard.controller.ts`**

```ts
import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('patients')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'List demo patients for the dashboard switcher' })
  list() {
    return this.service.listPatients();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get the full normalized payload for a patient' })
  getOne(@Param('id') id: string) {
    return this.service.getPatientPayload(id);
  }

  @Post(':id/refresh')
  @ApiOperation({ summary: 'Re-run the normalizer against the patient fixture' })
  refresh(@Param('id') id: string) {
    return this.service.refreshFromFixture(id);
  }
}
```

- [ ] **Step 3: Create `apps/api/src/dashboard/dashboard.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Patient } from '../patients/entities/patient.entity';
import { Condition } from '../clinical/entities/condition.entity';
import { Medication } from '../clinical/entities/medication.entity';
import { Allergy } from '../clinical/entities/allergy.entity';
import { Observation } from '../clinical/entities/observation.entity';
import { Encounter } from '../clinical/entities/encounter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, Condition, Medication, Allergy, Observation, Encounter]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
```

- [ ] **Step 4: Register `DashboardModule` in `apps/api/src/app.module.ts`**

Add to imports:

```ts
import { DashboardModule } from './dashboard/dashboard.module';
// ...
imports: [..., DashboardModule],
```

- [ ] **Step 5: Start the api, verify the endpoints**

```bash
pnpm --filter @health-app/api dev
# in another terminal:
curl -s http://localhost:3000/api/v1/patients | jq 'length'
```

Expected: `3`.

```bash
PID=$(curl -s http://localhost:3000/api/v1/patients | jq -r '.[0].id')
curl -s "http://localhost:3000/api/v1/patients/$PID" | jq '{patient: .patient.firstName, conditionCount: (.conditions|length)}'
```

Expected: JSON with the patient's first name and a condition count.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/dashboard apps/api/src/app.module.ts
git commit -m "feat(api): add dashboard service and controller"
```

---

### Task 24: Insights controller — `/insights` and `/ask`

**Files:**
- Create: `apps/api/src/dashboard/insights.service.ts`
- Create: `apps/api/src/dashboard/insights.controller.ts`
- Modify: `apps/api/src/dashboard/dashboard.module.ts`

- [ ] **Step 1: Create `apps/api/src/dashboard/insights.service.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { generateFlags } from '@health-app/insights-rules';
import type { InsightFlag, InsightsResponse } from '@health-app/shared-types';
import { DashboardService } from './dashboard.service';
import { LLM_SERVICE, LlmService } from '../llm/llm.service';

@Injectable()
export class InsightsService {
  constructor(
    private readonly dashboard: DashboardService,
    @Inject(LLM_SERVICE) private readonly llm: LlmService,
  ) {}

  async getInsights(patientId: string): Promise<InsightsResponse> {
    const payload = await this.dashboard.getPatientPayload(patientId);
    const flags: InsightFlag[] = generateFlags(payload);
    const narration = await this.llm.narrateInsights(payload, flags);
    return { flags, narration };
  }

  async ask(patientId: string, question: string): Promise<{ answer: string }> {
    const payload = await this.dashboard.getPatientPayload(patientId);
    const answer = await this.llm.answerQuestion(payload, question);
    return { answer };
  }
}
```

- [ ] **Step 2: Create `apps/api/src/dashboard/insights.controller.ts`**

```ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { InsightsService } from './insights.service';

class AskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question: string;
}

@ApiTags('insights')
@Controller('patients')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get(':id/insights')
  @ApiOperation({ summary: 'Get deterministic insights + narration for a patient' })
  getInsights(@Param('id') id: string) {
    return this.insights.getInsights(id);
  }

  @Post(':id/ask')
  @ApiOperation({ summary: 'Single-shot Q&A against the patient record' })
  ask(@Param('id') id: string, @Body() dto: AskDto) {
    return this.insights.ask(id, dto.question);
  }
}
```

- [ ] **Step 3: Update `apps/api/src/dashboard/dashboard.module.ts` — add insights provider/controller + import LlmModule**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { LlmModule } from '../llm/llm.module';
import { Patient } from '../patients/entities/patient.entity';
import { Condition } from '../clinical/entities/condition.entity';
import { Medication } from '../clinical/entities/medication.entity';
import { Allergy } from '../clinical/entities/allergy.entity';
import { Observation } from '../clinical/entities/observation.entity';
import { Encounter } from '../clinical/entities/encounter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, Condition, Medication, Allergy, Observation, Encounter]),
    LlmModule,
  ],
  controllers: [DashboardController, InsightsController],
  providers: [DashboardService, InsightsService],
  exports: [DashboardService, InsightsService],
})
export class DashboardModule {}
```

- [ ] **Step 4: Register `LlmModule` in `app.module.ts` (if not already via dashboard)**

The `LlmModule` is already imported into `DashboardModule` (Step 3) so no change to `app.module.ts` is needed. Skip if already present.

- [ ] **Step 5: Verify the endpoints**

```bash
pnpm --filter @health-app/api dev
# in another terminal:
PID=$(curl -s http://localhost:3000/api/v1/patients | jq -r '.[] | select(.firstName=="Carlos") | .id')
curl -s "http://localhost:3000/api/v1/patients/$PID/insights" | jq '{flagCount: (.flags|length), narration}'
curl -s -X POST "http://localhost:3000/api/v1/patients/$PID/ask" \
  -H 'Content-Type: application/json' \
  -d '{"question":"Should I worry about my LDL?"}' | jq
```

Expected: Carlos's insights include LDL, A1C, and BP flags; narration is a 1-2 sentence stub string. `/ask` returns a `{ answer: "…" }` stub.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/dashboard/insights.service.ts apps/api/src/dashboard/insights.controller.ts apps/api/src/dashboard/dashboard.module.ts
git commit -m "feat(api): add insights and ask endpoints"
```

---

## Phase G — End-to-end verification

### Task 25: E2E tests for the dashboard + insights endpoints

**Files:**
- Create: `apps/api/test/jest-e2e.config.js`
- Create: `apps/api/test/dashboard.e2e-spec.ts`
- Create: `apps/api/test/tsconfig.json`

- [ ] **Step 1: Create `apps/api/test/jest-e2e.config.js`**

```js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
};
```

- [ ] **Step 2: Create `apps/api/test/tsconfig.json`**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "rootDir": "..",
    "baseUrl": ".."
  },
  "include": ["./**/*.ts", "../src/**/*.ts"]
}
```

- [ ] **Step 3: Write the e2e test**

```ts
// apps/api/test/dashboard.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SeedService } from '../src/seed/seed.service';

describe('Dashboard e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Seed once for the whole suite.
    const seeder = app.get(SeedService);
    await seeder.seed();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/patients returns three demo patients', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/patients').expect(200);
    const names = res.body.map((p: any) => p.firstName).sort();
    expect(names).toEqual(['Carlos', 'Mia', 'Sarah']);
  });

  it('GET /api/v1/patients/:id returns a full normalized payload for Carlos', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/patients');
    const carlos = list.body.find((p: any) => p.firstName === 'Carlos');

    const res = await request(app.getHttpServer())
      .get(`/api/v1/patients/${carlos.id}`)
      .expect(200);

    expect(res.body.patient.firstName).toBe('Carlos');
    expect(res.body.conditions.length).toBeGreaterThanOrEqual(3);
    expect(res.body.medications.length).toBeGreaterThanOrEqual(3);
    expect(res.body.observations.length).toBeGreaterThanOrEqual(4);
  });

  it('GET /api/v1/patients/:id/insights surfaces LDL, A1C, and BP flags for Carlos', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/patients');
    const carlos = list.body.find((p: any) => p.firstName === 'Carlos');

    const res = await request(app.getHttpServer())
      .get(`/api/v1/patients/${carlos.id}/insights`)
      .expect(200);

    const metrics = res.body.flags.map((f: any) => f.metric);
    expect(metrics).toEqual(expect.arrayContaining(['LDL', 'A1C', 'Blood pressure']));
    expect(typeof res.body.narration).toBe('string');
    expect(res.body.narration.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/patients/:id/ask returns a stub answer', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/patients');
    const sarah = list.body.find((p: any) => p.firstName === 'Sarah');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/patients/${sarah.id}/ask`)
      .send({ question: 'Should I get a flu shot?' })
      .expect(201);

    expect(typeof res.body.answer).toBe('string');
    expect(res.body.answer).toContain('Sarah');
  });

  it('POST /api/v1/patients/:id/ask rejects an empty question', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/patients');
    const sarah = list.body.find((p: any) => p.firstName === 'Sarah');

    await request(app.getHttpServer())
      .post(`/api/v1/patients/${sarah.id}/ask`)
      .send({ question: '' })
      .expect(400);
  });

  it('GET /api/v1/patients/:id returns 404 for an unknown id', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/patients/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });
});
```

- [ ] **Step 4: Run the e2e suite**

```bash
pnpm --filter @health-app/api test:e2e
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full workspace test pipeline to confirm nothing regressed**

```bash
pnpm test
```

Expected: all three test runs (fhir-normalizer, insights-rules, apps/api e2e) PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/test
git commit -m "test(api): add dashboard e2e tests"
```

---

### Task 26: Smoke-test the Swagger docs and hand off to the frontend plan

**Files:** none modified

- [ ] **Step 1: Start the api**

```bash
pnpm --filter @health-app/api dev
```

- [ ] **Step 2: Open Swagger in a browser**

Open: `http://localhost:3000/api/docs`

Expected: the `dashboard` and `insights` tags appear alongside the existing particle/redox/wearables tags, with all five new endpoints listed and callable from the UI.

- [ ] **Step 3: Execute each new endpoint from the Swagger UI once**

- `GET /api/v1/patients` — returns 3 patients.
- `GET /api/v1/patients/{id}` — returns the full payload for whichever ID you paste in.
- `GET /api/v1/patients/{id}/insights` — returns flags + narration.
- `POST /api/v1/patients/{id}/ask` — with body `{"question":"How am I doing?"}` — returns an answer.
- `POST /api/v1/patients/{id}/refresh` — returns a freshly normalized payload.

- [ ] **Step 4: Stop the api and write a one-line note in the plan file**

Append a final line at the bottom of this plan:

```markdown
**Status:** Backend plan complete. Frontend plan tracked in `2026-04-10-health-dashboard-frontend.md`.
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-04-10-health-dashboard-backend.md
git commit -m "docs(plan): mark backend plan complete"
```

---

## Out of scope for this plan

Deliberately deferred. Tracked here so reviewers don't look for them.

- Frontend (`apps/web`) — separate plan
- Real Anthropic LLM implementation (stub only)
- Writing data back to Particle
- Cross-provider deduplication
- Authentication
- Live Particle API calls at runtime (fixtures only)
- The 3D body visualization UI
