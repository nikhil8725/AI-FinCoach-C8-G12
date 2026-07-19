# FinCoach AI — project notes for Claude Code

Hackathon project: upload financial documents → 4 parallel LangGraph agents analyze them →
dashboard, debt payoff planner, savings planner, budget advisor, RAG-grounded coach chat.

Source-of-truth documents (read these before making architectural changes):
- `02_CLAUDE_CODE_BUILD_PROMPT.md` — full architecture/backend/API spec.
- `FinCoach AI (standalone).html` — Claude-Design export. It's a JS "bundler" page; the real
  markup lives inside a JSON-encoded `<script type="__bundler/template">` string, not in plain
  HTML. The design is a **light** theme (background `#F5F6F8`, orange `#FF6B35` accent, one dark
  surface at `#0F1420` for the orchestration activity log) — this overrides the build prompt's
  "dark navy" prose, which is stale.
- The approved build plan lives at `C:\Users\jigar.chauhan\.claude\plans\https-claude-ai-design-p-92471218-c1ce-4-vast-clover.md`.

## Stack

- Backend: Python 3.11+, FastAPI, LangGraph, SQLAlchemy 2.0 (SQLite), ChromaDB (default
  embedding function — no sentence-transformers/torch), OpenRouter via `openai` SDK.
- Frontend: React 19 + Vite + TypeScript + **Tailwind v4** (CSS-first config via `@theme` in
  `index.css` — no `tailwind.config.ts`), React Router, Recharts, lucide-react.
- Frontend lint: **oxlint** (Vite's current default), not eslint — same purpose (dead code /
  unused-import detection), matches what `npm create vite` ships today.

## Design tokens

See `frontend/src/theme/tokens.ts` (JS/chart access) and the `@theme` block in
`frontend/src/index.css` (Tailwind utilities) — these two must stay in sync manually since
Tailwind v4 tokens are CSS custom properties, not importable into TS.

Agent colors: data=`#3B82F6` (blue), debt=`#EF4444` (red), savings=`#10B981` (green),
budget=`#FF6B35` (orange). These are used consistently for AgentTag pills, orchestration nodes,
chat message tags, and the needs/wants/savings budget bars.

## Running locally

Backend:
```
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload
```
Copy `.env.example` to `backend/.env` and set `OPENROUTER_API_KEY` before running agent/chat
features (the app boots and serves `/api/health` without it).

Frontend:
```
cd frontend
npm run dev
```
`frontend/.env` points `VITE_API_BASE` at `http://localhost:8000/api` — not secret, committed.

## Conventions

- Financial math (`backend/app/finance/`) is pure Python, unit-tested, and LLMs never touch it —
  agents call it and only narrate the results. Don't let an LLM compute a number anywhere.
- The only sanctioned SQL surface for the coach chat is `backend/app/rag/retriever.py`'s helper
  functions — never let an LLM write raw SQL.
- One `navConfig.ts` (`frontend/src/components/layout/navConfig.ts`) drives the sidebar, bottom
  tab bar, and mobile "More" sheet — don't duplicate route/label lists elsewhere.
- `DataTable` (`frontend/src/components/ui/DataTable.tsx`) is the one responsive table component
  (real `<table>` ≥768px, row-cards below) — reuse it rather than building per-page tables.
- No dead code, no `TODO`/stub routes committed to the final state — build order follows the
  plan's 9 milestones and each one should leave the app runnable end-to-end.
- **Deviation from the build prompt's literal wording**: column-mapping/categorization/debt
  extraction happen at upload time (`app/api/documents.py`), not inside the graph's `data_agent`
  node. The design's flow uploads and confirms parsing *before* "Run analysis" is clicked, so
  parsing at analyze-time would be redundant and would hide parse failures until the analysis
  run. The graph's `data_agent` (`app/agents/data_agent.py`) instead aggregates already-persisted
  transactions/debts into the `transactions_summary` every other agent reads.
- Emergency Fund "current" amount is seeded from the latest bank-statement running balance
  (`Transaction.balance_after`, tracked via `ColumnMapping.balance_column`) — there's no
  dedicated savings-account document in the sample data, so this is the most defensible proxy
  for liquid savings. It's tracked as a normal `Goal` row named "Emergency Fund".

