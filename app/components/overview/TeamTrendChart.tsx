'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { DailyTrendRow } from '@/app/actions/team'

interface Props {
  data: DailyTrendRow[]
  loading?: boolean
}

export function TeamTrendChart({ data, loading }: Props) {
  if (loading) return (
    <Card>
      <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
      <CardContent><Skeleton className="h-48 w-full" /></CardContent>
    </Card>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Atividade do time por dia</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma atividade no período selecionado.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={d => String(d)} />
              <Legend />
              <Line type="monotone" dataKey="messages" name="Total" stroke="var(--chart-1)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="humanMsgs" name="Humano" stroke="var(--chart-2)" dot={false} />
              <Line type="monotone" dataKey="assistantMsgs" name="Claude" stroke="var(--chart-3)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
