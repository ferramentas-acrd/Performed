'use client'

import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { UserTotalRow } from '@/app/actions/team'

interface Props {
  users: UserTotalRow[]
  from: string
  to: string
}

export function UserTable({ users, from, to }: Props) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Colaborador</TableHead>
            <TableHead className="text-right">Conversas</TableHead>
            <TableHead className="text-right">Mensagens</TableHead>
            <TableHead className="text-right">Arquivos</TableHead>
            <TableHead className="text-right">Dias ativos</TableHead>
            <TableHead>Última atividade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(u => (
            <TableRow key={u.accountUuid} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <Link href={`/u/${u.accountUuid}?from=${from}&to=${to}`} className="flex items-center gap-2">
                  <span className="font-medium">
                    {u.fullName ?? <span className="text-muted-foreground italic">Conta desconhecida</span>}
                  </span>
                  {!u.isActive && <Badge variant="outline" className="text-xs">inativo</Badge>}
                </Link>
              </TableCell>
              <TableCell className="text-right">{u.conversations.toLocaleString('pt-BR')}</TableCell>
              <TableCell className="text-right">{u.messages.toLocaleString('pt-BR')}</TableCell>
              <TableCell className="text-right">{u.filesProduced.toLocaleString('pt-BR')}</TableCell>
              <TableCell className="text-right">{u.activeDays}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {u.lastActivity ? format(new Date(u.lastActivity), 'dd/MM/yy HH:mm', { locale: ptBR }) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
