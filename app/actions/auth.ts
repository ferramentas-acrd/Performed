'use server'

import { createServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.'),
})

type CreateAccountResult = { ok: true } | { ok: false; error: string }

function allowList(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

export async function createAccount(email: string, password: string): Promise<CreateAccountResult> {
  const parsed = CredentialsSchema.safeParse({ email, password })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  const normalizedEmail = parsed.data.email.toLowerCase()
  if (!allowList().includes(normalizedEmail)) {
    return { ok: false, error: 'Este e-mail não está autorizado a criar uma conta.' }
  }

  const admin = createServiceClient()

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: parsed.data.password,
    email_confirm: true,
  })

  let authUserId = created?.user?.id ?? null

  if (createErr) {
    // Existing auth user: set the password instead so they can sign in.
    const existing = await findUserByEmail(admin, normalizedEmail)
    if (!existing) {
      return { ok: false, error: createErr.message }
    }
    const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, {
      password: parsed.data.password,
      email_confirm: true,
    })
    if (updateErr) {
      return { ok: false, error: updateErr.message }
    }
    authUserId = existing.id
  }

  await admin
    .from('app_user')
    .update({ auth_user_id: authUserId })
    .eq('email', normalizedEmail)

  return { ok: true }
}

async function findUserByEmail(
  admin: ReturnType<typeof createServiceClient>,
  email: string
): Promise<{ id: string } | null> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const match = data?.users?.find(u => u.email?.toLowerCase() === email)
  return match ? { id: match.id } : null
}
