import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const root = process.cwd()
const envPath = path.join(root, '.env.local')
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index), line.slice(index + 1)]
    }),
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const baseUrlArg = process.argv.find((arg) => arg.startsWith('--base-url='))
const baseUrl = baseUrlArg ? baseUrlArg.slice('--base-url='.length).replace(/\/$/, '') : ''
const smokeDate = '2026-03-19'
const smokeConfig = {
  serviceId: 1,
  staffId: 3,
  customerId: 3,
  ticketId: 1,
  resourceDate: '2026-03-24',
  holidayDate: '2026-03-25',
  locationCode: `SMOKE-LOC-${smokeDate}`,
  locationName: `SMOKE Location ${smokeDate}`,
  groupName: `SMOKE Provider Group ${smokeDate}`,
  resourceName: `SMOKE Resource ${smokeDate}`,
  bookingRef: `SMOKE-BKG-${smokeDate.replaceAll('-', '')}`,
  orderRef: `SMOKE-ORD-${smokeDate.replaceAll('-', '')}`,
  transactionRef: `SMOKE-TX-${smokeDate.replaceAll('-', '')}`,
  paymentRef: `SMOKE-PAY-${smokeDate.replaceAll('-', '')}`,
  holidayTitle: `SMOKE Holiday ${smokeDate}`,
}

