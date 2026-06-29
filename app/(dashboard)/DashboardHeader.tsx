'use client'

import Link from 'next/link'
import { BarChart3, LogOut, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function DashboardHeader({ userEmail }: { userEmail: string }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BarChart3 className="h-5 w-5 text-primary" />
            Performed
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/import">
              <Button variant="ghost" size="sm" className="gap-1">
                <UploadCloud className="h-4 w-4" />
                Importar
              </Button>
            </Link>
            <span className="text-xs text-muted-foreground hidden sm:block">{userEmail}</span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
