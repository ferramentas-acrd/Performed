import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { toHttpResponse } from '@/lib/auth/errors'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const user = await requireAdmin()
    const supabase = await createClient()

    const { data } = await supabase
      .from('user_totals')
      .select('account_uuid, full_name, email, is_active, conversations, messages, human_msgs, assistant_msgs, files_produced, active_days, last_activity')
      .order('messages', { ascending: false })

    // Audit the export action
    const admin = createServiceClient()
    await admin.from('audit_event').insert({
      actor_email: user.email,
      action: 'export_csv',
      target: 'user_totals',
    })

    const header = 'name,email,active,conversations,messages,human_msgs,assistant_msgs,files_produced,active_days,last_activity\n'
    const rows = (data ?? []).map(u =>
      [u.full_name, u.email, u.is_active, u.conversations, u.messages, u.human_msgs,
       u.assistant_msgs, u.files_produced, u.active_days, u.last_activity]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n')

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="performed-usage.csv"',
      },
    })
  } catch (err) {
    const { message, status } = toHttpResponse(err)
    return NextResponse.json({ message }, { status })
  }
}