const parseTimeToMinutes = (value) => {
  if (!value) return null
  const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

const minutesToTime = (minutes) => {
  const normalized = ((minutes % 1440) + 1440) % 1440
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0')
  const mins = String(normalized % 60).padStart(2, '0')
  return `${hours}:${mins}:00`
}

const toLegacyDate = (dateISO) => {
  const [year, month, day] = String(dateISO).split('-')
  return `${Number(day)}/${Number(month)}/${year}`
}

const addMinutes = (time, amount) => {
  const base = parseTimeToMinutes(time)
  return base == null ? null : minutesToTime(base + amount)
}

const ok = (status, details = {}) => ({ status, ...details })

async function fetchJson(url) {
  const response = await fetch(url)
  const body = await response.json().catch(() => ({}))
  return { status: response.status, ok: response.ok, body }
}

async function maybeSingle(query) {
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

async function ensureLocation() {
  const existing = await maybeSingle(supabase.from('locations').select('*').eq('code', smokeConfig.locationCode))
  if (existing) return existing
  const { data, error } = await supabase
    .from('locations')
    .insert({
      code: smokeConfig.locationCode,
      name: smokeConfig.locationName,
      address: 'Smoke validation address',
      contact_phone: '0000 0000',
      enabled: true,
      sort_order: 999,
      timezone: 'Asia/Hong_Kong',
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function ensureProviderGroup() {
  const existing = await maybeSingle(supabase.from('provider_groups').select('*').eq('name', smokeConfig.groupName))
  if (existing) return existing
  const { data, error } = await supabase
    .from('provider_groups')
    .insert({
      name: smokeConfig.groupName,
      description: 'Smoke validation provider group',
      enabled: true,
      sort_order: 999,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function ensureResource(locationId) {
  const existing = await maybeSingle(
    supabase.from('resources').select('*').eq('name', smokeConfig.resourceName).eq('location_id', locationId),
  )
  if (existing) return existing
  const { data, error } = await supabase
    .from('resources')
    .insert({
      name: smokeConfig.resourceName,
      type: 'chair',
      location_id: locationId,
      capacity: 1,
      enabled: true,
      sort_order: 999,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function ensureServiceRelations(locationId, providerGroupId, resourceId) {
  await supabase.from('service_locations').upsert({ service_id: smokeConfig.serviceId, location_id: locationId, extra_price: 0, enabled: true })
  await supabase.from('service_provider_groups').upsert({ service_id: smokeConfig.serviceId, provider_group_id: providerGroupId, assignment_mode: 'required' })
  await supabase.from('staff_provider_groups').upsert({ staff_id: smokeConfig.staffId, provider_group_id: providerGroupId })
  await supabase.from('service_resources').upsert({ service_id: smokeConfig.serviceId, resource_id: resourceId, quantity: 1, required: true })
  await supabase
    .from('staff')
    .update({ location_id: locationId, provider_group_id: providerGroupId })
    .eq('id', smokeConfig.staffId)
}

async function ensureShift(dateISO) {
  const { error } = await supabase
    .from('staff_shifts')
    .upsert(
      {
        staff_id: smokeConfig.staffId,
        date: dateISO,
        start_time: '09:00:00',
        end_time: '18:00:00',
        is_off: false,
      },
      { onConflict: 'staff_id,date' },
    )
  if (error) throw error
}

async function ensureBooking(locationId, providerGroupId, service, startTime) {
  const existing = await maybeSingle(supabase.from('bookings').select('*').eq('ref', smokeConfig.bookingRef))
  if (existing) return existing
  const payload = {
    ref: smokeConfig.bookingRef,
    service: service.name,
    service_price: Number(service.price || 0),
    date: toLegacyDate(smokeConfig.resourceDate),
    time: String(startTime).slice(0, 5),
    name: 'Smoke Customer',
    phone: '12345678',
    final_price: Number(service.price || 0),
    status: 'confirmed',
    staff_id: smokeConfig.staffId,
    staff_name: 'App',
    user_id: null,
    customer_name: '12133',
    customer_phone: '12345678',
    customer_email: 'smoke@example.com',
    appointment_date: smokeConfig.resourceDate,
    start_time: String(startTime).slice(0, 8),
    end_time: addMinutes(startTime, Number(service.time || 60)),
    buffer_end_time: addMinutes(startTime, Number(service.time || 60) + Number(service.buffer_min || 0)),
    duration_min: Number(service.time || 60),
    buffer_min: Number(service.buffer_min || 0),
    start_at: `${smokeConfig.resourceDate}T${String(startTime).slice(0, 8)}+08:00`,
    end_at: `${smokeConfig.resourceDate}T${addMinutes(startTime, Number(service.time || 60))}+08:00`,
    buffer_end_at: `${smokeConfig.resourceDate}T${addMinutes(startTime, Number(service.time || 60) + Number(service.buffer_min || 0))}+08:00`,
    service_id: smokeConfig.serviceId,
    user_ticket_id: null,
    location_id: locationId,
    provider_group_id: providerGroupId,
    timetable_template_id: null,
  }
  const { data, error } = await supabase.from('bookings').insert(payload).select('*').single()
  if (error) throw error
  return data
}

async function ensureAllocation(bookingId, resourceId) {
  const existing = await maybeSingle(
    supabase.from('booking_resource_allocations').select('*').eq('booking_id', bookingId).eq('resource_id', resourceId),
  )
  if (existing) return existing
  const { data, error } = await supabase
    .from('booking_resource_allocations')
    .insert({ booking_id: bookingId, resource_id: resourceId, quantity: 1 })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function ensureOrder(locationId) {
  const existing = await maybeSingle(supabase.from('orders').select('*').eq('ref', smokeConfig.orderRef))
  if (existing) return existing
  const { data, error } = await supabase
    .from('orders')
    .insert({
      ref: smokeConfig.orderRef,
      user_id: smokeConfig.customerId,
      user_name: '12133',
      name: '12133',
      phone: '12345678',
      product_name: 'Smoke Product',
      items: 'Smoke Product x1',
      total: 600,
      delivery: 'pickup',
      payment: 'cash',
      address: '',
      status: 'paid',
      location_id: locationId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function ensureTransaction(orderId, bookingId, customerId, locationId, providerGroupId, resourceId) {
  const existing = await maybeSingle(supabase.from('transactions').select('*').eq('ref', smokeConfig.transactionRef))
  if (existing) return existing
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      ref: smokeConfig.transactionRef,
      order_id: orderId,
      booking_id: bookingId,
      customer_id: customerId,
      kind: 'sale',
      amount: 600,
      currency: 'HKD',
      status: 'completed',
      payment_method: 'cash',
      payment_ref: smokeConfig.paymentRef,
      provider: 'manual-smoke',
      notes: 'Smoke seed created',
      location_id: locationId,
      provider_group_id: providerGroupId,
      resource_id: resourceId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function ensureUserTicket(customerId) {
  const existing = await maybeSingle(supabase.from('user_tickets').select('*').eq('customer_id', customerId).eq('ticket_id', smokeConfig.ticketId))
  if (existing) return existing
  const { data, error } = await supabase
    .from('user_tickets')
    .insert({
      customer_id: customerId,
      ticket_id: smokeConfig.ticketId,
      ticket_name: 'Basic套票',
      remaining_count: 2,
      expiry_date: '2026-12-31T00:00:00+00:00',
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function replaceHoliday(providerGroupId) {
  await supabase.from('holidays').delete().eq('title', smokeConfig.holidayTitle)
  const { data, error } = await supabase
    .from('holidays')
    .insert({
      title: smokeConfig.holidayTitle,
      holiday_date: smokeConfig.holidayDate,
      end_date: smokeConfig.holidayDate,
      provider_group_id: providerGroupId,
      is_closed: true,
      note: 'Smoke holiday validation',
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function runAvailability(dateISO, locationId) {
  if (!baseUrl) return { blocked: true, reason: 'missing baseUrl' }
  const url = `${baseUrl}/api/availability?date=${dateISO}&serviceId=${smokeConfig.serviceId}&staffId=${smokeConfig.staffId}&locationId=${locationId}`
  return fetchJson(url)
}

async function main() {
  const service = await maybeSingle(supabase.from('services').select('*').eq('id', smokeConfig.serviceId))
  if (!service) throw new Error(`Service ${smokeConfig.serviceId} not found`)

  const location = await ensureLocation()
  const providerGroup = await ensureProviderGroup()
  const resource = await ensureResource(location.id)
  await ensureServiceRelations(location.id, providerGroup.id, resource.id)
  await ensureShift(smokeConfig.resourceDate)
  await ensureShift(smokeConfig.holidayDate)

  await supabase.from('booking_resource_allocations').delete().eq('booking_id', -1)

  const baselineResourceAvailability = await runAvailability(smokeConfig.resourceDate, location.id)
  const baselineResourceSlots = baselineResourceAvailability.body?.slots || []
  const chosenSlot = baselineResourceSlots[0] || '09:00'

  await supabase.from('booking_resource_allocations').delete().eq('booking_id', -999)
  await supabase.from('bookings').delete().eq('ref', smokeConfig.bookingRef)
  const booking = await ensureBooking(location.id, providerGroup.id, service, chosenSlot)
  const allocation = await ensureAllocation(booking.id, resource.id)
  const order = await ensureOrder(location.id)
  const transaction = await ensureTransaction(order.id, booking.id, smokeConfig.customerId, location.id, providerGroup.id, resource.id)
  const userTicket = await ensureUserTicket(smokeConfig.customerId)

  const postResourceAvailability = await runAvailability(smokeConfig.resourceDate, location.id)
  const postResourceSlots = postResourceAvailability.body?.slots || []

  await supabase.from('holidays').delete().eq('title', smokeConfig.holidayTitle)
  const baselineHolidayAvailability = await runAvailability(smokeConfig.holidayDate, location.id)
  const holiday = await replaceHoliday(providerGroup.id)
  const postHolidayAvailability = await runAvailability(smokeConfig.holidayDate, location.id)

  const preEditTx = await maybeSingle(supabase.from('transactions').select('*').eq('id', transaction.id))
  const updatedNote = `Smoke roundtrip ${new Date().toISOString()}`
  const { error: updateTxError } = await supabase.from('transactions').update({ notes: updatedNote }).eq('id', transaction.id)
  if (updateTxError) throw updateTxError
  const postEditTx = await maybeSingle(supabase.from('transactions').select('*').eq('id', transaction.id))

  const customer = await maybeSingle(supabase.from('customers').select('*').eq('id', smokeConfig.customerId))

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: baseUrl || null,
    seeds: {
      location_id: location.id,
      provider_group_id: providerGroup.id,
      resource_id: resource.id,
      booking_id: booking.id,
      order_id: order.id,
      transaction_id: transaction.id,
      customer_id: customer?.id || smokeConfig.customerId,
      holiday_id: holiday.id,
      user_ticket_id: userTicket.id,
      staff_id: smokeConfig.staffId,
    },
    checks: {
      bookings_detail_seed_ready: ok(
        booking.location_id && booking.provider_group_id && allocation.booking_id === booking.id && transaction.booking_id === booking.id && transaction.order_id === order.id ? 'pass' : 'fail',
        {
          booking_location_id: booking.location_id,
          booking_provider_group_id: booking.provider_group_id,
          allocation_quantity: allocation.quantity,
          linked_order_ref: order.ref,
          linked_transaction_ref: transaction.ref,
        },
      ),
      transaction_edit_save_roundtrip: ok(
        postEditTx?.notes === updatedNote && String(postEditTx?.booking_id) === String(booking.id) && String(postEditTx?.order_id) === String(order.id)
          ? 'pass'
          : 'fail',
        {
          before: preEditTx?.notes || null,
          after: postEditTx?.notes || null,
          booking_id: postEditTx?.booking_id || null,
          order_id: postEditTx?.order_id || null,
        },
      ),
      customer_operational_seed_ready: ok(
        customer && userTicket && transaction.customer_id === customer.id ? 'pass' : 'fail',
        {
          customer_name: customer?.name || null,
          user_ticket_id: userTicket?.id || null,
          transaction_id: transaction.id,
          order_id: order.id,
          booking_id: booking.id,
        },
      ),
      availability_resource_full: baseUrl
        ? ok(
            baselineResourceAvailability.ok && postResourceAvailability.ok && baselineResourceSlots.length > 0 && !postResourceSlots.includes(chosenSlot)
              ? 'pass'
              : 'fail',
            {
              slot_tested: chosenSlot,
              baseline_slots: baselineResourceSlots,
              after_slots: postResourceSlots,
              baseline_status: baselineResourceAvailability.status,
              after_status: postResourceAvailability.status,
            },
          )
        : ok('blocked', { reason: 'Run with --base-url=http://localhost:3000 to validate /api/availability.' }),
      holiday_provider_group_enforcement: baseUrl
        ? ok(
            baselineHolidayAvailability.ok &&
              postHolidayAvailability.ok &&
              (baselineHolidayAvailability.body?.slots || []).length > 0 &&
              (postHolidayAvailability.body?.slots || []).length === 0
              ? 'pass'
              : 'fail',
            {
              baseline_slots: baselineHolidayAvailability.body?.slots || [],
              after_slots: postHolidayAvailability.body?.slots || [],
              baseline_status: baselineHolidayAvailability.status,
              after_status: postHolidayAvailability.status,
            },
          )
        : ok('blocked', { reason: 'Run with --base-url=http://localhost:3000 to validate holiday blocking.' }),
    },
  }

  const reportPath = path.join(root, `LIVE_SMOKE_REPORT_${smokeDate}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log(`REPORT_PATH=${reportPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
