import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'

const normalizeText = (value) => String(value || '').trim()
const normalizeInteger = (value) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function POST(request) {
  try {
    const body = await request.json()
    const name = normalizeText(body?.name)
    const phone = normalizeText(body?.phone)
    const address = normalizeText(body?.address)
    const delivery = normalizeText(body?.delivery || 'pickup')
    const payment = normalizeText(body?.payment || 'cash')
    const requestedItems = Array.isArray(body?.items) ? body.items : []

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required.' }, { status: 400 })
    }

    if (requestedItems.length === 0) {
      return NextResponse.json({ error: 'Order items are required.' }, { status: 400 })
    }

    const authSupabase = getServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    const supabase = getServiceClient()
    const normalizedItems = requestedItems.map((item) => ({
      id: normalizeInteger(item?.id),
      quantity: normalizeInteger(item?.quantity) || 1,
    }))

    if (normalizedItems.some((item) => !item.id || !item.quantity)) {
      return NextResponse.json({ error: 'Each order item must include a valid product id and quantity.' }, { status: 400 })
    }

    const quantityByProductId = normalizedItems.reduce((acc, item) => {
      acc[item.id] = (acc[item.id] || 0) + item.quantity
      return acc
    }, {})

    const productIds = Object.keys(quantityByProductId).map((value) => Number(value)).filter(Number.isFinite)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id,name,price,enabled')
      .in('id', productIds)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    const enabledProducts = (products || []).filter((product) => product.enabled !== false)
    if (enabledProducts.length !== productIds.length) {
      return NextResponse.json({ error: 'One or more selected products are unavailable.' }, { status: 400 })
    }

    const canonicalItems = enabledProducts.map((product) => {
      const quantity = quantityByProductId[product.id] || 0
      return {
        id: product.id,
        name: product.name,
        price: Number(product.price || 0),
        quantity,
        subtotal: Number(product.price || 0) * quantity,
      }
    })

    const total = canonicalItems.reduce((sum, item) => sum + item.subtotal, 0)
    const productNames = canonicalItems.map((item) => `${normalizeText(item.name) || `Product #${item.id}`} x${item.quantity}`)
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

    return NextResponse.json({ order: data, ref: orderRef, total, items: canonicalItems }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}
