import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  memory: { content: string; capturedAt: string } | null
}

export function FocusPanel({ memory }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Perfil de foco (memória Claude)
          {memory && (
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              capturado em {format(new Date(memory.capturedAt), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!memory ? (
          <p className="text-sm text-muted-foreground">Nenhum perfil de memória capturado ainda.</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
            <ReactMarkdown>{memory.content}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
