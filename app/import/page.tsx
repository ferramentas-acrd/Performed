import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ImportPanel } from '@/app/components/import/ImportPanel'
import { getImportRuns } from '@/app/actions/collaborator'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function ImportPage() {
  try { await requireAdmin() } catch { redirect('/login') }

  const runs = await getImportRuns()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao dashboard
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Importar dados do Claude</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envie o export da organização (.json). A importação é idempotente — pode reenviar o mesmo arquivo com segurança.
          </p>
        </div>
        <ImportPanel pastRuns={runs as Parameters<typeof ImportPanel>[0]['pastRuns']} />
      </div>
    </div>
  )
}
