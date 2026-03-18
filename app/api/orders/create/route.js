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
    const delivery = normalizeText(body?.delivery || '門市自取')
    const payment = normalizeText(body?.payment || '現金')
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

    const payload = {
      name,
      phone,
      address: delivery === '送貨上門' ? address : '',
      delivery,
      payment,
      product_name: productNames.join(', '),
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
