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

projectForPartner(state: Readonly<PartnerReadableState>, today: ISODate): PartnerProjection
// The ONLY source for the BroCode preview. PartnerReadableState IS the allowlist:
// the function cannot read check-ins, reviews, moods, notes or Brain items because
// they are not in the shape it accepts. AppState satisfies it structurally, so
// callers still just hand it the store. privacy.test.ts proves nothing leaks.
// `today` is a parameter rather than a clock read, so the projection stays pure
// and "a signal from yesterday is ignored" is testable.

askAI(intent: AIIntent, context: AIContext): Promise<AIResponse>
setAIDelay(ms: number): void          // tests set 0; app uses 600 + seeded * 300
```

## Milestones

**M1 Core loop — done.** app shell, design tokens, skippable onboarding, Today, morning
check-in, "I'm overwhelmed" sheet, Brain capture, AI task breakdown, floating AI helper.
Domain: `types`, `capacity`, `date`, `buildDayPlan`. Mock: seeded RNG, 90-day history,
Mia's seed with "Call insurance" at `postponeCount: 3`. Tests: copy banned words,
`buildDayPlan` across all four levels, seed determinism.

**M2 Differentiators — done.** Patterns (four computed insights with "Why am I
seeing this?"), Partner privacy setup with a pinned live preview, BroCode preview,
Decision load, Privacy overview. Added `insights.ts`, `projectForPartner.ts`,
`MiniChart.tsx`, `Toggle.tsx`, `insights.test.ts`, `privacy.test.ts`, and the
Patterns and Me tabs. 45 tests.

Five things ended up different from the M2 sketch, and M3 should start from these:

- `projectForPartner` takes `(state, today)`, as above.
- The cycle insight compares a **±3-day window around today's cycle day** against
  the rest of the cycle, not fixed 7-day blocks. Blocks split the planted 17-24
  window across two of them, so the chart contradicted its own sentence. It says
  "about the same" instead of "higher" when the window is not higher, so the copy
  cannot overclaim.
- `ChartSpec` has **no `line` variant**. Nothing produced one once the cycle chart
  became a bar comparison. Reintroduce it if the M3 Cycle timeline needs it.
- BroCode gates all content on `hasSharedToday`, so the default really is an empty
  screen. Standing decision-load rules would otherwise be noise with nothing shared.
- The floating AI helper appears on Today and Brain only. On Patterns it covered
  the cards and its prompts were Today-shaped.

**M3 Completeness — next.** Calendar agenda with "Plan around this", Cycle, Daily
review, Notification settings, polish. The tab bar grows to its final five when
Calendar lands; Cycle and Notifications join the Me list then.

## End-of-milestone checklist

1. `npm run typecheck` · `npm run test` · `npm run build` · `npm run shots`
2. Look at every screenshot; fix overflow, clipped text, tap targets under 48px
3. Reload the app and confirm state persists
4. Commit; stop with a summary of at most 5 lines
