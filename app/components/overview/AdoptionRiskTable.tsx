import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle } from 'lucide-react'
import type { UserTotalRow } from '@/app/actions/team'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props { users: UserTotalRow[] }

export function AdoptionRiskTable({ users }: Props) {
  const risk = users.filter(u => u.isActive && u.messages < 50).slice(0, 6)
  if (risk.length === 0) return null

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Risco de adoção – usuários com baixa atividade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead className="text-right">Mensagens</TableHead>
              <TableHead>Última atividade</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {risk.map(u => (
              <TableRow key={u.accountUuid}>
                <TableCell className="font-medium">{u.fullName ?? 'Desconhecido'}</TableCell>
                <TableCell className="text-right">{u.messages.toLocaleString('pt-BR')}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {u.lastActivity ? format(new Date(u.lastActivity), 'dd/MM/yy', { locale: ptBR }) : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={u.messages === 0 ? 'destructive' : 'secondary'}>
                    {u.messages === 0 ? 'Sem uso' : 'Baixo uso'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
