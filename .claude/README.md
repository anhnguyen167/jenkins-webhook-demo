# URRY QA Automation — Claude Code setup

Thư mục `.claude/` cấu hình cách Claude Code hỗ trợ sinh test Playwright cho URRY:

```
.claude/
├── commands/                  # Slash commands (tự viết được)
│   └── ticket-to-tests.md     # Pipeline: Asana/Confluence → planner → gen test
├── agents/                    # Subagent chuyên dụng (planner / generator / healer)
│   ├── playwright-test-planner.md
│   ├── playwright-test-generator.md
│   └── playwright-test-healer.md
├── settings.json              # Permissions + bật MCP server
└── README.md                  # File này
```

Ngoài ra:
- `specs/` — test plan (`.md`) + brief context (`.context.md`).
- `tests/` — test spec Playwright + **seed** (setup đăng nhập).
- `.mcp.json` — khai báo MCP server `playwright-test`.

---

## 1. Seeds (đăng nhập dùng lại)

Mỗi test bắt đầu từ 1 **seed** — 1 test đăng nhập sẵn để các test khác kế thừa trạng thái. URRY có **2 app khác origin nên 2 seed**:

| Seed | App | URL | Tài khoản |
|---|---|---|---|
| `tests/seed.spec.ts` | Shop front | `https://dev.urry.com` | Sakaya khách hàng |
| `tests/seed-admin.spec.ts` | Admin Portal | `https://dev-portal.urry.com` | Admin (`demo@urry.com`) |

Credentials đọc từ env var (ưu tiên CI), fallback về tài khoản dev dùng chung:
```bash
# Shop
URRY_EMAIL=... URRY_PASSWORD=...
# Admin
URRY_ADMIN_EMAIL=... URRY_ADMIN_PASSWORD=... URRY_ADMIN_BASE=https://dev-portal.urry.com
```

Khi plan test, **suite admin** phải trỏ `seedFile: tests/seed-admin.spec.ts`, **suite shop** trỏ `tests/seed.spec.ts`.

---

## 2. Dùng command `/ticket-to-tests`

Pipeline: **đọc ticket → chạy planner → gen test case**.

### Cú pháp
```
/ticket-to-tests <asana-url-hoặc-id> [confluence-url] [url=<app-url>] [seed=<seed-file>]
```

### Ví dụ
```
/ticket-to-tests https://app.asana.com/1/xxx/task/1213077202136829
/ticket-to-tests 1213077202136829 url=https://dev-portal.urry.com seed=tests/seed-admin.spec.ts
/ticket-to-tests <asana-url> https://urry.atlassian.net/wiki/spaces/UD/pages/22216708
```

### Nó làm gì (6 phase)
1. **Gather** — đọc Asana task (mô tả, subtask, comment, attachment) + Confluence page.
2. **Brief** — chắt lọc thành `specs/<slug>.context.md` (goal, in-scope, guardrails, acceptance criteria).
3. **Plan** — agent `playwright-test-planner` mở app, khám phá UI, lưu plan `specs/<slug>.md`.
4. **Gate** — liệt kê scenario, **hỏi bạn chọn cái nào** trước khi gen (không tự chạy vì điều khiển browser thật).
5. **Generate** — mỗi scenario → agent `playwright-test-generator` viết `tests/<slug>/*.spec.ts` (song song, tối đa ~4).
6. **Report** — tổng hợp file brief/plan/spec, gợi ý chạy test.

### Điều kiện tiên quyết
- **Asana:** connector đã kết nối (dùng ngay).
- **Confluence:** connector **Atlassian Rovo** phải được **authorize** trên claude.ai → Settings → Connectors (hoặc `/mcp` ở phiên interactive). Nếu chưa, command bỏ qua Confluence và báo bạn, không bịa nội dung.
- **Seed:** app đích phải có seed đăng nhập tương ứng (xem mục 1).

---

## 3. Tạo command mới

Slash command chỉ là **1 file Markdown** trong `.claude/commands/`. Tên file = tên lệnh: `foo.md` → `/foo`.

### Khung cơ bản
```markdown
---
description: Mô tả ngắn (hiện khi gõ /)
argument-hint: <arg1> [arg2]
allowed-tools: Task, Read, Write, Bash(npx playwright:*)
model: sonnet            # optional: ép model cho lệnh này
---

Nội dung ở đây chính là PROMPT gửi cho Claude khi chạy lệnh.
Dùng $ARGUMENTS để lấy toàn bộ tham số, hoặc $1 $2 cho từng vị trí.
```

### Các placeholder & tính năng
| Cú pháp | Ý nghĩa |
|---|---|
| `$ARGUMENTS` | Toàn bộ chuỗi tham số sau tên lệnh |
| `$1`, `$2`, … | Tham số theo vị trí |
| `@path/to/file` | Nhúng nội dung file vào prompt |
| `` !`lệnh shell` `` | Chạy shell, chèn output vào prompt (cần khai `allowed-tools`) |

### Frontmatter hay dùng
- `description` — mô tả 1 dòng.
- `argument-hint` — gợi ý tham số (hiện lúc autocomplete).
- `allowed-tools` — whitelist tool lệnh được tự dùng (không thì bị hỏi quyền).
- `model` — ép model riêng.
- `disable-model-invocation: true` — chỉ cho gọi thủ công, chặn Claude tự gọi.

### Ví dụ nhỏ — `/run-tests`
```markdown
---
description: Chạy toàn bộ test Playwright và tóm tắt kết quả
allowed-tools: Bash(npx playwright:*), Read
---

Chạy `npx playwright test --reporter=line`.
Nếu có test fail, đọc trace/lỗi và đề xuất cách sửa (hoặc gợi ý dùng agent healer).
Tóm tắt: số pass/fail và các file spec bị lỗi.
```
Dùng: gõ `/run-tests`.

### Phạm vi
- **Project** (chia sẻ cả team, commit vào repo): `.claude/commands/`
- **Cá nhân** (chỉ máy bạn, mọi project): `~/.claude/commands/`

> Tip: tạo command bằng cách bảo Claude "viết cho tôi slash command /X làm việc Y" — nó sẽ sinh file `.claude/commands/X.md` cho bạn.

---

## 4. Chạy test đã sinh

```bash
npx playwright test                                   # tất cả
npx playwright test tests/promotion-banner-target-audience/   # 1 thư mục
npx playwright test tests/seed-admin.spec.ts --reporter=line  # 1 file
npx playwright show-report                            # xem báo cáo HTML
```

Test fail → nhờ agent **`playwright-test-healer`** debug và sửa selector/logic.