## Status

Build in progress, following the plan's milestone order. Update this section as milestones land.

- [x] Milestone 1 — skeleton (backend config/db/models, `/api/health`; frontend Vite+Tailwind
      scaffold, design tokens, routing, AppShell/Sidebar/BottomTabBar/MoreSheet, page stubs).
- [x] Milestone 2 — ingestion (sample data generator, parser, normalizer with LLM+rule-based
      fallback, documents API, Onboarding + Documents pages). Verified end-to-end over HTTP.
- [x] Milestone 3 — finance core (`debt_math.py`, `metrics.py`, 17 passing tests, ruff clean).
- [x] Milestone 4 — agent graph (`data_agent → [debt|savings|budget]_agent → synthesizer`) +
      `POST /api/analyze` SSE endpoint. Verified end-to-end against sample data (rule-based
      fallback path, no API key set): 245 txns/2 debts loaded, health score 63/100, 5 insights +
      an Emergency Fund goal + 7 budget caps persisted correctly.
- [x] Milestone 5 — `GET /api/dashboard`, `/api/transactions`, `/api/debt/plan`; Orchestration
      page (real SSE consumption + auto-navigate to dashboard on completion), Dashboard page
      (all rows wired to live data), Debt Planner page (strategy toggle + slider, live-recomputed
      schedule, chart, narrative). Verified visually with Playwright screenshots against real
      sample data — zero console errors, numbers cross-checked against the API responses.
- [x] Milestone 6 — `rag/indexer.py` (Chroma, default embedding fn, doc-summary + header-prefixed
      txn-window chunks), `rag/retriever.py` (sanctioned SQL helpers), `agents/coach.py`
      (router → retrieve → grounded answer with citations), `POST /api/chat` SSE +
      `GET /api/chat/messages`, full chat UI with citation slide-over/sheet. `test_injection.py`
      passes. Found and fixed a real bug during verification: `llm.stream_text` had no error
      handling (unlike `call_structured`), so the chat endpoint 500'd whenever the LLM was
      unreachable — added the same retry/fallback pattern used elsewhere, now degrades to a
      friendly message. Also fixed a duplicate-loading-indicator UI bug (empty message bubble +
      separate typing dots rendered at once) found via Playwright screenshot.
- [x] Milestone 7 — `GET /api/savings` (+ goal CRUD, reallocation suggestions recomputed live
      from current category spend — no new table, per the plan's scope cut), `GET /api/budget`
      (+ `PATCH /api/budget/caps/{category}`). Savings page (emergency fund hero + runway ring,
      goals list, add-goal modal/sheet, reallocation accept/dismiss as client-side-only per plan),
      Budget page (50/30/20 stacked bars, live-editable category caps, subscription alerts).
      Verified visually with Playwright — modal/backdrop opacity looked wrong in one screenshot
      but was just an animation-timing artifact in the test script, not a real bug (confirmed by
      re-screenshotting after the `fc-in` transition settles).
- [x] Milestone 8 — responsive pass. Verified with Playwright at 390×844 (mobile), 820×1180
      (tablet), and desktop. Found and fixed real bugs (not just polish):
      1. Genuine horizontal page overflow on mobile dashboard — a flex/grid-item chain was
         missing `min-w-0`, so a legend row's content (not the CashFlowChart, which was a red
         herring — its own `overflow-x-auto` was already working correctly) forced the whole
         page 16px wider than the viewport. Root-caused by walking the ancestor chain in a
         headless-browser script rather than guessing from the screenshot.
      2. Category-split legend truncated to single letters on mobile ("R.", "E.", "S.") — donut
         + legend now stack vertically below `sm:`.
      3. `DataTable`'s mobile row-card mode always wrapped rows in a `<button>`, which is invalid
         HTML once a row contains its own interactive control (the Budget page's cap `<input>`)
         — changed to a plain `<div>` with `role="button"` only when `onRowClick` is actually used.
      4. Budget page's category table was a hand-rolled `<table>`, not the shared `DataTable` —
         the build prompt explicitly lists budget tables as a required `DataTable` consumer.
      5. Coach Chat's fixed-height calc (`100dvh - 150px`, copied from the desktop-only design
         mock) didn't account for the mobile bottom tab bar's reserved space, so the input and
         trust footer were hidden behind the tab bar — fixed with a responsive height split
         (mobile subtracts more) rather than a single magic number.
      Also added: touch-friendly (28px) custom slider thumb styling, a `useKeyboardOpen` hook
      that hides the bottom tab bar when the on-screen keyboard is open.
      **Lesson for next time**: several apparent bugs in `fullPage: true` Playwright screenshots
      (fixed bottom nav appearing mid-page, overlapping content) were pure screenshot-stitching
      artifacts, not real bugs — verified by re-checking with viewport-only (non-fullPage)
      screenshots before "fixing" anything. Always cross-check a suspicious fullPage capture
      against a viewport screenshot before treating it as a real layout bug.
