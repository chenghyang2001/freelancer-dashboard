# Session 1 Summary — Claude Code 啟動結構核對 + scaffold skill

- **日期**：2026-06-18
- **機器**：NB00547
- **專案**：freelancer-dashboard
- **主題**：查證 Claude Code CLI 啟動時使用的資料夾/檔案 → 建立官方核對文件 → 開發 user-level scaffold skill

## 完成事項

### 1. Claude Code 啟動檔案官方核對

- 回答「Claude 啟動專案時使用哪些資料夾與檔案」，先憑知識給出初版清單。
- 派 `claude-code-guide` agent 抓 docs.claude.com / code.claude.com 官方文件逐項核對，初版準確度約 88%。
- 修正 5 處：① 漏掉 Managed Policy 層（記憶與設定兩條鏈最高優先、不可覆蓋）；② `.claudeignore` 非官方功能（改用 `permissions.deny` + `Read`）；③ Hooks 不是資料夾、是 `settings.json` 的 `hooks` 鍵；④ `commands/` 已與 `skills/` 整併；⑤ `CLAUDE.local.md` 官方仍有效（非棄用）。補充 `rules/` `output-styles/` `workflows/` `agent-memory/` `.worktreeinclude`。
- 文件留底 `doc/claude-code-startup-files.md`，並寄到 <chenghyang2001@gmail.com>（純文字內文，因 sendEmail 不支援附件）。

### 2. claude-config-scaffold skill（user-level）

- 新 user-level skill：`~/.claude/skills/claude-config-scaffold/`（SKILL.md + scaffold.py）。
- 功能：依官方結構為專案（預設）或 `~/.claude/`（`--user`）建立設定骨架；冪等、永不覆蓋既有檔；缺的放 dummy 模板。支援 `--dry-run`、`TARGET_DIR` 位置參數。
- 走完三 agent 鐵律（中等複雜度，3 test case + reviewer）：code-writer → code-qa(PASS) → code-reviewer(CHANGES_REQUESTED, 2 must-fix) → 修正 → code-qa(PASS) → code-reviewer(APPROVED)。
- 兩條 must-fix：① cp950 console 印 emoji 觸發未捕捉 UnicodeEncodeError → main() 加 `sys.stdout.reconfigure(encoding="utf-8", errors="replace")`；② 危險檔（settings.json / settings.local.json / ~/.claude.json）由 `exists()+write_text("w")` 改 `open("x")` 原子獨佔建立，防斷掉 symlink 穿透 + TOCTOU race 截斷。
- 追加觸發詞：`init proj claude folders` / `init claude project folders` / `init project claude folders and files`。

### 3. 對本專案實際 scaffold + 收尾

- 對 freelancer-dashboard 實跑 scaffold，建立 20 項（`.claude/` 全套 + `CLAUDE.md` / `CLAUDE.local.md` / `.mcp.json` / `.worktreeinclude`）。冪等複跑驗證：建 0 / 跳過 20。`CLAUDE.local.md` 已加進 `.gitignore` 並被正確忽略。

## 關鍵技術筆記

- **scaffold 安全模型**：危險設定檔的「不覆蓋」保證從控制流（`exists()`）下沉到 OS 層（`O_CREAT|O_EXCL`），不依賴 TOCTOU 之間無人插隊。
- **cp950 陷阱**：Windows 預設 cp950，`print` emoji 會 `UnicodeEncodeError`，且它是 `ValueError` 子類、不會被 `except OSError/PermissionError` 攔到 → 開頭 `stdout.reconfigure` 是必要防禦。
- **Managed Policy 層**：個人機通常沒這層所以易被忽略，但它在記憶+設定兩條鏈都是最高且不可覆蓋。
- **commands→skills 整併**：官方已統一「使用者觸發指令」與「模型自動觸發能力」為同一機制。

## 產出檔案

| 檔案 | 說明 | 版控 |
|------|------|------|
| `doc/claude-code-startup-files.md` | 官方啟動結構核對文件 | commit b81f138 |
| `~/.claude/skills/claude-config-scaffold/SKILL.md` | scaffold skill 本體 | ~/.claude repo |
| `~/.claude/skills/claude-config-scaffold/scaffold.py` | scaffold 腳本（383 行，純標準庫） | ~/.claude repo |
| `.claude/`（全套）+ `CLAUDE.md` / `.mcp.json` / `.worktreeinclude` | scaffold 產出骨架 | commit 2630ec3 |
| `doc/mmd/*.mmd` (20) + `doc/png/*.png` (20) + `doc/doc-圖表合輯.pptx` | Claude 啟動流程圖表合輯 | commit 9829d1f |

本專案 commit：`b81f138` / `2630ec3` / `9829d1f`，皆已 push 到 chenghyang2001/freelancer-dashboard。

## HANDOFF（下次 session 優先處理）

### 立即行動

- [ ] 把 scaffold 產出的 dummy 範本（`.claude/agents/example-agent.md` 等 `example-*`）換成 freelancer-dashboard 真正要用的 agent/skill/rule，或刪除不需要的。
- [ ] 決定 `.claude/settings.json`（目前 `{}`）是否要加專案層 permissions / hooks。
- [ ] （可選）清掉 scaffold 輸出末行 `.gitignore\<行：...>` 的純顯示瑕疵（reviewer 標的 nice-to-have，無功能影響）。

### 進行中（需接續）

- 無未完成工作；本 session 三件事（核對文件、scaffold skill、實際 scaffold）皆已完成並 push。

### 注意事項

- scaffold.py 的危險檔白手套：`settings.json` / `settings.local.json` / `~/.claude.json` 一律不覆蓋，要改內容只能手動編輯。
- 跑 scaffold.py 務必 `PYTHONUTF8=1`（cp950 emoji）。
- skill 檔在 `~/.claude/`（全域 repo），非本專案 repo。
