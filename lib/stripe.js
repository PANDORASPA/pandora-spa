import crypto from 'crypto'

const STRIPE_API_BASE = 'https://api.stripe.com/v1'

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY)

const appendValue = (params, key, value) => {
  if (value == null || value === '') return
  params.append(key, String(value))
}

const appendMetadata = (params, prefix, metadata = {}) => {
  Object.entries(metadata).forEach(([key, value]) => {
    appendValue(params, prefix ? `${prefix}[metadata][${key}]` : `metadata[${key}]`, value)
  })
}

export async function createCheckoutSession({
  lineItems = [],
  metadata = {},
  successUrl,
  cancelUrl,
  customerEmail,
  clientReferenceId,
}) {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error('Stripe is not configured.')
    error.status = 503
    throw error
  }

  const params = new URLSearchParams()
  params.append('mode', 'payment')
  params.append('success_url', successUrl)
  params.append('cancel_url', cancelUrl)
  appendValue(params, 'customer_email', customerEmail)
  appendValue(params, 'client_reference_id', clientReferenceId)
  appendMetadata(params, '', metadata)
  appendMetadata(params, 'payment_intent_data', metadata)

  lineItems.forEach((item, index) => {
    params.append(`line_items[${index}][quantity]`, String(item.quantity || 1))
    params.append(`line_items[${index}][price_data][currency]`, String(item.currency || process.env.STRIPE_CURRENCY || 'hkd').toLowerCase())
    params.append(`line_items[${index}][price_data][unit_amount]`, String(Math.round(Number(item.amount || 0) * 100)))
    params.append(`line_items[${index}][price_data][product_data][name]`, String(item.name || 'PANDORA HEAD SPA'))
    appendValue(params, `line_items[${index}][price_data][product_data][description]`, item.description)
  })

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'Stripe Checkout session creation failed.')
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export function verifyStripeWebhookSignature({ payload, signatureHeader, secret }) {
  if (!secret) {
    const error = new Error('Stripe webhook secret is not configured.')
    error.status = 503
    throw error
  }

  const parts = String(signatureHeader || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const [key, value] = part.split('=')
      if (!acc[key]) acc[key] = []
      acc[key].push(value)
      return acc
    }, {})

  const timestamp = parts.t?.[0]
  const signatures = parts.v1 || []
  if (!timestamp || signatures.length === 0) {
    const error = new Error('Invalid Stripe signature header.')
    error.status = 400
    throw error
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex')

  const matched = signatures.some((signature) => {
    const left = Buffer.from(signature, 'hex')
    const right = Buffer.from(expected, 'hex')
    return left.length === right.length && crypto.timingSafeEqual(left, right)
  })

  if (!matched) {
    const error = new Error('Stripe webhook signature verification failed.')
    error.status = 400
    throw error
  }

  return true
}
