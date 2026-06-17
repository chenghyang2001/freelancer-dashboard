/**
 * RoleBadge — 角色標籤元件
 *
 * 為什麼用 Record 而非 if/switch：
 * 新增角色時只需在 roleConfig 加一筆，不需修改判斷邏輯（開放封閉原則）。
 */
import { Badge } from '@/components/ui/badge'

type RoleBadgeProps = {
  role: string
}

/** 角色對應的顯示文字與 Badge variant */
const roleConfig: Record<
  string,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  admin: { label: '管理員', variant: 'default' },
  team_member: { label: '團隊成員', variant: 'secondary' },
  client: { label: '客戶', variant: 'outline' },
}

export function RoleBadge({ role }: RoleBadgeProps) {
  // 未知角色 fallback：顯示原始 role 字串，使用 outline 樣式
  const config = roleConfig[role] ?? {
    label: role,
    variant: 'outline' as const,
  }

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  )
}
