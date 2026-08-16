---
description: Read a ticket from Asana/Confluence and generate MOBILE tests — Maestro flows for the native Android app, optionally Playwright for mobile web.
argument-hint: <asana-url-or-id> and/or <confluence-url> [app=<android.package.name>] [apk=<path-to.apk>] [target=native|web|both] [seed=tests/seed.spec.ts]
allowed-tools: Task, ToolSearch, Read, Write, Edit, Glob, Grep, Bash, mcp__claude_ai_Asana__get_task, mcp__claude_ai_Asana__get_task_stories, mcp__claude_ai_Asana__get_attachments, mcp__claude_ai_Asana__search_tasks
---

You are running the **ticket → mobile test cases** pipeline for the **native Android app**, using **Maestro**. Follow the phases in order. Do not skip the confirmation gate.

## Tooling boundary — get this right before anything else

| Layer | Tool | Lives in |
|---|---|---|
| Shop / Admin **web** | Playwright | `tests/` |
| **Web on real Android** (Chrome) | Playwright `_android` | `scripts/android-shop.mjs` |
| **Native APK** | **Maestro** | `.maestro/` |

**Playwright cannot drive a native APK** — it only controls Chrome and WebViews. Never generate a `.spec.ts` for a native screen, and never launch `playwright-test-planner` / `playwright-test-generator` against the native app: those agents only have browser tools and will silently plan against the website instead of the app. Native work means writing Maestro YAML flows.

**iOS:** Maestro needs macOS (Xcode + simulator) for iOS. On Windows this pipeline is **Android-only**. Say so once; never report an Android result as iOS coverage.

## Inputs

Raw arguments: `$ARGUMENTS`

Parse them into:
- **asanaRef** — Asana task URL or bare numeric gid, if present.
- **confluenceRef** — Confluence page URL, if present.
- **appId** — value of `app=...`, the Android package name (e.g. `com.urry.app`). If absent, resolve it in Phase 3.
- **apkPath** — value of `apk=...`, a local `.apk` to install if the app is not already on the device.
- **target** — `native` (default), `web`, or `both`. `web` delegates to mobile-web coverage via Playwright projects; `native` produces Maestro flows.
- **seed** — value of `seed=...` (only relevant when `target` includes `web`).

If neither an Asana nor a Confluence reference is given, stop and ask for at least one source.

## Phase 1 — Gather context

- **Asana:** `get_task`, `get_task_stories`, `get_attachments`; `search_tasks` to resolve a name to a gid.
- **Confluence:** load read tools via `ToolSearch` (`"+confluence page content"`), then fetch. If unauthorized or declined, say so plainly and continue with the sources you do have — never fabricate ticket content.

Reuse before regenerating: if `specs/<slug>.context.md` exists from a prior run, read it and re-verify against the live ticket (new comments? status moved?). If still accurate, say you are reusing it.

## Phase 2 — Requirements brief (native lens)

Write/refresh `specs/<slug>.context.md`, plus a **Native app scope** section:
- Which ticket behaviours exist **in the app at all** — a web-only admin feature has no native surface, and planning one wastes the whole run.
- Screens/tabs involved, and how the user reaches them from app launch.
- Whether the screen is native UI or an embedded WebView (Phase 3 confirms this).
- Destructive-action guardrails restated verbatim: no real orders, no deleting shared data, no sending notifications, no changing master data.

## Phase 3 — Device + app preflight

Run these and report the actual results. Do not continue past a failure — a "test" against a missing app is worthless.

```bash
npm run android:devices        # must list a device as "device"
npm run android:packages       # find the package name
```

1. **No device** → stop. Tell the user to connect a phone with USB debugging on, or boot an AVD (the AVD image must include Google Play/Google APIs).
2. **App not installed** → if `apkPath` was given, `adb install <apk>`; otherwise stop and ask for the APK.
3. **Resolve `appId`** from `npm run android:packages`. If several match, ask which.
4. **Native or hybrid?** Check for a WebView:
   ```bash
   adb shell dumpsys window | findstr /i webview
   ```
   Or launch the app and look for a WebView target in `chrome://inspect#devices`.
   - **Hybrid/WebView** → say so. Maestro still drives it, but note that inner web content may also be reachable by Playwright's `device.webView({pkg})`, which can reuse existing web selectors.
   - **Fully native** → Maestro only.

## Phase 4 — Explore the real app UI (this replaces the Playwright planner)

You cannot plan native flows from a website or from assumption. Read the **actual view hierarchy** and derive selectors from it:

```bash
maestro hierarchy                       # dumps the current screen's element tree
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml   # fallback
```

Navigate step by step: launch the app, dump, tap toward the ticket's screen, dump again. Record for every element the flow will touch:
- its **`text`**, **`id`** (`resource-id`), and **`accessibilityText`** (`content-desc`)
- whether it scrolls into view or is visible at rest

Prefer `id` over `text` where an id exists — text breaks under localization, and this app is Japanese. Where only text exists, note it may need `containsText` rather than an exact match.

