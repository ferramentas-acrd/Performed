import { subDays, startOfDay, endOfDay } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getCollaborator } from '@/app/actions/collaborator'
import { listUsers } from '@/app/actions/team'
import { IdentityCard } from '@/app/components/collaborator/IdentityCard'
import { KpiCard } from '@/app/components/overview/KpiCard'
import { MessagesPerDayChart } from '@/app/components/collaborator/MessagesPerDayChart'
import { HourHeatmap } from '@/app/components/collaborator/HourHeatmap'
import { ConversationList } from '@/app/components/collaborator/ConversationList'
import { FocusPanel } from '@/app/components/collaborator/FocusPanel'
import { DateRangePicker } from '@/app/components/filters/DateRangePicker'
import { CollaboratorSelect } from '@/app/components/filters/CollaboratorSelect'
import { Button } from '@/components/ui/button'

type Props = {
  params: Promise<{ accountUuid: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function CollaboratorPage({ params, searchParams }: Props) {
  const { accountUuid } = await params
  const sp = await searchParams
  const from = sp.from ?? startOfDay(subDays(new Date(), 90)).toISOString()
  const to = sp.to ?? endOfDay(new Date()).toISOString()

  const [detail, users] = await Promise.all([
    getCollaborator({ accountUuid, from, to }),
    listUsers(),
  ])

  const { user, kpis, dailyTrend, hourHeatmap, conversations, memory } = detail
  const hasActivity = kpis.messages > 0

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/?from=${from}&to=${to}`}>
            <Button variant="ghost" size="sm" className="gap-1 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <CollaboratorSelect users={users} value={accountUuid} from={from} to={to} />
          <DateRangePicker value={{ from, to }} onChange={() => {}} />
        </div>
      </div>

      {/* Identity */}
      <IdentityCard
        fullName={user.fullName}
        email={user.email}
        isActive={user.isActive}
        lastImport={kpis.lastActivity}
      />

      {/* KPI cards */}
      {!hasActivity ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-sm font-medium">Nenhuma atividade no período selecionado.</p>
          {kpis.lastActivity && (
            <p className="text-xs text-muted-foreground mt-1">
              Última atividade registrada: {new Date(kpis.lastActivity).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard title="Conversas" value={kpis.conversations} />
            <KpiCard title="Mensagens" value={kpis.messages} />
            <KpiCard title="Média msgs/conversa" value={kpis.avgMsgsPerConvo} />
            <KpiCard title="Dias ativos" value={kpis.activeDays} />
            <KpiCard title="Maior sequência" value={kpis.longestStreak} sub="dias seguidos" />
            <KpiCard title="Arquivos gerados" value={kpis.filesProduced} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MessagesPerDayChart data={dailyTrend} />
            <HourHeatmap data={hourHeatmap} />
          </div>

          {/* Conversations */}
          <ConversationList conversations={conversations} />
        </>
      )}

      {/* Focus panel — always visible regardless of activity */}
      <FocusPanel memory={memory} />
    </div>
  )
}
