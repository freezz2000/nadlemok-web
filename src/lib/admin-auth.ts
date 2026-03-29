import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function requireAdmin() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin-session')

  if (!session?.value) {
    redirect('/admin-login')
  }

  // 토큰에서 username 추출하여 검증
  try {
    const decoded = Buffer.from(session.value, 'base64').toString()
    const username = decoded.split(':')[0]
    if (username !== process.env.ADMIN_USERNAME) {
      redirect('/admin-login')
    }
    return { name: '관리자', role: 'admin' as const }
  } catch {
    redirect('/admin-login')
  }
}
