import { createClient } from '@/lib/supabase/server'
import { ForbiddenError, UnauthorizedError } from './errors'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  const allowList = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  const { data: row } = await supabase
    .from('app_user')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()

  const isAdmin =
    allowList.includes(user.email!.toLowerCase()) && row?.role === 'admin'

  if (!isAdmin) throw new ForbiddenError()
  return user
}