If a screen is unreachable without mutating shared data, **stop and say so** rather than planning a flow that would violate the guardrails.

Save the plan to `specs/<slug>.native.md`: numbered suites → scenarios → **File:** path under `.maestro/flows/<slug>/NN-<name>.yaml` → numbered **Steps:** with `- expect:` lines, exactly like the web plans so the CSV report stays consistent.

## Phase 5 — Confirmation gate

Show the planned scenarios (suite → scenario → target flow file) and **ask which to generate**. Wait for the answer — generating and running drives the real app on a real device against a live backend.

## Phase 6 — Generate Maestro flows

Write YAML directly; do **not** delegate to the Playwright generator agents. One flow per file, numbered by run order, under `.maestro/flows/<slug>/`.

Every flow starts:
```yaml
appId: ${APP_ID}
---
- launchApp:
    clearState: false
```

Never hard-code the package name — flows take it via `-e APP_ID=`, which `scripts/maestro.mjs` supplies.

Command cheat sheet (use only selectors confirmed in Phase 4):
```yaml
- tapOn: { id: "com.urry.app:id/login_button" }
- tapOn: { text: "ログイン" }
- tapOn: { text: "検索", optional: true }        # tolerate an absent element
- inputText: "test-tungda@urry.com"
- assertVisible: { id: "..." }
- assertNotVisible: { text: "エラー" }
- scrollUntilVisible: { element: { text: "注文履歴" }, direction: DOWN }
- extendedWaitUntil: { visible: { text: "ホーム" }, timeout: 30000 }
- takeScreenshot: reports/maestro/<slug>/NN-<step>
- back
```

Rules:
- **Assert, don't just tap.** A flow that only taps passes even when the screen is wrong.
- Use `extendedWaitUntil` rather than fixed sleeps — the dev backend is slow and flaky.
- Factor shared prefixes (launch + login) into `.maestro/flows/<slug>/common-login.yaml` and pull them in with `runFlow`.
- `takeScreenshot` after each meaningful state — screenshots are the evidence column in the report.
- Guardrails are load-bearing: never tap a confirm-order / delete / send-notification control. If a scenario cannot be verified without one, stop before that step and report it as **Blocked**.
- **Tag destructive or opt-in flows** so they can be excluded by default:
  ```yaml
  appId: ${APP_ID}
  tags:
    - optin
  ---
  ```

### Do not use Maestro's AI commands

Maestro ships `assertWithAI`, `assertNoDefectsWithAI`, `extractTextWithAI`, and the `--analyze` flag. **This pipeline does not use them.** Do not add them to a flow or a run command.

Two reasons:
- They are **non-deterministic** — the same screen can pass and then fail. A regression suite must give the same answer twice, otherwise red tells you nothing about whether the app broke.
- They upload app screenshots to a third-party LLM. These screens carry real 取引先 names, customer codes, and pricing.

Every assertion in this pipeline is deterministic: `assertVisible` / `assertNotVisible` on an `id` or text confirmed in Phase 4.

## Phase 7 — Run

```bash
npm run maestro:test -- --app-id=<appId>
node scripts/maestro.mjs test .maestro/flows/<slug>/01-xxx.yaml --app-id=<appId>
```

Flags worth passing (all verified on 2.7.0 — run `maestro test --help` if unsure):

| Flag | Why |
|---|---|
| `--format=HTML-DETAILED` | Human-readable report with screenshots — hand this to the tester |
| `--test-output-dir=reports/maestro/<slug>` | Pins artifacts (`manifest.json`, `logs/`, `takeScreenshot/`) where Phase 8 expects them |
| `--exclude-tags=optin` | Skips destructive/opt-in flows by default |
| `--include-tags=smoke` | Runs just the smoke subset |
| `--device=<id>` | Picks a device when several are attached |
| `--flatten-debug-output` | Stable artifact paths for CI |

Report real output. If a flow fails, read the Maestro error plus the screenshot and the Phase 4 hierarchy before editing — a failure caused by the backend being down is **Blocked**, not **Fail**, and must not be "fixed" by loosening the assertion.

## Phase 8 — Report

Produce the CSV described in `/ticket-to-tests` Phase 7 — `reports/<slug>.native.results.csv`, one row per expectation, same nine columns — plus:

| Column | Contents |
|---|---|
| `Platform` | `Android native` (or `Android WebView` for hybrid screens) |
| `Device` | Model + `(real)` or `(emulator)`, e.g. `Pixel 6 (emulator)` |
| `Evidence` | Path to the `takeScreenshot` output for that step |

Status discipline is unchanged: `Pass`/`Fail` only for what actually executed; `Blocked` with a cause (no device, app not installed, backend down); never invent an `Actual`.

Summarize: brief path, native plan path, CSV path, counts by status, the device used, and — explicitly — that iOS is not covered and why. Offer, without running unless asked: rerunning a flow, `npm run maestro:studio` to fix a selector, or generating the remaining scenarios.
