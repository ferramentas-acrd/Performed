'use server'

import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Params = z.object({
  accountUuid: z.string().uuid(),
  from: z.string().datetime(),
  to: z.string().datetime(),
})

export type CollaboratorKpis = {
  conversations: number
  messages: number
  humanMsgs: number
  assistantMsgs: number
  avgMsgsPerConvo: number
  humanAssistantRatio: number
  activeDays: number
  longestStreak: number
  filesProduced: number
  attachmentsIn: number
  firstActivity: string | null
  lastActivity: string | null
}

export type CollaboratorDetail = {
  user: { accountUuid: string; fullName: string | null; email: string | null; isActive: boolean }
  kpis: CollaboratorKpis
  dailyTrend: Array<{ day: string; messages: number }>
  hourHeatmap: Array<{ dow: number; hour: number; messages: number }>
  conversations: Array<{ uuid: string; name: string | null; messageCount: number; createdAt: string | null }>
  memory: { content: string; capturedAt: string } | null
}

export async function getCollaborator(input: unknown): Promise<CollaboratorDetail> {
  await requireAdmin()
  const { accountUuid, from, to } = Params.parse(input)
  const supabase = await createClient()

  const [userRes, kpisRes, trendRes, heatmapRes, convsRes, memoryRes] = await Promise.all([
    supabase.from('app_user').select('account_uuid, full_name, email, is_active')
      .eq('account_uuid', accountUuid).single(),
    supabase.rpc('collaborator_kpis', { p_uuid: accountUuid, p_from: from, p_to: to }).single(),
    supabase.from('daily_user_activity').select('day, messages')
      .eq('account_uuid', accountUuid).gte('day', from).lte('day', to).order('day'),
    supabase.from('user_hour_heatmap').select('dow, hour, messages')
      .eq('account_uuid', accountUuid),
    supabase.from('conversation').select('uuid, name, message_count, created_at')
      .eq('account_uuid', accountUuid).gte('created_at', from).lte('created_at', to)
      .order('created_at', { ascending: false }).limit(200),
    supabase.from('memory_snapshot').select('content, captured_at')
      .eq('account_uuid', accountUuid).order('captured_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const kpis = kpisRes.data as Record<string, unknown> | null

  // Compute longest streak from daily trend
  const activeDays = (trendRes.data ?? [])
    .map(r => (r.day as string).slice(0, 10))
    .sort()
  const longestStreak = computeLongestStreak(activeDays)

  return {
    user: {
      accountUuid: userRes.data?.account_uuid ?? accountUuid,
      fullName: userRes.data?.full_name ?? null,
      email: userRes.data?.email ?? null,
      isActive: userRes.data?.is_active ?? false,
    },
    kpis: {
      conversations: Number(kpis?.conversations ?? 0),
      messages: Number(kpis?.messages ?? 0),
      humanMsgs: Number(kpis?.human_msgs ?? 0),
      assistantMsgs: Number(kpis?.assistant_msgs ?? 0),
      avgMsgsPerConvo: Number(kpis?.avg_msgs_per_convo ?? 0),
      humanAssistantRatio: Number(kpis?.human_assistant_ratio ?? 0),
      activeDays: Number(kpis?.active_days ?? 0),
      longestStreak,
      filesProduced: Number(kpis?.files_produced ?? 0),
      attachmentsIn: Number(kpis?.attachments_in ?? 0),
      firstActivity: (kpis?.first_activity as string) ?? null,
      lastActivity: (kpis?.last_activity as string) ?? null,
    },
    dailyTrend: (trendRes.data ?? []).map(r => ({
      day: (r.day as string).slice(0, 10),
      messages: Number(r.messages),
    })),
    hourHeatmap: (heatmapRes.data ?? []).map(r => ({
      dow: Number(r.dow),
      hour: Number(r.hour),
      messages: Number(r.messages),
    })),
    conversations: (convsRes.data ?? []).map(c => ({
      uuid: c.uuid as string,
      name: c.name ?? null,
      messageCount: Number(c.message_count),
      createdAt: c.created_at ?? null,
    })),
    memory: memoryRes.data
      ? { content: memoryRes.data.content, capturedAt: memoryRes.data.captured_at }
      : null,
  }
}

function computeLongestStreak(sortedDays: string[]): number {
  if (!sortedDays.length) return 0
  let max = 1, cur = 1
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1])
    const curr = new Date(sortedDays[i])
    const diff = (curr.getTime() - prev.getTime()) / 86400000
    if (diff === 1) { cur++; max = Math.max(max, cur) }
    else if (diff > 1) cur = 1
  }
  return max
}

const ThreadParams = z.object({
  accountUuid: z.string().uuid(),
  conversationUuid: z.string().uuid(),
})

export type ConversationMessage = {
  uuid: string
  sender: 'human' | 'assistant' | string
  text: string
  charCount: number
  nFiles: number
  nAttachments: number
  createdAt: string | null
}

export type ConversationThread = {
  conversation: {
    uuid: string
    name: string | null
    summary: string | null
    messageCount: number
    createdAt: string | null
  }
  user: { accountUuid: string; fullName: string | null; email: string | null }
  messages: ConversationMessage[]
}

export async function getConversationThread(input: unknown): Promise<ConversationThread | null> {
  await requireAdmin()
  const { accountUuid, conversationUuid } = ThreadParams.parse(input)
  const supabase = await createClient()

  const [convRes, userRes, msgsRes] = await Promise.all([
    supabase.from('conversation').select('uuid, name, summary, message_count, created_at')
      .eq('uuid', conversationUuid).eq('account_uuid', accountUuid).maybeSingle(),
    supabase.from('app_user').select('account_uuid, full_name, email')
      .eq('account_uuid', accountUuid).maybeSingle(),
    supabase.from('message').select('uuid, sender, text, char_count, n_files, n_attachments, created_at')
      .eq('conversation_uuid', conversationUuid).eq('account_uuid', accountUuid)
      .order('created_at', { ascending: true }).limit(5000),
  ])

  if (!convRes.data) return null

  return {
    conversation: {
      uuid: convRes.data.uuid as string,
      name: convRes.data.name ?? null,
      summary: convRes.data.summary ?? null,
      messageCount: Number(convRes.data.message_count ?? 0),
      createdAt: convRes.data.created_at ?? null,
    },
    user: {
      accountUuid: userRes.data?.account_uuid ?? accountUuid,
      fullName: userRes.data?.full_name ?? null,
      email: userRes.data?.email ?? null,
    },
    messages: (msgsRes.data ?? []).map(m => ({
      uuid: m.uuid as string,
      sender: (m.sender as string) ?? 'unknown',
      text: (m.text as string) ?? '',
      charCount: Number(m.char_count ?? 0),
      nFiles: Number(m.n_files ?? 0),
      nAttachments: Number(m.n_attachments ?? 0),
      createdAt: m.created_at ?? null,
    })),
  }
}

export async function getImportRuns() {
  await requireAdmin()
  const supabase = await createClient()
  const { data } = await supabase
    .from('import_run')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20)
  return data ?? []
}
