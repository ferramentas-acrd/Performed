'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

interface Props {
  data: Array<{ dow: number; hour: number; messages: number }>
}

export function HourHeatmap({ data }: Props) {
  const maxVal = Math.max(...data.map(d => d.messages), 1)
  const map = new Map(data.map(d => [`${d.dow}_${d.hour}`, d.messages]))

  function opacity(val: number) {
    return Math.round((val / maxVal) * 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Heatmap hora × dia</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem dados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs border-separate" style={{ borderSpacing: 2 }}>
              <thead>
                <tr>
                  <th className="w-6" />
                  {HOURS.map(h => (
                    <th key={h} className="w-5 text-center text-muted-foreground font-normal">{h % 6 === 0 ? h : ''}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dow) => (
                  <tr key={dow}>
                    <td className="text-muted-foreground pr-1">{day}</td>
                    {HOURS.map(h => {
                      const val = map.get(`${dow}_${h}`) ?? 0
                      return (
                        <td key={h} title={`${day} ${h}h: ${val} msgs`}
                          className="h-4 w-5 rounded-sm"
                          style={{ backgroundColor: val > 0 ? `hsl(var(--chart-1) / ${opacity(val)}%)` : 'hsl(var(--muted))' }}
                        />
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
