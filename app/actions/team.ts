'use server'

import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const RangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
})

export type UserTotalRow = {
  accountUuid: string
  fullName: string | null
  email: string | null
  isActive: boolean
  conversations: number
  messages: number
  humanMsgs: number
  assistantMsgs: number
  filesProduced: number
  attachmentsIn: number
  activeDays: number
  firstActivity: string | null
  lastActivity: string | null
}

export type DailyTrendRow = {
  day: string
  messages: number
  humanMsgs: number
  assistantMsgs: number
}

export type TeamOverview = {
  totals: {
    conversations: number
    messages: number
    humanMsgs: number
    assistantMsgs: number
    filesProduced: number
    attachmentsIn: number
    activeUsers: number
  }
  perUser: UserTotalRow[]
  dailyTrend: DailyTrendRow[]
  adoptionRisk: UserTotalRow[]
  lastImport: string | null
}

export async function getTeamOverview(input: unknown): Promise<TeamOverview> {
  await requireAdmin()
  const { from, to } = RangeSchema.parse(input)
  const supabase = await createClient()

  const [usersRes, trendRes, lastImportRes] = await Promise.all([
    supabase
      .from('app_user')
      .select(`
        account_uuid, full_name, email, is_active,
        conversation!inner(uuid, created_at),
        message(uuid, sender, n_files, n_attachments, created_at)
      `)
      .order('full_name'),
    supabase
      .from('daily_user_activity')
      .select('day, messages, human_msgs, assistant_msgs')
      .gte('day', from)
      .lte('day', to)
      .order('day'),
    supabase
      .from('import_run')
      .select('finished_at')
      .eq('status', 'succeeded')
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Build per-user aggregates filtered by range
  const perUser: UserTotalRow[] = await buildPerUserInRange(supabase, from, to)

  // Aggregate totals
  const totals = perUser.reduce(
    (acc, u) => ({
      conversations: acc.conversations + u.conversations,
      messages: acc.messages + u.messages,
      humanMsgs: acc.humanMsgs + u.humanMsgs,
      assistantMsgs: acc.assistantMsgs + u.assistantMsgs,
      filesProduced: acc.filesProduced + u.filesProduced,
      attachmentsIn: acc.attachmentsIn + u.attachmentsIn,
      activeUsers: acc.activeUsers + (u.messages > 0 ? 1 : 0),
    }),
    { conversations: 0, messages: 0, humanMsgs: 0, assistantMsgs: 0, filesProduced: 0, attachmentsIn: 0, activeUsers: 0 }
  )

  // Daily trend: aggregate across users
  const trendMap = new Map<string, DailyTrendRow>()
  for (const row of trendRes.data ?? []) {
    const day = (row.day as string).slice(0, 10)
    if (day < from.slice(0, 10) || day > to.slice(0, 10)) continue
    const existing = trendMap.get(day) ?? { day, messages: 0, humanMsgs: 0, assistantMsgs: 0 }
    trendMap.set(day, {
      day,
      messages: existing.messages + Number(row.messages),
      humanMsgs: existing.humanMsgs + Number(row.human_msgs),
      assistantMsgs: existing.assistantMsgs + Number(row.assistant_msgs),
    })
  }
  const dailyTrend = Array.from(trendMap.values()).sort((a, b) => a.day.localeCompare(b.day))

  const adoptionRisk = perUser
    .filter(u => u.isActive)
    .sort((a, b) => a.messages - b.messages)
    .slice(0, 5)

  return {
    totals,
    perUser,
    dailyTrend,
    adoptionRisk,
    lastImport: lastImportRes.data?.finished_at ?? null,
  }
}

async function buildPerUserInRange(supabase: Awaited<ReturnType<typeof createClient>>, from: string, to: string): Promise<UserTotalRow[]> {
  const { data: users } = await supabase.from('app_user').select('account_uuid, full_name, email, is_active')

  if (!users) return []

  const results: UserTotalRow[] = await Promise.all(
    users.map(async u => {
      const [convsRes, msgsRes] = await Promise.all([
        supabase.from('conversation').select('uuid', { count: 'exact', head: true })
          .eq('account_uuid', u.account_uuid).gte('created_at', from).lte('created_at', to),
        supabase.from('message').select('sender, n_files, n_attachments, created_at')
          .eq('account_uuid', u.account_uuid).gte('created_at', from).lte('created_at', to),
      ])
      const msgs = msgsRes.data ?? []
      const humanMsgs = msgs.filter(m => m.sender === 'human').length
      const files = msgs.reduce((s, m) => s + (m.n_files ?? 0), 0)
      const atts = msgs.reduce((s, m) => s + (m.n_attachments ?? 0), 0)
      const days = new Set(msgs.map(m => m.created_at?.slice(0, 10)).filter(Boolean)).size
      const sorted = msgs.map(m => m.created_at).filter(Boolean).sort()
      return {
        accountUuid: u.account_uuid,
        fullName: u.full_name,
        email: u.email,
        isActive: u.is_active,
        conversations: convsRes.count ?? 0,
        messages: msgs.length,
        humanMsgs,
        assistantMsgs: msgs.length - humanMsgs,
        filesProduced: files,
        attachmentsIn: atts,
        activeDays: days,
        firstActivity: sorted[0] ?? null,
        lastActivity: sorted[sorted.length - 1] ?? null,
      }
    })
  )
  return results.sort((a, b) => b.messages - a.messages)
}

export async function listUsers() {
  await requireAdmin()
  const supabase = await createClient()

  const { data } = await supabase
    .from('user_totals')
    .select('account_uuid, full_name, email, is_active, messages')
    .order('messages', { ascending: false })

  return (data ?? []).map(u => ({
    accountUuid: u.account_uuid as string,
    fullName: u.full_name as string | null,
    email: u.email as string | null,
    isActive: u.is_active as boolean,
    messages: Number(u.messages),
  }))
}