- [x] Milestone 9 — polish. Removed leftover Vite template `frontend/README.md` and default
      favicon reference (replaced with an on-brand inline SVG favicon). Grepped the whole repo
      for `TODO`/`FIXME`/`console.log`/dead `pass` blocks — clean (the one `pass` found is
      SQLAlchemy's `class Base(DeclarativeBase): pass`, a real, required pattern). Verified every
      component file and backend module is actually imported somewhere — no orphaned files.
      Confirmed `npm run build` succeeds (production build; single ~730KB chunk — acceptable for
      a hackathon scope, not worth route-splitting complexity here). Wrote the full README
      (mermaid architecture diagram, model-routing table, "Python computes / LLM narrates"
      section, tabular-RAG + injection-defense writeup, responsive-design summary, scripted
      2-minute demo walkthrough, 60-second setup). Ran a full fresh-state end-to-end pass hitting
      every one of the 8 API routers (health, documents, analyze, dashboard, debt, savings,
      budget, chat) — all 200s. Confirmed `.gitignore` correctly excludes `backend/.env`,
      `fincoach.db`, `logs/*.jsonl`, `chroma_data/*`, `uploads/*`, `node_modules`, `dist`.
      Full backend suite: 22/22 tests passing, `ruff check` + `ruff format --check` clean.
      Frontend: `tsc -b --noEmit` and `oxlint` clean.

- [x] Post-launch addition — time-range selector, console logging, RAG-verification tooling.
      Requested after the initial 9-milestone build shipped, in response to real usage questions
      ("can I see 3/6/12 months of data", "can I watch what each agent is doing", "how do I know
      chunking/embedding/vector-search actually work").
      1. **Time-range filtering.** `backend/app/finance/metrics.py` gained window-aware
         aggregation functions (`last_n_months`, `window_income`, `window_spend`,
         `window_category_split`, `window_needs_wants_savings_split`, `window_cashflow_series`,
         plus a public `month_key` formatter). `GET /api/dashboard` and `GET /api/budget` (+ the
         budget cap `PATCH`) now take `period: "1m"|"3m"|"6m"|"12m"`, default `"1m"`. **"1m" /
         "Latest month" means the latest month present in the transaction data, not today's real
         calendar month** — the sample data is historical, so "current month" would be empty.
         `12m` gracefully caps at however many months of data actually exist (the sample dataset
         only has ~6). Frontend: `frontend/src/components/ui/RangeSelector.tsx` (pill segmented
         control, same visual language as the Debt Planner's avalanche/snowball toggle) is wired
         into `DashboardPage` and `BudgetPage`; both pages' `useApi` calls depend on `[period]` and
         re-fetch on change. Verified correct via curl across all 4 period values (category totals
         scale with window size) and visually via Playwright (KPIs/chart/table header all update
         correctly on click).
      2. **Console logging.** New `backend/app/logging_config.py` sets up a `fincoach.*` logger
         tree writing to stdout, with a Windows-specific `sys.stdout.reconfigure(encoding="utf-8",
         errors="replace")` fix (without it, printing ₹ crashes the process on Windows consoles).
         Every agent (`data_agent`, `debt_agent`, `savings_agent`, `budget_agent`, `synthesizer`),
         `coach.py` (intent routing, retrieval, citation resolution), `api/chat.py`, and
         `api/analysis.py` now log their key steps and computed values at `INFO` level — so running
         `uvicorn app.main:app --reload` in a visible terminal shows each agent's work live during
         an analyze run or chat turn.
      3. **RAG verification.** `rag/indexer.py` now logs Chroma collection init (embedding fn name
         + existing chunk count), every chunk created (with its header line) during indexing, and
         every retrieval query (query text, collection size, or an explicit warning if the
         collection is empty). `coach.py`'s `retrieve_context` logs each vector hit as
         `[n] distance=%.3f (lower=closer) type=... source=... section=... row_ids=...`. Fixed a
         real bug found while adding this: the retrieval dict previously exposed a `"score": 1 -
         distance` field, but Chroma's default embedding function uses **L2 (unbounded) distance**,
         so `1 - distance` produced misleading negative numbers. Renamed to `"distance"` (raw,
         unmodified) and relabeled the log line accordingly — `distance` is the only field to trust
         here, lower is more similar, and there's no fixed upper bound. To verify RAG end-to-end
         yourself: load sample data, run analysis, ask the coach a question, and watch for (a) a
         `fincoach.rag.indexer` line confirming the Chroma collection is populated, (b) per-chunk
         `distance=` lines showing which real chunks were retrieved, and (c) the answer's citation
         chips matching those chunks' sources.
      4. **Dev CORS robustness fix.** `backend/app/main.py` previously allowed exactly one origin
         (`settings.cors_origin`, default `http://localhost:5173`). Discovered while testing that
         binding Vite to `127.0.0.1` explicitly (or any dev tool hitting the frontend via
         `127.0.0.1` instead of `localhost`) got silently CORS-blocked even though both addresses
         are the same machine. Fixed by auto-adding the `localhost`/`127.0.0.1` counterpart of
         whatever `cors_origin` is configured, so both loopback spellings work without needing two
         env vars. Backward compatible — `.env` still only needs one `CORS_ORIGIN` value.
      All 22 backend tests still pass; no schema/migration changes (no new tables, only new query
      params and log lines).
- [x] Post-launch fix — coach chat gave unhelpful "I don't know" answers to plain questions like
      "where did I overspend last month?" and "what was my last month spending?". Root-caused via
      the new logging above (real, not simulated bug reports from the user). Two real gaps in
      `app/agents/coach.py`'s `retrieve_context`/`build_answer_prompt`, both fixed in
      `app/rag/retriever.py` + `coach.py`:
      1. The `budget` intent's SQL-aggregate source called `spend_by_category(db)` with no month
         filter, returning an all-time total the model correctly refused to attribute to "last
         month". Added `retriever.recent_months(db, n=2)` and now query the 2 most recent months
         explicitly, each source labeled with its month ("this month / latest month" vs "last
         month / previous month").
      2. The system prompt never told the model that this app's data is historical and "last
         month"/"this month" means the most recent month *present in the data*, not tied to
         today's real date (same convention `RangeSelector` already uses) — added that as an
         explicit instruction in `build_answer_prompt`.
      3. Found a third, bigger gap while verifying the first two: "overspend" questions need a
         cap comparison, and the coach never queried `BudgetCap` at all — it only had raw
         category totals, so it always said "I don't have budget limit data" even though the
         Budget page's cap table is sitting right there in the same database. Added
         `retriever.budget_cap_status(db, month)` (same over/warning/ok thresholds as
         `api/budget.py`'s `_cap_status`) and wired it into the budget intent for both recent
         months, labeled to make clear the cap is a standing monthly target, not one-month-only
         data (`BudgetCap` has no month column). Verified end-to-end via curl against the live
         chat endpoint: the coach now correctly names the exact 3 over-cap categories for "last
         month" with the right ₹ figures and citations.
      All 22 tests still pass; no schema changes (reused the existing `BudgetCap` table).

## Status: feature-complete

All 9 build-order milestones are done and verified end-to-end (API smoke tests + Playwright
screenshots at desktop/tablet/mobile), plus the post-launch time-range/logging/RAG-verification
addition above. The app is ready for the demo script in README.md. If you pick this up again:
check `git log`/`git diff` first since this file may be stale relative to any further changes —
this status block reflects the state as of the last coding session, not necessarily "right now."
