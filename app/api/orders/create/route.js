import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'

const normalizeText = (value) => String(value || '').trim()

export async function POST(request) {
  try {
    const body = await request.json()
    const name = normalizeText(body?.name)
    const phone = normalizeText(body?.phone)
    const address = normalizeText(body?.address)
    const delivery = normalizeText(body?.delivery || 'pickup')
    const payment = normalizeText(body?.payment || 'cash')
    const items = Array.isArray(body?.items) ? body.items : []
    const total = Number(body?.total || 0)

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required.' }, { status: 400 })
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'Order items are required.' }, { status: 400 })
    }

    if (!Number.isFinite(total) || total < 0) {
      return NextResponse.json({ error: 'Invalid order total.' }, { status: 400 })
    }

    const authSupabase = getServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    const supabase = getServiceClient()
    const productNames = items.map((item) => normalizeText(item?.name)).filter(Boolean)
    const orderRef = `ORD${Date.now().toString().slice(-6)}`

    // The live orders table currently stores a single contact label instead of
    // separate name/phone/product columns, so we keep the payload compatible.
    const payload = {
      user_name: phone ? `${name} (${phone})` : name,
      address: delivery.toLowerCase() === 'pickup' ? '' : address,
      delivery,
      payment,
      items: productNames.join(', '),
      total,
      status: 'pending',
      created_at: new Date().toISOString(),
      member_user_id: user?.id || null,
      ref: orderRef,
    }

    const { data, error } = await supabase.from('orders').insert(payload).select('*').single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ order: data, ref: orderRef }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}
