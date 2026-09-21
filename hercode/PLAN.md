# HerCode: build plan

Approved architecture for the prototype. Rules live in CLAUDE.md, product in SPEC.md.
This file records the agreed shape so each milestone can be picked up cold.

## Decisions taken

- Lives in `SupaMoi-ai/claud-tester` under `hercode/`, so it does not collide with the
  repo's existing root `index.html` / GitHub Pages deploy.
- M1 ships a **two-tab bar (Today, Brain)** that grows to five tabs in M2/M3. CLAUDE.md
  forbids empty placeholder screens, so a tab appears only when its screen is real.
- Fonts (Fraunces, Inter) are self-hosted via `@fontsource`, so there is no runtime
  font fetch and the prototype works offline.
- `projectForPartner` and `insights` ship in M2, but their signatures are fixed now so
  the M1 store and `HistoryEvent` shape are already correct for them.

## Folder structure

```
hercode/
  CLAUDE.md  SPEC.md  PLAN.md
  index.html  vite.config.ts  tailwind.config.ts  postcss.config.js
  vitest.config.ts  playwright.config.ts  tsconfig.json  package.json
  screenshots/                 # shots output, gitignored
  src/
    main.tsx  App.tsx  index.css     # design tokens as CSS vars + Tailwind theme
    copy.ts                          # every user-facing string
    components/                      # Card, Chip, Sheet, TaskRow, CapacityPicker,
                                     #   PhoneFrame, TabBar, Shimmer, ...
    features/
      today/  brain/  onboarding/  ai/                  # M1
      calendar/  patterns/  cycle/  partner/  review/   # M2 / M3
    domain/  types.ts  capacity.ts  date.ts  buildDayPlan.ts
             insights.ts  projectForPartner.ts
    mock/    rng.ts  seed.ts  mockAI.ts
    store/   useHerCode.ts
    test/    copy.test.ts  buildDayPlan.test.ts  seed.test.ts
             insights.test.ts  privacy.test.ts
```

Enforced rule: logic lives in pure `/domain` functions, UI only renders their results.
No date maths, capacity rules or filtering inside a component.

## Component tree (M1)

```
App
└─ PhoneFrame                430px centered on desktop, full-bleed + safe-area on phone
   ├─ OnboardingFlow         5 steps, skippable, "Use demo (Mia)" on step 1
   ├─ MorningCheckInSheet    full-screen, first open each day, Skip allowed
   ├─ TodayScreen            Greeting · ContextStrip(Energy|Brain|Capacity)
   │                         · Today's 3 (TaskRow) · Everything else (collapsed)
   │                         · "I'm overwhelmed"
   ├─ BrainScreen            CaptureInput (text + simulated voice) · Shimmer
   │                         · draft CategoryCards (approve / edit) · sections · search
   ├─ AIHelperButton         floating, quick prompts change by screen → AISheet
   │                         → BreakdownView (steps, easier / 5-minute / do later)
   ├─ OverwhelmSheet         "How much can you handle right now?" → 4 levels → re-plan
   └─ TabBar                 Today · Brain
```

## Store

One Zustand store, `persist` key `hercode-v1`, `version: 1`.

```
profile        { name, onboarded, helpWith[], overwhelmStyle, cycleConsent,
                 partnerConnected, partnerName }
tasks          Task[]
brainItems     BrainItem[]
checkIns       Record<ISODate, CheckIn>
reviews        Record<ISODate, Review>
cycleLogs      CycleLog[]
capacityByDay  Record<ISODate, CapacityLevel>     // capacity is stored per day
sharing        SharingSettings                    // per-category toggles, cycleDetail off
partnerSignal  { value, date } | null             // expires at end of day
decisionRules  DecisionRule[]
history        HistoryEvent[]                     // append-only, feeds Patterns
notifications  { level }
ui             { activeTab, sheet, checkInSeenFor, ... }   // not persisted
```

Every meaningful mutation appends a `HistoryEvent` carrying `capacityAtTime` through one
internal `record()` helper, so Patterns is computed from real events and never faked.
`partialize` drops `ui`; rehydration expires a stale `partnerSignal`.

## Signatures (fixed)

```ts
buildDayPlan(tasks: Task[], capacity: CapacityLevel, checkIn?: CheckIn | null): DayPlan
// DayPlan { capacity, fixed, essentials, primary, stretch, everythingElse,
//           message, suppressedReminderIds } — nothing is ever deleted

type InsightResult =
  | { status: 'ok'; id: InsightId; text: string;
      evidenceRows: EvidenceRow[]; sampleSize: number; chart: ChartSpec }
  | { status: 'insufficient'; id: InsightId; sampleSize: number }

callsBeforeNoon(input: InsightInput): InsightResult
capacityAfterSocialEvenings(input: InsightInput): InsightResult
energyAroundCyclePhase(input: InsightInput): InsightResult
steppedHouseholdCompletion(input: InsightInput): InsightResult
buildInsights(input: InsightInput): InsightResult[]

projectForPartner(state: Readonly<AppState>): PartnerProjection
// the ONLY source for the BroCode preview; reads a strict allowlist of fields,
// and privacy.test.ts asserts no private / cycle / health / mood / note value leaks

askAI(intent: AIIntent, context: AIContext): Promise<AIResponse>
setAIDelay(ms: number): void          // tests set 0; app uses 600 + seeded * 300
```

## Milestones

**M1 Core loop** — app shell, design tokens, skippable onboarding, Today, morning
check-in, "I'm overwhelmed" sheet, Brain capture, AI task breakdown, floating AI helper.
Domain: `types`, `capacity`, `date`, `buildDayPlan`. Mock: seeded RNG, 90-day history,
Mia's seed with "Call insurance" at `postponeCount: 3`. Tests: copy banned words,
`buildDayPlan` across all four levels, seed determinism.

**M2 Differentiators** — Patterns (four computed insights with "Why am I seeing this?"),
Partner privacy setup with live preview, BroCode preview, Decision load. Adds
`insights.ts`, `projectForPartner.ts`, `privacy.test.ts`, `insights.test.ts`, and the
Calendar/Patterns/Me tabs.

**M3 Completeness** — Calendar agenda with "Plan around this", Cycle, Daily review,
Notification settings, polish.

## End-of-milestone checklist

1. `npm run typecheck` · `npm run test` · `npm run build` · `npm run shots`
2. Look at every screenshot; fix overflow, clipped text, tap targets under 48px
3. Reload the app and confirm state persists
4. Commit; stop with a summary of at most 5 lines
