"use client";

/**
 * ProjectFormDialog — 專案建立／編輯共用對話框（Client Component）
 *
 * 為什麼自製 modal 而非引入 dialog 套件：
 * 避免為單一表單增加新依賴；用 fixed inset-0 遮罩 + 置中卡片即可滿足需求，
 * 並自管 open 狀態與鍵盤事件（Esc 關閉）。
 *
 * 為什麼建立與編輯共用：
 * 兩者欄位完全相同，只差「有無 project」決定呼叫 update 或 create，
 * 合併成單一元件避免重複的表單 JSX。
 */

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createProject, updateProject } from "@/actions/projects";

type ClientOption = { id: string; name: string };

type ProjectFormDialogProps = {
  /** 可選的客戶清單，作為 client 下拉選項（value = users.id） */
  clients: ClientOption[];
  /** 有值代表編輯模式，無值代表建立模式 */
  project?: {
    id: string;
    name: string;
    description: string | null;
    client_id: string;
  };
  /** 自訂觸發按鈕文字；未提供時依模式給預設值 */
  triggerLabel?: string;
  /** 觸發按鈕的 Button variant */
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
};

export function ProjectFormDialog({
  clients,
  project,
  triggerLabel,
  triggerVariant,
}: ProjectFormDialogProps) {
  const isEdit = project !== undefined;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  // client_id 預設：編輯模式用既有值，建立模式用第一個客戶（若有）
  const [clientId, setClientId] = useState(
    project?.client_id ?? clients[0]?.id ?? "",
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // 沒有任何客戶時無法指定 client_id，停用送出
  const hasNoClients = clients.length === 0;

  /**
   * 每次開啟對話框時重置欄位為最新的 project 值
   *
   * 為什麼需要這個 effect：
   * 元件實例在多次開關間會保留 state，編輯模式若不重置，
   * 上次未送出的編輯內容會殘留；開啟時同步回 props 才正確。
   */
  useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setDescription(project?.description ?? "");
      setClientId(project?.client_id ?? clients[0]?.id ?? "");
      setError("");
    }
  }, [open, project, clients]);

  // Esc 鍵關閉對話框（僅在開啟時掛載監聽，避免常駐）
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // useTransition 包住 Server Action 呼叫，pending 期間 disable 按鈕
    startTransition(async () => {
      try {
        const payload = { name, description, client_id: clientId };
        if (isEdit) {
          await updateProject(project.id, payload);
        } else {
          await createProject(payload);
        }
        // 成功後關閉並刷新列表（Server Component 重新取得最新資料）
        setOpen(false);
        router.refresh();
      } catch (err) {
        // 失敗時在 modal 內顯示可讀訊息，不可只 console.log
        console.error("[ProjectFormDialog] 送出失敗：", err);
        setError(err instanceof Error ? err.message : "操作失敗，請稍後再試");
      }
    });
  }

  // 依模式決定觸發按鈕的預設外觀
  const resolvedLabel = triggerLabel ?? (isEdit ? "編輯" : "新增專案");
  const resolvedVariant = triggerVariant ?? (isEdit ? "ghost" : "default");

  return (
    <>
      {/* 觸發按鈕：編輯模式用小尺寸 ghost，建立模式用預設 primary */}
      <Button
        type="button"
        variant={resolvedVariant}
        size={isEdit ? "sm" : "default"}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {resolvedLabel}
      </Button>

      {open && (
        /* 遮罩：點擊遮罩本身（非卡片）即關閉 */
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          {/* 卡片：stopPropagation 避免點到內容時冒泡關閉 */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isEdit ? "編輯專案" : "新增專案"}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? "編輯專案" : "新增專案"}
            </h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* 專案名稱（必填） */}
              <div>
                <label
                  htmlFor="project-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  專案名稱
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：官網改版"
                  required
                />
              </div>

              {/* 專案描述（選填） */}
              <div>
                <label
                  htmlFor="project-description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  專案描述（選填）
                </label>
                <textarea
                  id="project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="簡短描述專案內容"
                />
              </div>

              {/* 客戶下拉（必填） */}
              <div>
                <label
                  htmlFor="project-client"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  客戶
                </label>
                <select
                  id="project-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  required
                  disabled={hasNoClients}
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {hasNoClients && (
                  <p className="mt-1 text-sm text-amber-600">
                    請先建立客戶帳號
                  </p>
                )}
              </div>

              {/* 錯誤訊息區塊，只在有錯誤時顯示 */}
              {error && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600"
                >
                  {error}
                </div>
              )}

              {/* 動作列：取消 + 送出 */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || hasNoClients}
                  aria-busy={isPending}
                >
                  {isPending ? "儲存中..." : isEdit ? "儲存" : "建立"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
