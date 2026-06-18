/**
 * ProjectCard — 專案卡片元件（Server Component）
 *
 * 為什麼不再用 Link 包住整張卡片：
 * 卡片內含「編輯／刪除」按鈕（互動元素），若整張包在 <a> 內會造成
 * <button> 巢狀於 <a>（無效 HTML）且點按鈕會誤觸導航。
 * 改為：Link 只包住內容區（標題／描述／日期），操作按鈕放在 Link 外的 footer。
 *
 * 注意：project.created_at 是 Drizzle 回傳的 Date 物件（非字串），
 * 直接呼叫 toLocaleDateString 即可，不需要 new Date() 包裝。
 */
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { DeleteProjectButton } from "@/components/delete-project-button";
import type { Project } from "@/lib/db/schema";

type ProjectCardProps = {
  project: Project;
  /** 客戶選項清單，傳給編輯對話框的下拉 */
  clients: { id: string; name: string }[];
  /** 是否顯示編輯按鈕（admin / team_member 為 true，client 為 false） */
  canManage: boolean;
  /** 是否顯示刪除按鈕（僅 admin 為 true，與 deleteProject 的 adminOnly 防線一致） */
  canDelete: boolean;
};

export function ProjectCard({
  project,
  clients,
  canManage,
  canDelete,
}: ProjectCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow h-full">
      {/* 內容區：可點擊導航到專案詳情（按鈕區在此 Link 外，避免巢狀互動元素） */}
      <Link
        href={`/dashboard/projects/${project.id}`}
        className="block"
        aria-label={`查看專案 ${project.name}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base leading-tight">
              {project.name}
            </CardTitle>
            {/* 目前 schema 無 status 欄位，固定顯示「進行中」，待 P5 擴充 */}
            <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
              進行中
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 line-clamp-2">
            {project.description ?? "尚無描述"}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            建立：
            {project.created_at.toLocaleDateString("zh-TW")}
          </p>
        </CardContent>
      </Link>

      {/* 操作列：編輯（canManage）與刪除（canDelete）權限分離，置於 Link 外避免誤觸導航 */}
      {(canManage || canDelete) && (
        <div className="flex justify-end gap-2 px-4 pt-2">
          {canManage && (
            <ProjectFormDialog
              clients={clients}
              project={{
                id: project.id,
                name: project.name,
                description: project.description,
                client_id: project.client_id,
              }}
            />
          )}
          {canDelete && (
            <DeleteProjectButton
              projectId={project.id}
              projectName={project.name}
            />
          )}
        </div>
      )}
    </Card>
  );
}
