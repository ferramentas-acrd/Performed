'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { UploadCloud, CheckCircle, XCircle } from 'lucide-react'

type RunStatus = 'idle' | 'uploading' | 'running' | 'succeeded' | 'failed'

interface ImportRun {
  id: number
  status: string
  file_name: string
  conversations_upserted: number
  messages_upserted: number
  memories_upserted: number
  orphans_created: number
  started_at: string
  finished_at: string | null
  error: string | null
}

interface Props {
  pastRuns: ImportRun[]
}

export function ImportPanel({ pastRuns }: Props) {
  const [status, setStatus] = useState<RunStatus>('idle')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setStatus('uploading')
    setProgress(20)
    setMessage('Enviando arquivo…')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/import', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      setProgress(60)
      setStatus('running')
      setMessage(`Importação iniciada (run #${json.runId}). Recarregue para ver o status.`)
      setProgress(100)
    } catch (err) {
      setStatus('failed')
      setMessage(String(err instanceof Error ? err.message : err))
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Importar export do Claude</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".json,.zip" className="hidden" id="import-file" />
            <label htmlFor="import-file"
              className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted text-sm">
              <UploadCloud className="h-4 w-4" />
              Escolher arquivo (.json / .zip)
            </label>
            <Button onClick={handleUpload} disabled={status === 'uploading' || status === 'running'}>
              Importar
            </Button>
          </div>
          {status !== 'idle' && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className={`text-sm ${status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
                {message}
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Máximo 200 MB. A importação é idempotente — pode reenviar o mesmo export com segurança.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Histórico de importações</CardTitle>
        </CardHeader>
        <CardContent>
          {pastRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma importação ainda.</p>
          ) : (
            <div className="space-y-3">
              {pastRuns.map(run => (
                <div key={run.id} className="flex items-start justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {run.status === 'succeeded' ? <CheckCircle className="h-4 w-4 text-green-500" /> : null}
                      {run.status === 'failed' ? <XCircle className="h-4 w-4 text-destructive" /> : null}
                      {run.file_name}
                    </div>
                    {run.status === 'succeeded' && (
                      <p className="text-muted-foreground mt-1">
                        {run.conversations_upserted} conversas · {run.messages_upserted} mensagens · {run.memories_upserted} memórias
                      </p>
                    )}
                    {run.error && <p className="text-destructive mt-1 text-xs">{run.error}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <Badge variant={run.status === 'succeeded' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                      {run.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(run.started_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
