import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  conversations: Array<{ uuid: string; name: string | null; messageCount: number; createdAt: string | null }>
}

export function ConversationList({ conversations }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Conversas ({conversations.length.toLocaleString('pt-BR')})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center px-4">Nenhuma conversa no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead className="text-right w-24">Mensagens</TableHead>
                  <TableHead className="w-28">Criada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map(c => (
                  <TableRow key={c.uuid}>
                    <TableCell className="max-w-[400px] truncate">
                      {c.name || <span className="text-muted-foreground italic">Sem título</span>}
                    </TableCell>
                    <TableCell className="text-right">{c.messageCount}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.createdAt ? format(new Date(c.createdAt), 'dd/MM/yy', { locale: ptBR }) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
