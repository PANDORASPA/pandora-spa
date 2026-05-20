import { NextResponse } from 'next/server'
import { guardMutationRequest } from '../../../../lib/security/request-guards'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'

export async function PATCH(request) {
  try {
    const guardError = await guardMutationRequest(request, {
      rateLimit: { scope: 'account.profile.patch', limit: 12, windowMs: 60_000 },
    })
    if (guardError) return guardError

    const supabase = getServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      return NextResponse.json({ error: '請先登入會員帳號' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const fullName = String(body?.full_name || '').trim()
    const phone = String(body?.phone || '').trim()

    if (!fullName) {
      return NextResponse.json({ error: '請輸入姓名' }, { status: 400 })
    }
    if (!phone) {
      return NextResponse.json({ error: '請輸入電話' }, { status: 400 })
    }

    const serviceSupabase = getServiceClient()
    const { data, error } = await serviceSupabase
      .from('member_profiles')
      .upsert(
        {
          id: user.id,
          email: user.email || null,
          full_name: fullName,
          phone,
        },
        { onConflict: 'id' },
      )
      .select('id,email,full_name,phone')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: data }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || '會員資料儲存失敗' }, { status: 500 })
  }
}
