#!/usr/bin/env tsx
/**
 * Streaming importer for Claude data exports.
 * Usage: pnpm import --conversations <path> --memories <path> --users <path>
 * Safe to re-run: all upserts are idempotent by UUID.
 */

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const BATCH = 300

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ─── Arg parsing ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
function getArg(name: string) {
  const i = args.indexOf(`--${name}`)
  return i !== -1 ? args[i + 1] : undefined
}
const conversationsPath = getArg('conversations') ?? '../conversations.json'
const memoriesPath = getArg('memories') ?? '../memories.json'
const usersPath = getArg('users') ?? '../users.json'

function resolvePath(p: string) {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)
}

// ─── Mappers ─────────────────────────────────────────────────────────────────
function mapConversation(c: Record<string, unknown>) {
  return {
    uuid: c.uuid as string,
    account_uuid: (c.account as Record<string, string>)?.uuid ?? null,
    name: (c.name as string) ?? null,
    summary: (c.summary as string) || null,
    message_count: ((c.chat_messages as unknown[]) ?? []).length,
    created_at: (c.created_at as string) ?? null,
    updated_at: (c.updated_at as string) ?? null,
  }
}

function mapMessage(conv: Record<string, unknown>, m: Record<string, unknown>) {
  const text = ((m.text as string) ?? '').normalize('NFC')
  return {
    uuid: m.uuid as string,
    conversation_uuid: conv.uuid as string,
    account_uuid: (conv.account as Record<string, string>)?.uuid ?? null,
    sender: m.sender as string,
    text,
    char_count: text.length,
    n_files: ((m.files as unknown[]) ?? []).length,
    n_attachments: ((m.attachments as unknown[]) ?? []).length,
    parent_uuid: (m.parent_message_uuid as string) || null,
    created_at: (m.created_at as string) ?? null,
  }
}

async function ensureUser(uuid: string, orphanCount: { n: number }) {
  const { error } = await supabase.from('app_user').upsert(
    { account_uuid: uuid, full_name: 'Unknown / former account', email: null, role: 'member', is_active: false, source: 'orphan' } as Record<string, unknown>,
    { onConflict: 'account_uuid', ignoreDuplicates: true }
  )
  if (!error) orphanCount.n++
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function flush(table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const { error } = await supabase.from(table).upsert(rows as never, { onConflict: 'uuid' })
  if (error) throw new Error(`Flush ${table}: ${error.message}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Performed importer starting…')

  const { data: run } = await supabase.from('import_run').insert({
    source: 'manual_upload',
    file_name: path.basename(conversationsPath),
    file_bytes: fs.statSync(resolvePath(conversationsPath)).size,
    status: 'running',
  }).select('id').single()
  const runId = run?.id

  const counts = { conversations: 0, messages: 0, memories: 0 }
  const orphanCount = { n: 0 }
  const knownAccounts = new Set<string>()

  try {
    // 1. Seed users from users.json
    if (fs.existsSync(resolvePath(usersPath))) {
      const users = JSON.parse(fs.readFileSync(resolvePath(usersPath), 'utf8')) as Array<Record<string, unknown>>
      for (const u of users) {
        knownAccounts.add(u.uuid as string)
        await supabase.from('app_user').upsert(
          {
            account_uuid: u.uuid,
            full_name: u.full_name ?? null,
            email: u.email_address ?? null,
            phone: u.verified_phone_number ?? null,
            role: 'member',
            is_active: true,
            source: 'export',
          } as Record<string, unknown>,
          { onConflict: 'account_uuid' }
        )
      }
      console.log(`Users seeded: ${users.length}`)
    }

    // 2. Stream conversations using incremental JSON parsing
    // Use dynamic import to avoid TypeScript issues with stream-json's types
    const { parser } = await import('stream-json')
    const { streamArray } = await import('stream-json/streamers/StreamArray.js')

    const pipeline = (fs.createReadStream(resolvePath(conversationsPath)) as unknown as NodeJS.ReadableStream)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .pipe(parser() as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .pipe(streamArray() as any)

    let convBatch: ReturnType<typeof mapConversation>[] = []
    let msgBatch: ReturnType<typeof mapMessage>[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const { value: conv } of pipeline as AsyncIterable<{ value: Record<string, unknown> }>) {
      const accountUuid = (conv.account as Record<string, string>)?.uuid
      if (accountUuid && !knownAccounts.has(accountUuid)) {
        await ensureUser(accountUuid, orphanCount)
        knownAccounts.add(accountUuid)
      }

      const mapped = mapConversation(conv)
      if (mapped.uuid) convBatch.push(mapped)

      for (const m of (conv.chat_messages as Record<string, unknown>[]) ?? []) {
        if (!m.uuid || !['human', 'assistant'].includes(m.sender as string)) continue
        msgBatch.push(mapMessage(conv, m))
        if (msgBatch.length >= BATCH) {
          await flush('message', msgBatch)
          counts.messages += msgBatch.length
          msgBatch = []
        }
      }

      if (convBatch.length >= BATCH) {
        await flush('conversation', convBatch)
        counts.conversations += convBatch.length
        console.log(`  …${counts.conversations} conversations, ${counts.messages} messages`)
        convBatch = []
      }
    }

    if (convBatch.length) { await flush('conversation', convBatch); counts.conversations += convBatch.length }
    if (msgBatch.length) { await flush('message', msgBatch); counts.messages += msgBatch.length }
    console.log(`Conversations: ${counts.conversations}, Messages: ${counts.messages}`)

    // 3. Import memories
    if (fs.existsSync(resolvePath(memoriesPath))) {
      const memories = JSON.parse(fs.readFileSync(resolvePath(memoriesPath), 'utf8')) as Array<Record<string, unknown>>
      for (const mem of memories) {
        const content = ((mem.conversations_memory as string) ?? '').normalize('NFC')
        if (!content) continue
        const hash = crypto.createHash('sha256').update(content).digest('hex')
        const { error } = await supabase.from('memory_snapshot').upsert(
          { account_uuid: mem.account_uuid, content, content_hash: hash } as Record<string, unknown>,
          { onConflict: 'account_uuid,content_hash', ignoreDuplicates: true }
        )
        if (!error) counts.memories++
      }
      console.log(`Memory snapshots: ${counts.memories}`)
    }

    // 4. Mark succeeded
    await supabase.from('import_run').update({
      status: 'succeeded',
      conversations_upserted: counts.conversations,
      messages_upserted: counts.messages,
      memories_upserted: counts.memories,
      orphans_created: orphanCount.n,
      finished_at: new Date().toISOString(),
    }).eq('id', runId)

    console.log('✓ Import completed.', counts)
  } catch (err) {
    console.error('Import failed:', err)
    await supabase.from('import_run').update({
      status: 'failed',
      error: String(err),
      finished_at: new Date().toISOString(),
    }).eq('id', runId)
    process.exit(1)
  }
}

main()
