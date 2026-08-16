---
description: Read a ticket from Asana/Confluence, run the Playwright test planner, then generate behavioral + design-token test cases.
argument-hint: <asana-url-or-id> and/or <confluence-url> [url=<app-url>] [seed=tests/seed.spec.ts] [figma=<figma-design-url>]
allowed-tools: Task, ToolSearch, Read, Write, Edit, Glob, Grep, Bash, mcp__claude_ai_Asana__get_task, mcp__claude_ai_Asana__get_task_stories, mcp__claude_ai_Asana__get_attachments, mcp__claude_ai_Asana__search_tasks
---

You are running the **ticket → test plan → test cases** pipeline. Follow these phases in order. Do not skip the confirmation gate before generating tests.

## Inputs

Raw arguments: `$ARGUMENTS`

Parse them into:
- **asanaRef** — an Asana task URL (`https://app.asana.com/.../<task-gid>`) or a bare numeric task gid, if present.
- **confluenceRef** — a Confluence page URL, if present.
- **appUrl** — value of `url=...` if given; otherwise fall back to the `baseURL` in `playwright.config.ts`.
- **seed** — value of `seed=...` if given; otherwise default to `tests/seed.spec.ts`.
- **figmaRef** — value of `figma=...` if given (a Figma design URL like `https://figma.com/design/<fileKey>/...?node-id=<nodeId>`). If absent here, it may be discovered from the Asana ticket in Phase 1. When present, capture the **fileKey** (segment after `/design/` or `/file/`) and the **node-id** (URL form, e.g. `43732-73864`).

If neither an Asana nor a Confluence reference is found in the arguments, stop and ask the user for at least one source.

## Phase 1 — Gather context

**Asana** (if asanaRef present): use the connected Asana MCP tools directly.
- `mcp__claude_ai_Asana__get_task` for the task (name, notes/description, custom fields, subtasks, due date, assignee).
- `mcp__claude_ai_Asana__get_task_stories` for comments/discussion.
- `mcp__claude_ai_Asana__get_attachments` if the acceptance criteria live in an attachment.
- If you only have a task name (not a gid), use `search_tasks` to resolve it.
- **Figma design link:** scan the task notes/description (often a "Design Link" / "Design" label) and comments for a `figma.com/design/...` or `figma.com/file/...` URL. If found and `figmaRef` was not already given in the arguments, set `figmaRef` from it and capture its **fileKey** + **node-id**. This feeds the design-token checks in Phase 6.

**Confluence** (if confluenceRef present): the Atlassian tools are NOT loaded by default and the connector may require authorization.
- Call `ToolSearch` with query `"+confluence page content"` (and/or `"atlassian confluence get page"`) to load the read tools, then fetch the page body.
- If ToolSearch returns nothing or the fetch fails because the Atlassian/Rovo connector is unauthorized, do NOT fabricate content. Tell the user Confluence is unauthorized (authorize the Atlassian connector in claude.ai settings, or via `/mcp` in an interactive session) and continue with whatever sources ARE available. If Confluence was the only source, stop here.

## Phase 2 — Synthesize a requirements brief

Distill the gathered context into a concise brief and save it to `specs/<slug>.context.md`, where `<slug>` is a short fs-friendly name derived from the ticket title. The brief must contain:
- **Feature / ticket title** and source links (Asana gid, Confluence URL).
- **Goal** — one paragraph on what the feature does.
- **In-scope flows** to test (bullet list) and **explicitly out-of-scope / destructive actions to avoid** (e.g. anything that places a real order, sends money, deletes production data).
- **Acceptance criteria** copied/condensed from the ticket.
- **Target app URL** and **seed file** to reuse.
- **Design reference** — if `figmaRef` was found, record the Figma **fileKey** and **node-id** here (these drive the design-token checks in Phase 6). If no Figma link exists, say so.

Show the brief to the user as a short summary.

## Phase 3 — Run the planner

Launch the **playwright-test-planner** agent (via the Task tool, `subagent_type: "playwright-test-planner"`). In the prompt give it:
- The target app URL to explore (`appUrl`).
- The full requirements brief from Phase 2 as the scope of what to plan.
- The seed file to reference (`seed`) — every scenario's **Seed:** line must point to it.
- Instruction to save the plan with `planner_save_plan` to `specs/<slug>.md`, mirroring the structure of the existing `specs/ordering-flow.md` (numbered suites → scenarios → **File:** path under `tests/<slug>/...spec.ts` → numbered **Steps:** with `- expect:` lines).
- Restate the destructive-action guardrails from the brief so no scenario performs an irreversible action.

After the agent returns, Read the saved plan and list the scenarios it produced.

## Phase 4 — Confirmation gate

Show the user the list of planned scenarios (suite → scenario → target spec file). **Ask which scenarios to generate** (all, or a subset). Wait for the answer before Phase 5. Generating tests drives a real browser against the live app, so do not proceed automatically.

If `figmaRef` was found, also ask in this gate whether to generate **design-token checks** from the Figma design (Phase 6) — these assert the app's computed CSS (colour, radius, type) matches the design values, complementing the behavioral tests.

## Phase 5 — Generate behavioral test cases

