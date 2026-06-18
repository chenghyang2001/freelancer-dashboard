# Claude Code CLI 啟動時使用的資料夾與檔案（官方文件核對版）

> 核對日期：2026-06-18
> 來源：docs.claude.com / code.claude.com 官方文件
> 核對方式：派 `claude-code-guide` agent 抓取官方文件逐項比對

---

## 一、記憶檔載入優先順序（高 → 低）

```
1. Managed policy CLAUDE.md   ← 企業強制層，不可覆蓋
2. User       ~/.claude/CLAUDE.md
3. Project    ./CLAUDE.md（或 ./.claude/CLAUDE.md）
4. Local      ./CLAUDE.local.md（需自行 gitignore）
5. User rules    ~/.claude/rules/
6. Project rules .claude/rules/
7. 子目錄 CLAUDE.md（動態，讀該目錄檔案時才載入）
```

- 啟動時從當前目錄往上爬目錄樹，依序載入所有 CLAUDE.md
- 支援 `@path/to/file.md` import 語法（遞迴最深 4 層）
- 子目錄的 CLAUDE.md 不在啟動時載入，當 Claude 讀取該子目錄檔案時才動態載入

### Managed policy CLAUDE.md 各 OS 路徑

| OS | 路徑 |
|----|------|
| macOS | `/Library/Application Support/ClaudeCode/CLAUDE.md` |
| Linux/WSL | `/etc/claude-code/CLAUDE.md` |
| Windows | `C:\Program Files\ClaudeCode\CLAUDE.md` |

也可在 `managed-settings.json` 用 `claudeMd` 鍵設定。

---

## 二、設定檔（Settings）優先順序（高 → 低）

```
1. Managed settings（無法被覆蓋）
2. CLI flags（--permission-mode / --settings ...）
3. .claude/settings.local.json   （專案本機，gitignore）
4. .claude/settings.json         （專案共享，進版控）
5. ~/.claude/settings.json       （使用者全域）
```

settings.json 常見配置鍵：`permissions` / `hooks` / `env` / `model` / `outputStyle` / `alwaysThinkingEnabled` / `autoMemory` 等。

---

## 三、擴充元件資料夾（專案 + 全域兩層）

| 資料夾 | 用途 | 備註 |
|--------|------|------|
| `.claude/agents/` ＆ `~/.claude/agents/` | Subagents | |
| `.claude/skills/` ＆ `~/.claude/skills/` | Skills | commands 已整併至此 |
| `.claude/rules/` ＆ `~/.claude/rules/` | Rules | |
| `.claude/output-styles/` ＆ `~/.claude/output-styles/` | Output Styles | |
| `.claude/workflows/` ＆ `~/.claude/workflows/` | Workflows | |
| `.claude/agent-memory/` ＆ `~/.claude/agent-memory/` | Agent Memory | |
| `~/.claude/plugins/` | Plugin 快取 | |

> **Commands → Skills 整併**：官方文件「Commands and skills are now the same mechanism. For new workflows, use skills/ instead」。新工作流請改用 `skills/`。

> **Hooks 不是資料夾**：Hook 在 `settings.json` 的 `hooks` 鍵中定義（指向的腳本可放任意路徑），沒有官方的 `.claude/hooks/` 強制資料夾。

---

## 四、MCP 與其他檔案

| 檔案 | 用途 | 狀態 |
|------|------|------|
| `.mcp.json` | 專案層級 MCP server（注意在**專案根目錄**，不在 `.claude/` 內），進版控 | ✅ 官方 |
| `~/.claude.json` | 主目錄，全域狀態 + Local/User scope MCP server | ✅ 官方（注意是 `~/.claude.json` 不是 `~/.claude/`） |
| `.worktreeinclude` | worktree 時複製哪些 gitignore 檔案到新 worktree（專案根目錄） | ✅ 官方 |
| `.claudeignore` | 排除掃描檔案 | ❌ **非官方**，改用 `settings.json` 的 `permissions.deny` + `Read` 規則 |

---

## 五、啟動流程（簡化）

```
啟動 claude
  → 讀 managed settings（若有）
  → 套用 CLI flags
  → 讀 .claude/settings.local.json + .claude/settings.json + ~/.claude/settings.json
  → 載入 CLAUDE.md 鏈（managed → user → project → local → rules，展開所有 @import）
  → 載入 agents / skills / output-styles / workflows（全域 + 專案）
  → 載入 .mcp.json + ~/.claude.json 的 MCP 設定，啟動 MCP servers
  → 執行 SessionStart hooks
  → 進入互動
```

---

## 六、原始草稿 vs 官方核對的差異（修正紀錄）

| # | 原草稿 | 官方實際 |
|---|--------|---------|
| 1 | 未提到 Managed Policy 層級 | 漏掉**最高優先層級**（記憶與設定兩條鏈都有） |
| 2 | `.claudeignore` 是官方功能 | ❌ 非官方，要排除檔案請用 `permissions.deny` |
| 3 | `.claude/hooks/` 是資料夾 | ⚠️ Hooks 在 `settings.json` 的 `hooks` 鍵裡定義，不是資料夾 |
| 4 | `commands/` 是獨立機制 | ⚠️ 已與 Skills 整併，新工作流建議用 `skills/` |
| 5 | `CLAUDE.local.md` 已棄用 | ⚠️ 官方文件仍列為有效（本機層，需自行 gitignore） |
| 6 | 遺漏 rules / output-styles / workflows / agent-memory / .worktreeinclude | 官方均支援，已補充 |

原草稿準確度約 88%。

---

## 官方文件 URL

| 主題 | URL |
|------|-----|
| 記憶（CLAUDE.md） | <https://code.claude.com/docs/en/memory.md> |
| 設定優先序 | <https://code.claude.com/docs/en/settings.md> |
| `.claude/` 目錄結構 | <https://code.claude.com/docs/en/claude-directory.md> |
| MCP 配置 | <https://code.claude.com/docs/en/mcp.md> |
| 大型 Codebase 配置 | <https://code.claude.com/docs/en/large-codebases.md> |
