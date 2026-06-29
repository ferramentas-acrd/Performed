import { Suspense } from 'react'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { getTeamOverview, listUsers } from '@/app/actions/team'
import { KpiCard } from '@/app/components/overview/KpiCard'
import { TeamTrendChart } from '@/app/components/overview/TeamTrendChart'
import { PerUserBarChart } from '@/app/components/overview/PerUserBarChart'
import { AdoptionRiskTable } from '@/app/components/overview/AdoptionRiskTable'
import { UserTable } from '@/app/components/overview/UserTable'
import { DateRangePicker } from '@/app/components/filters/DateRangePicker'
import { CollaboratorSelect } from '@/app/components/filters/CollaboratorSelect'
import { Skeleton } from '@/components/ui/skeleton'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type SearchParams = { from?: string; to?: string }

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const from = sp.from ?? startOfDay(subDays(new Date(), 90)).toISOString()
  const to = sp.to ?? endOfDay(new Date()).toISOString()

  const [overview, users] = await Promise.all([
    getTeamOverview({ from, to }),
    listUsers(),
  ])

  const { totals, perUser, dailyTrend, adoptionRisk, lastImport } = overview

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker value={{ from, to }} />
          <CollaboratorSelect users={users} from={from} to={to} />
        </div>
        <div className="flex items-center gap-2">
          {lastImport && (
            <span className="text-xs text-muted-foreground">
              Dados de {new Date(lastImport).toLocaleDateString('pt-BR')}
            </span>
          )}
          <Link href="/api/export" target="_blank">
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Conversas" value={totals.conversations} />
        <KpiCard title="Mensagens" value={totals.messages}
          sub={`${totals.humanMsgs.toLocaleString('pt-BR')} humanas · ${totals.assistantMsgs.toLocaleString('pt-BR')} Claude`} />
        <KpiCard title="Usuários ativos" value={totals.activeUsers} />
        <KpiCard title="Arquivos gerados" value={totals.filesProduced} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TeamTrendChart data={dailyTrend} />
        <PerUserBarChart data={perUser} />
      </div>

      {/* Adoption risk */}
      <AdoptionRiskTable users={adoptionRisk} />

      {/* Per-user table */}
      <div>
        <h2 className="text-sm font-medium mb-3">Todos os colaboradores</h2>
        <UserTable users={perUser} from={from} to={to} />
      </div>
    </div>
  )
}
