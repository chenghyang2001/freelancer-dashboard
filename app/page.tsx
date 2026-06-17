import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

// 根路由：依登入狀態導向 dashboard 或 login
// 純 Server Component，不做任何渲染，只做 redirect
export default async function Home() {
  const session = await auth()
  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
