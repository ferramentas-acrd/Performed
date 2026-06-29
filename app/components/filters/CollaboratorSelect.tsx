'use client'

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type UserOption = {
  accountUuid: string
  fullName: string | null
  isActive: boolean
  messages: number
}

interface Props {
  users: UserOption[]
  value?: string
  from: string
  to: string
}

export function CollaboratorSelect({ users, value, from, to }: Props) {
  const router = useRouter()

  function handleChange(v: string | null) {
    if (!v) return
    if (v === '__overview') {
      router.push(`/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
    } else {
      router.push(`/u/${v}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
    }
  }

  return (
    <Select value={value ?? '__overview'} onValueChange={handleChange}>
      <SelectTrigger className="min-w-[200px]">
        <SelectValue placeholder="Ver colaborador…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__overview">Visão geral do time</SelectItem>
        {users.filter(u => u.isActive).map(u => (
          <SelectItem key={u.accountUuid} value={u.accountUuid}>
            {u.fullName ?? u.accountUuid.slice(0, 8)} · {u.messages.toLocaleString('pt-BR')} msgs
          </SelectItem>
        ))}
        {users.filter(u => !u.isActive).length > 0 && (
          <>
            <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-2">Inativos / desconhecidos</div>
            {users.filter(u => !u.isActive).map(u => (
              <SelectItem key={u.accountUuid} value={u.accountUuid} className="text-muted-foreground">
                {u.fullName ?? 'Conta desconhecida'}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  )
}
