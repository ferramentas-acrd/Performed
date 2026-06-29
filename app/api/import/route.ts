import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceClient } from '@/lib/supabase/admin'
import { toHttpResponse } from '@/lib/auth/errors'
import { NextRequest, NextResponse } from 'next/server'

const MAX_BYTES = 200 * 1024 * 1024 // 200 MB
const ALLOWED_TYPES = ['application/json', 'application/zip', 'application/x-zip-compressed']

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ message: 'No file provided' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ message: 'File exceeds 200 MB limit' }, { status: 413 })
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.json') && !file.name.endsWith('.zip')) {
      return NextResponse.json({ message: 'Only JSON or ZIP files accepted' }, { status: 415 })
    }

    const admin = createServiceClient()

    // Store raw file to private bucket
    const path = `exports/${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}`
    const bytes = await file.arrayBuffer()
    await admin.storage.from('exports').upload(path, bytes, { contentType: file.type, upsert: false })

    // Create import_run record
    const { data: run } = await admin.from('import_run').insert({
      source: 'manual_upload',
      file_name: file.name,
      file_bytes: file.size,
      status: 'running',
    }).select('id').single()

    return NextResponse.json({ runId: run?.id }, { status: 202 })
  } catch (err) {
    const { message, status } = toHttpResponse(err)
    return NextResponse.json({ message }, { status })
  }
}
