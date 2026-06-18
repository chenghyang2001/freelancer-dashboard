"use client";

/**
 * DeleteProjectButton — 專案刪除按鈕（Client Component）
 *
 * 為什麼用 window.confirm 而非自製確認 modal：
 * 刪除是低頻、破壞性操作，原生 confirm 足以提供二次確認；
 * 不為此單一動作增加自製對話框的複雜度。
 *
 * 為什麼提示文字強調「一併刪除任務」：
 * deleteProject 會連帶刪除底下所有 tasks（無法復原），
 * 使用者需在點擊前明確知道副作用。
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/actions/projects";

type DeleteProjectButtonProps = {
  projectId: string;
  /** 可選的專案名稱，用於確認提示文字 */
  projectName?: string;
};

export function DeleteProjectButton({
  projectId,
  projectName,
}: DeleteProjectButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    // 二次確認，使用者取消則直接 return（不進入 transition）
    const confirmed = window.confirm(
      `確定刪除專案「${projectName ?? ""}」？此操作會一併刪除其所有任務，無法復原。`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteProject(projectId);
        // 成功後刷新列表，被刪除的卡片即消失
        router.refresh();
      } catch (err) {
        // 失敗時記錄並用 alert 提示可讀訊息（非靜默失敗）
        console.error("[DeleteProjectButton] 刪除失敗：", err);
        window.alert(
          err instanceof Error ? err.message : "刪除失敗，請稍後再試",
        );
      }
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      aria-busy={isPending}
      aria-label={`刪除專案 ${projectName ?? ""}`}
    >
      {isPending ? "刪除中..." : "刪除"}
    </Button>
  );
}
