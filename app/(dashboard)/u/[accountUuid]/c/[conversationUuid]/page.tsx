import { ArrowLeft, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getConversationThread } from '@/app/actions/collaborator'
import { ConversationReader } from '@/app/components/collaborator/ConversationReader'
import { Button } from '@/components/ui/button'

type Props = {
  params: Promise<{ accountUuid: string; conversationUuid: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function ConversationPage({ params, searchParams }: Props) {
  const { accountUuid, conversationUuid } = await params
  const sp = await searchParams

  const thread = await getConversationThread({ accountUuid, conversationUuid })
  if (!thread) notFound()

  const { conversation, user, messages } = thread
  const backQuery = new URLSearchParams()
  if (sp.from) backQuery.set('from', sp.from)
  if (sp.to) backQuery.set('to', sp.to)
  const backHref = `/u/${accountUuid}${backQuery.toString() ? `?${backQuery}` : ''}`

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="-ml-2 gap-1">
            <ArrowLeft className="h-4 w-4" />
            Voltar para {user.fullName || user.email || 'colaborador'}
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">
            {conversation.name || <span className="italic text-muted-foreground">Sem título</span>}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {conversation.messageCount.toLocaleString('pt-BR')} mensagens
          {conversation.createdAt &&
            ` · iniciada em ${format(new Date(conversation.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`}
          {user.email && ` · ${user.email}`}
        </p>
        {conversation.summary && (
          <p className="max-w-3xl pt-1 text-sm text-muted-foreground">{conversation.summary}</p>
        )}
      </div>

      <ConversationReader messages={messages} />
    </div>
  )
}
