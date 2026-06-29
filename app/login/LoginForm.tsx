'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BarChart3 } from 'lucide-react'
import { createAccount } from '@/app/actions/auth'

type Mode = 'password' | 'magic'

const MAGIC_COOLDOWN_SECONDS = 60

export default function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError ? errorMessage(initialError) : '')
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  function startCooldown() {
    setCooldown(MAGIC_COOLDOWN_SECONDS)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function supabaseClient() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp) {
        const result = await createAccount(email, password)
        if (!result.ok) {
          setError(result.error)
          setLoading(false)
          return
        }
      }

      const supabase = supabaseClient()
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      router.replace('/')
      router.refresh()
    } catch {
      setError('Algo deu errado. Tente novamente.')
      setLoading(false)
    }
  }

  async function handleMagicSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cooldown > 0) return
    setLoading(true)
    setError('')

    const supabase = supabaseClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    setLoading(false)
    if (err) setError(err.message)
    else {
      setSent(true)
      startCooldown()
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <CardTitle>Performed</CardTitle>
        <CardDescription>Dashboard de uso do Claude · Acroud Media</CardDescription>
      </CardHeader>
      <CardContent>
        {mode === 'magic' && sent ? (
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Link enviado!</p>
            <p className="text-sm text-muted-foreground">
              Verifique seu e-mail <strong>{email}</strong> e clique no link para entrar.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setSent(false)
                setMode('password')
              }}
            >
              Voltar ao login
            </Button>
          </div>
        ) : mode === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Aguarde…' : isSignUp ? 'Criar conta' : 'Entrar'}
            </Button>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                className="hover:text-foreground"
                onClick={() => {
                  setIsSignUp(v => !v)
                  setError('')
                }}
              >
                {isSignUp ? 'Já tenho conta' : 'Criar conta'}
              </button>
              <button
                type="button"
                className="hover:text-foreground"
                onClick={() => {
                  setMode('magic')
                  setError('')
                }}
              >
                Entrar com magic link
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMagicSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || cooldown > 0}>
              {loading
                ? 'Enviando…'
                : cooldown > 0
                  ? `Aguarde ${cooldown}s`
                  : 'Enviar magic link'}
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              <button
                type="button"
                className="hover:text-foreground"
                onClick={() => {
                  setMode('password')
                  setError('')
                }}
              >
                Entrar com senha
              </button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

function errorMessage(code: string): string {
  switch (code) {
    case 'auth_failed':
      return 'Não foi possível concluir o login. Tente novamente.'
    default:
      return 'Ocorreu um erro de autenticação.'
  }
}
