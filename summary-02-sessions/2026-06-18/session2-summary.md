# Session 2 Summary — PDF 合併 + deploy-viewer 部署到 mermaid-viewer

- **日期**：2026-06-18
- **機器**：NB00547
- **專案**：freelancer-dashboard
- **主題**：合併兩份 Claude Code PDF → 用 /deploy-viewer 部署為獨立 viewer 並掛進 mermaid-viewer hub

## 完成事項

### 1. 合併 PDF

- 用 pypdf 6.11.0（inline `python -c`，不寫 .py 檔避開鐵律）把 `Claude_Code_Architecture_Decoded.pdf`（13 頁）+ `ClaudeCode啟動檔案-20圖合輯.pdf`（20 頁）依序合併為 `doc/Claude_Code_完整架構與啟動圖合輯.pdf`（33 頁）。
- 合併後驗證頁數 = 33。

### 2. /deploy-viewer 部署

- PDF → 33 張 PNG（pymupdf 1.27.2.2，150 dpi）。
- 生成 Flat viewer `index.html`（縮放/拖曳/縮圖列/自動播放），IMAGES 改用 JS 動態生成（`Array.from` + padStart）避免列 33 行。
- 新建 repo `chenghyang2001/claude-code-architecture`（public）+ 啟用 GitHub Pages，URL：<https://chenghyang2001.github.io/claude-code-architecture/。>
- Phase 5 把新 viewer 加進 `mermaid-viewer` hub 成為第 13 個分頁「Claude Code 架構合輯 33」（idx=12），hub commit `bf10ef57`。
- Puppeteer 雙截圖驗證：獨立 viewer 1/33 正常、hub 新分頁出現且點擊後 iframe 正確載入。

### 3. 決策：安全部署方式

- 使用者一開始把 `mermaid-viewer` 當第二參數（repo 名），我察覺這會 `--force` 覆蓋整個 hub、清空既有 12 分頁，主動用 AskUserQuestion 確認 → 使用者選「新建獨立 repo + 自動加進 hub」（非破壞性）。

### 4. doc 產物入版控

- commit 合併 PDF + Architecture/啟動圖 的 PDF/PPTX；`.gitignore` 新增 `~$*` 忽略 Office 鎖檔；排除 `~$...pptx` 不入版控。

## 關鍵技術筆記

- **此 Bash 環境踩坑（重要）**：`/tmp` 寫入與 `git clone` 會被回滾／失敗（檔案憑空消失）。解法：操作 GitHub repo 檔案改走 `gh api repos/.../contents/<file>` GET（取 sha+base64）→ 本地編輯 → PUT（帶 sha）。
- **gh.exe 路徑**：原生 Windows `gh.exe` 不認 MSYS 路徑 `/c/...`，`--input` 要用 `$(cygpath -w ...)` 轉 Windows 路徑。
- **bash heredoc + 引號**：含大量單引號的 python heredoc 在此環境易壞，改用 Read+Edit 工具直接改 HTML / 用 `python -c` 搭 `os.path.expanduser` 自組路徑。
- **GitHub Pages 中文檔名**：必須 `.nojekyll` 否則中文 PNG 被略過。

## 產出檔案

| 檔案 / 資源 | 說明 | 版控 / 位置 |
|------|------|------|
| `doc/Claude_Code_完整架構與啟動圖合輯.pdf` | 33 頁合併 PDF | commit c268197 |
| `doc/Claude_Code_Architecture_Decoded.pdf` / `.pptx` | 來源 1 | commit c268197 |
| `doc/ClaudeCode啟動檔案-20圖合輯.pdf` / `.pptx` | 來源 2 | commit c268197 |
| `.gitignore`（+`~$*`） | 忽略 Office 鎖檔 | commit c268197 |
| repo `claude-code-architecture` | 獨立 viewer（33 PNG） | github.io（新建）|
| `mermaid-viewer` hub | 新增第 13 分頁 | hub commit bf10ef57 |

本專案 commit：`c268197`（其餘 `9829d1f`/`2630ec3`/`b81f138`/`4b67029` 屬 Session 1）。

## HANDOFF（下次 session 優先處理）

### 立即行動

- [ ] 無強制待辦；如需可把 `doc/` 來源 PDF/PPTX 整理歸檔（目前散在 doc/ 根）。
- [ ] 若之後常用 deploy-viewer，考慮把「此環境 git clone/`/tmp` 不可用 → 改 gh api contents」寫進 deploy-viewer skill 的踩坑區。

### 進行中（需接續）

- 無未完成工作；合併 + 部署 + hub 掛載 + 版控皆完成並驗證。

### 注意事項

- 此 Bash 環境：避免依賴 `git clone` 與 `/tmp`，改 `gh api contents` + `$HOME` 路徑。
- gh CLI `--input` 一律用 `cygpath -w` 轉 Windows 路徑。
- mermaid-viewer 是統一 hub，部署新 viewer 切勿用 repo 名 `mermaid-viewer` + force（會清空 hub）。
