import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  conversations: Array<{ uuid: string; name: string | null; messageCount: number; createdAt: string | null }>
  accountUuid: string
  from?: string
  to?: string
}

export function ConversationList({ conversations, accountUuid, from, to }: Props) {
  const buildHref = (conversationUuid: string) => {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    return `/u/${accountUuid}/c/${conversationUuid}${qs.toString() ? `?${qs}` : ''}`
  }

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
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map(c => (
                  <TableRow key={c.uuid} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="max-w-[400px] truncate p-0">
                      <Link href={buildHref(c.uuid)} className="block px-4 py-2.5">
                        {c.name || <span className="text-muted-foreground italic">Sem título</span>}
                      </Link>
                    </TableCell>
                    <TableCell className="p-0 text-right">
                      <Link href={buildHref(c.uuid)} className="block px-4 py-2.5">
                        {c.messageCount}
                      </Link>
                    </TableCell>
                    <TableCell className="p-0 text-sm text-muted-foreground">
                      <Link href={buildHref(c.uuid)} className="block px-4 py-2.5">
                        {c.createdAt ? format(new Date(c.createdAt), 'dd/MM/yy', { locale: ptBR }) : '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="p-0 text-right">
                      <Link href={buildHref(c.uuid)} className="block px-4 py-2.5">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
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
