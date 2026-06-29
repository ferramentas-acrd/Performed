import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { toHttpResponse } from '@/lib/auth/errors'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const runId = request.nextUrl.searchParams.get('runId')
    if (!runId) return NextResponse.json({ message: 'runId required' }, { status: 400 })

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('import_run')
      .select('*')
      .eq('id', runId)
      .single()

    if (error || !data) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    const { message, status } = toHttpResponse(err)
    return NextResponse.json({ message }, { status })
  }
}
