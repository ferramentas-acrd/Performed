'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { UserTotalRow } from '@/app/actions/team'

interface Props {
  data: UserTotalRow[]
  loading?: boolean
}

export function PerUserBarChart({ data, loading }: Props) {
  if (loading) return (
    <Card>
      <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
      <CardContent><Skeleton className="h-48 w-full" /></CardContent>
    </Card>
  )

  const chartData = data
    .filter(u => u.isActive)
    .slice(0, 10)
    .map(u => ({
      name: u.fullName?.split(' ')[0] ?? u.accountUuid.slice(0, 6),
      Mensagens: u.messages,
      Conversas: u.conversations,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Mensagens &amp; conversas por colaborador</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Mensagens" fill="var(--chart-1)" radius={[4,4,0,0]} />
              <Bar dataKey="Conversas" fill="var(--chart-2)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
