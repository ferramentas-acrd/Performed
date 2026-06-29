'use client'

import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, User, Bot, Paperclip, FileText, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ConversationMessage } from '@/app/actions/collaborator'

type SenderFilter = 'all' | 'human' | 'assistant'

interface Props {
  messages: ConversationMessage[]
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text
  const re = new RegExp(`(${escapeRegExp(query.trim())})`, 'gi')
  const parts = text.split(re)
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="rounded-sm bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-500/40">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function countMatches(text: string, query: string) {
  const q = query.trim()
  if (!q) return 0
  const re = new RegExp(escapeRegExp(q), 'gi')
  return (text.match(re) ?? []).length
}

export function ConversationReader({ messages }: Props) {
  const [query, setQuery] = useState('')
  const [sender, setSender] = useState<SenderFilter>('all')

  const { visible, totalMatches } = useMemo(() => {
    const q = query.trim().toLowerCase()
    let matches = 0
    const visible = messages.filter(m => {
      if (sender !== 'all' && m.sender !== sender) return false
      if (q) {
        const c = countMatches(m.text, query)
        if (c === 0) return false
        matches += c
      }
      return true
    })
    return { visible, totalMatches: matches }
  }, [messages, query, sender])

  const counts = useMemo(() => {
    const human = messages.filter(m => m.sender === 'human').length
    const assistant = messages.filter(m => m.sender === 'assistant').length
    return { human, assistant, all: messages.length }
  }, [messages])

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-md border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar no conteúdo das mensagens…"
            className="pl-8 pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <FilterButton active={sender === 'all'} onClick={() => setSender('all')}>
            Todas <span className="ml-1 text-muted-foreground">{counts.all}</span>
          </FilterButton>
          <FilterButton active={sender === 'human'} onClick={() => setSender('human')}>
            <User className="h-3.5 w-3.5" /> Humano <span className="ml-1 text-muted-foreground">{counts.human}</span>
          </FilterButton>
          <FilterButton active={sender === 'assistant'} onClick={() => setSender('assistant')}>
            <Bot className="h-3.5 w-3.5" /> Claude <span className="ml-1 text-muted-foreground">{counts.assistant}</span>
          </FilterButton>
        </div>
      </div>

      {query.trim() && (
        <p className="px-1 text-xs text-muted-foreground">
          {totalMatches > 0
            ? `${totalMatches} ocorrência(s) em ${visible.length} mensagem(ns)`
            : 'Nenhuma ocorrência encontrada.'}
        </p>
      )}

      {/* Thread */}
      <div className="space-y-3">
        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma mensagem para os filtros atuais.
          </p>
        ) : (
          visible.map(m => <MessageBubble key={m.uuid} message={m} query={query} />)
        )}
      </div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="h-8 gap-1 text-xs"
    >
      {children}
    </Button>
  )
}

function MessageBubble({ message, query }: { message: ConversationMessage; query: string }) {
  const isHuman = message.sender === 'human'
  const hasQuery = query.trim().length > 0

  return (
    <Card className={cn('overflow-hidden', isHuman && 'border-primary/30 bg-primary/5')}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={isHuman ? 'default' : 'secondary'} className="gap-1">
              {isHuman ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
              {isHuman ? 'Humano' : 'Claude'}
            </Badge>
            {message.nFiles > 0 && (
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3 w-3" /> {message.nFiles}
              </Badge>
            )}
            {message.nAttachments > 0 && (
              <Badge variant="outline" className="gap-1">
                <Paperclip className="h-3 w-3" /> {message.nAttachments}
              </Badge>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {message.createdAt
              ? format(new Date(message.createdAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })
              : '—'}
          </span>
        </div>

        {message.text.trim().length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            (mensagem sem texto — apenas anexos/arquivos)
          </p>
        ) : hasQuery ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {highlight(message.text, query)}
          </p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words text-sm leading-relaxed">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
