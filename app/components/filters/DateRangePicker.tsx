'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type DateRangeValue = { from: string; to: string }

const PRESETS = [
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 90 dias', days: 90 },
]

interface Props {
  value: DateRangeValue
  onChange?: (v: DateRangeValue) => void
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const from = new Date(value.from)
  const to = new Date(value.to)

  function navigate(newFrom: string, newTo: string) {
    if (onChange) onChange({ from: newFrom, to: newTo })
    router.push(`${pathname}?from=${encodeURIComponent(newFrom)}&to=${encodeURIComponent(newTo)}`)
  }

  function handleSelect(range: DateRange | undefined) {
    if (range?.from && range?.to) {
      navigate(startOfDay(range.from).toISOString(), endOfDay(range.to).toISOString())
      setOpen(false)
    }
  }

  const label = `${format(from, 'dd/MM/yy', { locale: ptBR })} – ${format(to, 'dd/MM/yy', { locale: ptBR })}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Base UI Popover.Trigger does not support asChild; apply button styles directly */}
      <PopoverTrigger
        className="inline-flex min-w-[240px] items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-normal transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex gap-1 p-2 border-b">
          {PRESETS.map(p => (
            <Button key={p.days} variant="ghost" size="sm"
              onClick={() => {
                navigate(
                  startOfDay(subDays(new Date(), p.days)).toISOString(),
                  endOfDay(new Date()).toISOString()
                )
                setOpen(false)
              }}>
              {p.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="range"
          selected={{ from, to }}
          onSelect={handleSelect}
          numberOfMonths={2}
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  )
}