For each chosen scenario, launch a **playwright-test-generator** agent (`subagent_type: "playwright-test-generator"`). Launch independent scenarios in parallel (multiple Task calls in one message), but cap concurrency at ~4 at a time to avoid browser contention. Each agent prompt must include, verbatim from the plan:
- `<test-suite>` — the top-level suite name (no ordinal).
- `<test-name>` — the scenario name (no ordinal).
- `<test-file>` — the **File:** path from the plan.
- `<seed-file>` — `seed`.
- `<body>` — the scenario's steps and expectations.

## Phase 6 — Generate design-token checks (only if `figmaRef` present AND the user opted in at Phase 4)

Assert the app's computed CSS matches the **Figma design values** (colour, border-radius, font-size/weight, spacing) instead of diffing screenshots — stable, and it catches "dev implemented the spec wrong". Infrastructure already lives in `tokens/` and `tests/utils/figma-tokens.ts`; read `tokens/README.md` before starting.

1. **Register the node.** Read `tokens/figma.config.mjs`. If `FIGMA_FILE_KEY` differs from the ticket's fileKey, note the mismatch to the user (the helper targets one file). If the ticket's node-id is not already in `FIGMA_NODES`, add an entry `{ id: '<node-id>', label: '<short ticket title>' }` via Edit.
2. **Fetch tokens if possible.** If `FIGMA_TOKEN` is set in the environment, run `npm run tokens:fetch` (Bash) to regenerate `tokens/design-tokens.json`, then Read it to learn the real layer `name`s. If `FIGMA_TOKEN` is not set, or the fetch returns 403/404, do NOT fabricate values — tell the user to set `FIGMA_TOKEN` (see `.env.example`) and run `npm run tokens:fetch` later; the spec you generate will auto-skip until the tokens file exists.
3. **Generate the token spec** at `tests/<slug>/<slug>.tokens.spec.ts`, modeled on `tests/design-tokens/banner-target-audience.tokens.spec.ts`:
   - Import `loadDesignTokens, tokensAvailable, tokenByName, assertTokens` from the relative path to `tests/utils/figma-tokens`.
   - Log in with the same origin/credentials as `seed` (admin → mirror `tests/seed-admin.spec.ts`; shop → `tests/seed.spec.ts`).
   - Build a `MAPPINGS` array pairing key UI elements from the plan's discovered selectors (primary buttons, inputs, headings, cards) with Figma layer names. If `design-tokens.json` exists, use real layer `name`s read in step 2; otherwise leave `'TODO:'` placeholders — the spec auto-skips unresolved layers rather than failing red.
   - Keep the whole file under a `test.describe` guarded by `test.skip(!tokensAvailable(), ...)`.
4. Do not run the token tests unless the user asks (`npm run test:tokens`).

## Phase 7 — Report

Produce **two** outputs: a CSV results file (the primary deliverable) and a short prose summary.

### 7a. CSV results file

Write `reports/<slug>.results.csv` (create `reports/` if missing). **One row per expectation** — a scenario step with three `- expect:` lines becomes three rows, so each assertion gets its own Pass/Fail. Columns, in this exact order:

| Column | Contents |
|---|---|
| `Suite` | Top-level suite name from the plan, no ordinal (e.g. `Target Audience — Campaign Link Inheritance (Read-only)`) |
| `Test Case` | Scenario name, no ordinal |
| `Spec File` | Path to the generated spec, or empty if the scenario was not generated |
| `Step No` | The scenario's step number (`1`, `2`, …); repeat it across that step's expectation rows |
| `Step` | The step's action text from the plan |
| `Expected` | The single `- expect:` line for this row |
| `Actual` | What actually happened — see rules below |
| `Status` | One of `Pass`, `Fail`, `Blocked`, `Skipped`, `Not Run` |
| `Notes` | Error message, healer edits, environment caveats, or `TODO:` gaps — else empty |

**Status rules — never guess:**
- `Pass` / `Fail` only if the spec was actually executed in this session. Get results from `npx playwright test <path> --reporter=json` and map them onto the rows.
- `Blocked` — could not execute for an environment reason (app down, login failing, missing fixture/credential). Put the cause in `Notes`.
- `Skipped` — the test ran but was skipped (e.g. token spec with an unresolved layer, or `test.skip()` guard).
- `Not Run` — generated but not executed, or planned but not generated.

**`Actual` rules:** for `Pass`, write the concretely observed value where the test captured one (e.g. `readOnly=true`, `chip "Test YEN" with no X icon`); `As expected` is acceptable only when nothing more specific was captured. For `Fail`, write the actual observed state plus the failing locator/value from the error. For `Blocked`/`Not Run`, leave it empty — **do not invent results.**

**CSV formatting (must follow, the content is Japanese and full of commas):**
- Write the file with a **UTF-8 BOM** (`﻿` first) or Excel mangles Japanese text.
- Quote every field with `"`; escape embedded quotes by doubling them (`""`).
- Strip newlines inside a field to a single space so each row stays on one line.

### 7b. Prose summary

Also state, briefly: brief path, plan path, the CSV path, counts by status (`N Pass / N Fail / N Blocked / N Not Run`), and — if Phase 6 ran — the token spec path, whether `tokens/design-tokens.json` exists, and any layers still left as `'TODO:'`.

Then offer, without running them unless asked: `npx playwright test`, `npm run test:tokens`, generating the remaining planned scenarios, or the healer agent on failures. If any row is `Blocked`, say plainly what must be fixed before a rerun can produce real results.
