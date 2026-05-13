import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { createChunks } from '@supabase/ssr'

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
const anonSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const DEFAULT_BASE_URL = 'http://localhost:3000'
const baseUrlArg = process.argv.find((arg) => arg.startsWith('--base-url='))
const normalizeBaseUrl = (value) => {
  const text = String(value || '').trim().replace(/\/$/, '')
  if (!text) return DEFAULT_BASE_URL
  return text.replace('127.0.0.1', 'localhost')
}
const baseUrl = normalizeBaseUrl(baseUrlArg ? baseUrlArg.slice('--base-url='.length) : '')
const futureDate = (offsetDays) => {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}
const smokeDate = futureDate(30)
const smokeConfig = {
  serviceId: 1,
  staffId: null,
  customerId: null,
  ticketId: 1,
  resourceDate: futureDate(37),
  controlledCreateDate: futureDate(38),
  controlledRescheduleDate: futureDate(39),
  holidayDate: futureDate(36),
  locationCode: `SMOKE-PHASE2-LOC-${smokeDate}`,
  locationName: `SMOKE Phase2 Location ${smokeDate}`,
  groupName: `SMOKE Phase2 Provider Group ${smokeDate}`,
  resourceName: `SMOKE Phase2 Resource ${smokeDate}`,
  memberEmail: `codex.phase2.member.${smokeDate.replaceAll('-', '')}@example.com`,
  memberPassword: 'Phase2Smoke123!',
  customerPhone: `987${smokeDate.replaceAll('-', '').slice(-5)}`,
  customerEmail: `codex.phase2.customer.${smokeDate.replaceAll('-', '')}@example.com`,
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

const uniqueSlots = (slots) => [...new Set((slots || []).map((slot) => String(slot).slice(0, 5)).filter(Boolean))]

const addMinutes = (time, amount) => {
  const base = parseTimeToMinutes(time)
  return base == null ? null : minutesToTime(base + amount)
}

const ok = (status, details = {}) => ({ status, ...details })

const classifyExecutionError = (error) => {
  const text = `${error?.message || ''}\n${error?.details || ''}\n${error?.cause?.message || ''}`
  if (/fetch failed|ConnectTimeout|UND_ERR_CONNECT_TIMEOUT|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(text)) {
    return 'environment_invalid'
  }
  return error?.details?.diagnostic_category || 'unexpected_server_error'
}

const diagnosticCategoryForResponse = (response, fallback = 'unexpected_server_error') => {
  if (response?.blocked) return 'environment_invalid'
  if (response?.status === 401 || response?.status === 403) return 'auth_session_invalid'
  if (response?.status >= 500) return 'availability_error'
  return fallback
}

async function fetchJson(url, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body,
    redirect: 'manual',
  })
  const parsed = await response.json().catch(() => ({}))
  return {
    status: response.status,
    ok: response.ok,
    body: parsed,
    headers: Object.fromEntries(response.headers.entries()),
  }
}

async function probeAccountSession(cookieHeader) {
  const response = await fetch(`${baseUrl}/account/bookings`, {
    headers: { cookie: cookieHeader },
    redirect: 'manual',
  })
  return {
    status: response.status,
    location: response.headers.get('location'),
    valid: response.status === 200,
  }
}

async function probeAvailabilityEnvironment() {
  const response = await fetchJson(`${baseUrl}/api/public/availability-version`)
  return {
    status: response.status,
    valid: response.ok,
    error: response.body?.error || null,
  }
}

async function maybeSingle(query) {
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

async function ensureSmokeUser() {
  const list = await supabase.auth.admin.listUsers()
  if (list.error) throw list.error
  const existing = (list.data?.users || []).find((user) => user.email === smokeConfig.memberEmail)
  let user = existing
  if (!user) {
    const created = await supabase.auth.admin.createUser({
      email: smokeConfig.memberEmail,
      password: smokeConfig.memberPassword,
      email_confirm: true,
    })
    if (created.error) throw created.error
    user = created.data.user
  } else {
    const updated = await supabase.auth.admin.updateUserById(user.id, {
      password: smokeConfig.memberPassword,
      email_confirm: true,
    })
    if (updated.error) throw updated.error
    user = updated.data.user
  }

  const { error } = await supabase.from('member_profiles').upsert({ id: user.id, is_admin: false }, { onConflict: 'id' })
  if (error) throw error
  return user
}

async function buildCookieHeader(email) {
  const login = await anonSupabase.auth.signInWithPassword({
    email,
    password: smokeConfig.memberPassword,
  })
  if (login.error) throw login.error
  const chunks = createChunks(anonSupabase.auth.storageKey, JSON.stringify(login.data.session))
  return chunks.map((chunk) => `${chunk.name}=${encodeURIComponent(chunk.value)}`).join('; ')
}

async function cleanupControlledBookings(userId) {
  const existing = await supabase.from('bookings').select('id').eq('user_id', userId)
  if (existing.error) throw existing.error
  const bookingIds = (existing.data || []).map((row) => row.id).filter(Boolean)
  if (!bookingIds.length) return
  const { error: allocError } = await supabase.from('booking_resource_allocations').delete().in('booking_id', bookingIds)
  if (allocError) throw allocError
  const { error: bookingError } = await supabase.from('bookings').delete().in('id', bookingIds)
  if (bookingError) throw bookingError
}

async function fetchBookingSnapshot(bookingId) {
  const [booking, allocations] = await Promise.all([
    maybeSingle(supabase.from('bookings').select('*').eq('id', bookingId)),
    supabase.from('booking_resource_allocations').select('*').eq('booking_id', bookingId),
  ])
  return {
    booking,
    allocations: allocations.data || [],
  }
}

async function createBookingRequest({ cookieHeader, dateISO, startTime, locationId, staffId, userTicketId, customerName, customerPhone }) {
  return fetchJson(`${baseUrl}/api/bookings/create`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
    },
    body: JSON.stringify({
      date: dateISO,
      serviceId: smokeConfig.serviceId,
      staffId,
      locationId,
      startTime,
      customerName,
      customerPhone,
      userTicketId,
    }),
  })
}

async function rescheduleBookingRequest({ cookieHeader, bookingId, dateISO, startTime, locationId, staffId, customerName, customerPhone, userTicketId }) {
  return fetchJson(`${baseUrl}/api/account/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
    },
    body: JSON.stringify({
      action: 'reschedule',
      date: dateISO,
      serviceId: smokeConfig.serviceId,
      staffId,
      locationId,
      startTime,
      customerName,
      customerPhone,
      userTicketId,
    }),
  })
}

async function cancelBookingRequest({ cookieHeader, bookingId }) {
  return fetchJson(`${baseUrl}/api/account/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
    },
    body: JSON.stringify({ action: 'cancel' }),
  })
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
  await supabase.from('service_resources').delete().eq('service_id', smokeConfig.serviceId).eq('resource_id', resourceId)
  await supabase.from('service_resources').delete().eq('service_id', smokeConfig.serviceId).neq('resource_id', resourceId)
  await supabase.from('service_resources').insert({ service_id: smokeConfig.serviceId, resource_id: resourceId, quantity: 1, required: true })
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
  const existing = await maybeSingle(supabase.from('bookings').select('*').eq('ref', smokeConfig.bookingRef))
  if (existing) {
    const { data, error } = await supabase.from('bookings').update(payload).eq('id', existing.id).select('*').single()
    if (error) throw error
    return data
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
  const payload = {
    ref: smokeConfig.orderRef,
    member_user_id: null,
    user_name: '12133 (12345678)',
    items: 'Smoke Product x1',
    total: 600,
    delivery: 'pickup',
    payment: 'cash',
    address: '',
    status: 'paid',
    location_id: locationId,
  }
  const existing = await maybeSingle(supabase.from('orders').select('*').eq('ref', smokeConfig.orderRef))
  if (existing) {
    const { data, error } = await supabase.from('orders').update(payload).eq('id', existing.id).select('*').single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.from('orders').insert(payload).select('*').single()
  if (error) throw error
  return data
}

async function ensureTransaction(orderId, bookingId, customerId, locationId, providerGroupId, resourceId) {
  const payload = {
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
  }
  const existing = await maybeSingle(supabase.from('transactions').select('*').eq('ref', smokeConfig.transactionRef))
  if (existing) {
    const { data, error } = await supabase.from('transactions').update(payload).eq('id', existing.id).select('*').single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.from('transactions').insert(payload).select('*').single()
  if (error) throw error
  return data
}

async function ensureUserTicket(customerId) {
  const payload = {
    customer_id: customerId,
    ticket_id: smokeConfig.ticketId,
    ticket_name: 'Basic Ticket',
    remaining_count: 2,
    expiry_date: '2026-12-31T00:00:00+00:00',
  }
  const existing = await maybeSingle(supabase.from('user_tickets').select('*').eq('customer_id', customerId).eq('ticket_id', smokeConfig.ticketId))
  if (existing) {
    const { data, error } = await supabase.from('user_tickets').update(payload).eq('id', existing.id).select('*').single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.from('user_tickets').insert(payload).select('*').single()
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
  const url = `${baseUrl}/api/availability?date=${dateISO}&serviceId=${smokeConfig.serviceId}&staffId=${smokeConfig.staffId}&locationId=${locationId}`
  return fetchJson(url)
}

async function resetSmokeBooking() {
  const existing = await maybeSingle(supabase.from('bookings').select('id').eq('ref', smokeConfig.bookingRef))
  if (!existing) return
  await supabase.from('booking_resource_allocations').delete().eq('booking_id', existing.id)
  await supabase.from('bookings').delete().eq('id', existing.id)
}

async function ensureSmokeStaff() {
  const { data: existingStaff, error: selectError } = await supabase
    .from('staff')
    .select('*')
    .eq('enabled', true)
    .order('id', { ascending: true })
    .limit(1)
  if (selectError) throw selectError
  if (existingStaff?.[0]?.id) return existingStaff[0]

  const { data, error } = await supabase
    .from('staff')
    .insert({
      name: 'Smoke Head Spa Staff',
      role: '頭皮護理師',
      enabled: true,
      schedule: {
        0: { start: '09:00', end: '18:00' },
        1: { start: '09:00', end: '18:00' },
        2: { start: '09:00', end: '18:00' },
        3: { start: '09:00', end: '18:00' },
        4: { start: '09:00', end: '18:00' },
        5: { start: '09:00', end: '18:00' },
        6: { start: '09:00', end: '18:00' },
      },
      services: [smokeConfig.serviceId],
      daysOff: [],
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function ensureSmokeCustomer() {
  const existing = await maybeSingle(supabase.from('customers').select('*').eq('phone', smokeConfig.customerPhone))
  if (existing?.id) return existing

  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: 'Phase2 Smoke Customer',
      phone: smokeConfig.customerPhone,
      email: smokeConfig.customerEmail,
      notes: 'Automated smoke test customer',
      membership_level: 'Smoke',
      points: 0,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function main() {
  const service = await maybeSingle(supabase.from('services').select('*').eq('id', smokeConfig.serviceId))
  if (!service) throw new Error(`Service ${smokeConfig.serviceId} not found`)
  const staff = await ensureSmokeStaff()
  smokeConfig.staffId = staff.id
  const smokeCustomer = await ensureSmokeCustomer()
  smokeConfig.customerId = smokeCustomer.id

  const location = await ensureLocation()
  const providerGroup = await ensureProviderGroup()
  const resource = await ensureResource(location.id)
  await ensureServiceRelations(location.id, providerGroup.id, resource.id)
  await ensureShift(smokeConfig.resourceDate)
  await ensureShift(smokeConfig.controlledCreateDate)
  await ensureShift(smokeConfig.controlledRescheduleDate)
  await ensureShift(smokeConfig.holidayDate)
  await resetSmokeBooking()

  const baselineResourceAvailability = await runAvailability(smokeConfig.resourceDate, location.id)
  const baselineResourceSlots = uniqueSlots(baselineResourceAvailability.body?.slots)
  const chosenSlot = baselineResourceSlots[0] || '09:00'

  const booking = await ensureBooking(location.id, providerGroup.id, service, chosenSlot)
  const allocation = await ensureAllocation(booking.id, resource.id)
  const order = await ensureOrder(location.id)
  const transaction = await ensureTransaction(order.id, booking.id, smokeConfig.customerId, location.id, providerGroup.id, resource.id)
  const userTicket = await ensureUserTicket(smokeConfig.customerId)

  const postResourceAvailability = await runAvailability(smokeConfig.resourceDate, location.id)
  const postResourceSlots = uniqueSlots(postResourceAvailability.body?.slots)

  await supabase.from('holidays').delete().eq('title', smokeConfig.holidayTitle)
  const baselineHolidayAvailability = await runAvailability(smokeConfig.holidayDate, location.id)
  const holiday = await replaceHoliday(providerGroup.id)
  const postHolidayAvailability = await runAvailability(smokeConfig.holidayDate, location.id)

  const preEditTx = await maybeSingle(supabase.from('transactions').select('*').eq('id', transaction.id))
  const updatedNote = `Smoke roundtrip ${new Date().toISOString()}`
  const { error: updateTxError } = await supabase
    .from('transactions')
    .update({
      notes: updatedNote,
      order_id: order.id,
      booking_id: booking.id,
      customer_id: smokeConfig.customerId,
      location_id: location.id,
      provider_group_id: providerGroup.id,
      resource_id: resource.id,
    })
    .eq('id', transaction.id)
  if (updateTxError) throw updateTxError
  const postEditTx = await maybeSingle(supabase.from('transactions').select('*').eq('id', transaction.id))

  const customer = await maybeSingle(supabase.from('customers').select('*').eq('id', smokeConfig.customerId))

  let controlledBookingFlow = {
    status: 'blocked',
    reason: 'environment_invalid',
    diagnostic_category: 'environment_invalid',
  }
  let controlledBookingEvidence = {
    create: null,
    reschedule: null,
    cancel: null,
  }

  if (baseUrl) {
    const smokeUser = await ensureSmokeUser()
    const smokeCookie = await buildCookieHeader(smokeConfig.memberEmail)
    const environmentProbe = await probeAvailabilityEnvironment()
    const authProbe = await probeAccountSession(smokeCookie)
    await cleanupControlledBookings(smokeUser.id)

    const smokeTicket = await maybeSingle(
      supabase.from('user_tickets').select('*').eq('member_user_id', smokeUser.id).eq('ticket_id', smokeConfig.ticketId),
    )
    const userTicket =
      smokeTicket ||
      (await (async () => {
        const { data, error } = await supabase
          .from('user_tickets')
          .insert({
            member_user_id: smokeUser.id,
            customer_id: null,
            ticket_id: smokeConfig.ticketId,
            ticket_name: 'Basic Ticket',
            remaining_count: 2,
            expiry_date: '2026-12-31T00:00:00+00:00',
          })
          .select('*')
          .single()
        if (error) throw error
        return data
      })())

    if (!environmentProbe.valid) {
      controlledBookingFlow = {
        status: 'fail',
        reason: 'availability environment probe failed',
        diagnostic_category: 'environment_invalid',
        environment_probe_status: environmentProbe.status,
        environment_probe_error: environmentProbe.error,
      }
      controlledBookingEvidence = {
        create: {
          status: 'fail',
          response_status: environmentProbe.status,
          response_code: 'environment_invalid',
          diagnostic_category: 'environment_invalid',
          environment_probe: environmentProbe,
        },
        reschedule: {
          status: 'blocked',
          response_status: null,
          response_code: 'environment_invalid',
          diagnostic_category: 'environment_invalid',
        },
        cancel: {
          status: 'blocked',
          response_status: null,
          response_code: 'environment_invalid',
          diagnostic_category: 'environment_invalid',
        },
      }
    } else if (!authProbe.valid) {
      controlledBookingFlow = {
        status: 'fail',
        reason: 'member account probe did not authenticate',
        diagnostic_category: 'auth_session_invalid',
        auth_probe_status: authProbe.status,
        auth_probe_location: authProbe.location,
      }
      controlledBookingEvidence = {
        create: {
          status: 'fail',
          response_status: authProbe.status,
          response_code: 'auth_session_invalid',
          diagnostic_category: 'auth_session_invalid',
          auth_probe: authProbe,
        },
        reschedule: {
          status: 'blocked',
          response_status: null,
          response_code: 'auth_session_invalid',
          diagnostic_category: 'auth_session_invalid',
        },
        cancel: {
          status: 'blocked',
          response_status: null,
          response_code: 'auth_session_invalid',
          diagnostic_category: 'auth_session_invalid',
        },
      }
    } else {
      const createAvailability = await runAvailability(smokeConfig.controlledCreateDate, location.id)
      const createSlots = uniqueSlots(createAvailability.body?.slots)
      const createStart = createSlots[0] || '09:00'
      const createResponse = await createBookingRequest({
        cookieHeader: smokeCookie,
        dateISO: smokeConfig.controlledCreateDate,
        startTime: createStart,
        locationId: location.id,
        staffId: smokeConfig.staffId,
        userTicketId: userTicket.id,
        customerName: 'Controlled Smoke Customer',
        customerPhone: '12345678',
      })

      const createdBookingId = createResponse.body?.booking?.id || null
      const createSnapshot = createdBookingId ? await fetchBookingSnapshot(createdBookingId) : { booking: null, allocations: [] }
      const createTicketSnapshot = await maybeSingle(supabase.from('user_tickets').select('*').eq('id', userTicket.id))

      const rescheduleAvailability = await runAvailability(smokeConfig.controlledRescheduleDate, location.id)
      const rescheduleSlots = uniqueSlots(rescheduleAvailability.body?.slots)
      const rescheduleStart = rescheduleSlots.find((slot) => slot !== createStart) || rescheduleSlots[0] || createStart
      const rescheduleBefore = createdBookingId ? await fetchBookingSnapshot(createdBookingId) : { booking: null, allocations: [] }
      const rescheduleResponse = createdBookingId
        ? await rescheduleBookingRequest({
            cookieHeader: smokeCookie,
            bookingId: createdBookingId,
            dateISO: smokeConfig.controlledRescheduleDate,
            startTime: rescheduleStart,
            locationId: location.id,
            staffId: smokeConfig.staffId,
            customerName: 'Controlled Smoke Customer',
            customerPhone: '12345678',
            userTicketId: userTicket.id,
          })
        : { status: 500, ok: false, body: { error: 'Missing booking id' } }
      const rescheduleAfter = createdBookingId ? await fetchBookingSnapshot(createdBookingId) : { booking: null, allocations: [] }

      const cancelBefore = createdBookingId ? await fetchBookingSnapshot(createdBookingId) : { booking: null, allocations: [] }
      const cancelResponse = createdBookingId
        ? await cancelBookingRequest({
            cookieHeader: smokeCookie,
            bookingId: createdBookingId,
          })
        : { status: 500, ok: false, body: { error: 'Missing booking id' } }
      const cancelAfter = createdBookingId ? await fetchBookingSnapshot(createdBookingId) : { booking: null, allocations: [] }
      const ticketBeforeCancel = createTicketSnapshot
      const ticketAfterCancel = await maybeSingle(supabase.from('user_tickets').select('*').eq('id', userTicket.id))

      controlledBookingEvidence = {
        create: {
          request: {
            date: smokeConfig.controlledCreateDate,
            start_time: createStart,
            location_id: location.id,
            provider_group_id: providerGroup.id,
            staff_id: smokeConfig.staffId,
            user_ticket_id: userTicket.id,
          },
          response_status: createResponse.status,
          response_code: createResponse.body?.code || null,
          diagnostic_category: diagnosticCategoryForResponse(createResponse, 'unexpected_server_error'),
          auth_probe: authProbe,
          booking_id: createdBookingId,
          before_snapshot: null,
          after_snapshot: createSnapshot.booking
            ? {
                appointment_date: createSnapshot.booking.appointment_date || null,
                start_time: createSnapshot.booking.start_time || null,
                end_time: createSnapshot.booking.end_time || null,
                buffer_end_time: createSnapshot.booking.buffer_end_time || null,
                location_id: createSnapshot.booking.location_id || null,
                provider_group_id: createSnapshot.booking.provider_group_id || null,
                allocation_count: createSnapshot.allocations.length,
              }
            : null,
        },
        reschedule: {
          request: {
            date: smokeConfig.controlledRescheduleDate,
            start_time: rescheduleStart,
            location_id: location.id,
            provider_group_id: providerGroup.id,
            staff_id: smokeConfig.staffId,
            user_ticket_id: userTicket.id,
          },
          response_status: rescheduleResponse.status,
          response_code: rescheduleResponse.body?.code || null,
          diagnostic_category: diagnosticCategoryForResponse(rescheduleResponse, 'unexpected_server_error'),
          booking_id: createdBookingId,
          before_snapshot: rescheduleBefore.booking
            ? {
                appointment_date: rescheduleBefore.booking.appointment_date || null,
                start_time: rescheduleBefore.booking.start_time || null,
                allocation_count: rescheduleBefore.allocations.length,
              }
            : null,
          after_snapshot: rescheduleAfter.booking
            ? {
                appointment_date: rescheduleAfter.booking.appointment_date || null,
                start_time: rescheduleAfter.booking.start_time || null,
                allocation_count: rescheduleAfter.allocations.length,
              }
            : null,
        },
        cancel: {
          request: {
            booking_id: createdBookingId,
          },
          response_status: cancelResponse.status,
          response_code: cancelResponse.body?.code || null,
          diagnostic_category: diagnosticCategoryForResponse(cancelResponse, 'unexpected_server_error'),
          booking_id: createdBookingId,
          before_snapshot: cancelBefore.booking
            ? {
                appointment_date: cancelBefore.booking.appointment_date || null,
                start_time: cancelBefore.booking.start_time || null,
                status: cancelBefore.booking.status || null,
                allocation_count: cancelBefore.allocations.length,
              }
            : null,
          after_snapshot: cancelAfter.booking
            ? {
                appointment_date: cancelAfter.booking.appointment_date || null,
                start_time: cancelAfter.booking.start_time || null,
                status: cancelAfter.booking.status || null,
                allocation_count: cancelAfter.allocations.length,
              }
            : null,
          ticket_before_cancel: ticketBeforeCancel
            ? { remaining_count: ticketBeforeCancel.remaining_count ?? null }
            : null,
          ticket_after_cancel: ticketAfterCancel
            ? { remaining_count: ticketAfterCancel.remaining_count ?? null }
            : null,
        },
      }

      const createPass =
        createResponse.ok &&
        createSnapshot.booking?.appointment_date === smokeConfig.controlledCreateDate &&
        createSnapshot.allocations.length > 0

      const reschedulePass =
        rescheduleResponse.ok &&
        rescheduleAfter.booking?.appointment_date === smokeConfig.controlledRescheduleDate &&
        String(rescheduleAfter.booking?.start_time || '').slice(0, 5) === String(rescheduleStart).slice(0, 5) &&
        rescheduleBefore.allocations.length > 0 &&
        rescheduleAfter.allocations.length > 0

      const cancelPass =
        cancelResponse.ok &&
        cancelAfter.booking?.status === 'cancelled' &&
        ticketBeforeCancel &&
        ticketAfterCancel &&
        Number(ticketAfterCancel.remaining_count || 0) === Number(ticketBeforeCancel.remaining_count || 0) + 1

      controlledBookingFlow = {
        status: createPass && reschedulePass && cancelPass ? 'pass' : 'fail',
        booking_id: createdBookingId,
        create_date: smokeConfig.controlledCreateDate,
        reschedule_date: smokeConfig.controlledRescheduleDate,
        create_slot: createStart,
        reschedule_slot: rescheduleStart,
        ticket_id: userTicket.id,
        create_pass: createPass,
        reschedule_pass: reschedulePass,
        cancel_pass: cancelPass,
      }

      controlledBookingEvidence = {
        ...controlledBookingEvidence,
        create: {
          ...controlledBookingEvidence.create,
          status: createPass ? 'pass' : 'fail',
        },
        reschedule: {
          ...controlledBookingEvidence.reschedule,
          status: reschedulePass ? 'pass' : 'fail',
        },
        cancel: {
          ...controlledBookingEvidence.cancel,
          status: cancelPass ? 'pass' : 'fail',
        },
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: baseUrl || null,
    report_version: 3,
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
    controlled_booking_flow: controlledBookingFlow,
    controlled_booking_evidence: controlledBookingEvidence,
    checks: {
      controlled_booking_create: ok(
        controlledBookingEvidence.create?.status || controlledBookingFlow.status,
        controlledBookingEvidence.create || {},
      ),
      controlled_booking_reschedule: ok(
        controlledBookingEvidence.reschedule?.status || controlledBookingFlow.status,
        controlledBookingEvidence.reschedule || {},
      ),
      controlled_booking_cancel: ok(
        controlledBookingEvidence.cancel?.status || controlledBookingFlow.status,
        controlledBookingEvidence.cancel || {},
      ),
      bookings_detail_seed_ready: ok(
        booking.location_id &&
          booking.provider_group_id &&
          allocation.booking_id === booking.id &&
          String(transaction.booking_id) === String(booking.id) &&
          String(transaction.order_id) === String(order.id)
          ? 'pass'
          : 'fail',
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
        customer && userTicket && String(transaction.customer_id) === String(customer.id) ? 'pass' : 'fail',
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
              baseline_error: baselineResourceAvailability.body?.error || null,
              after_error: postResourceAvailability.body?.error || null,
              diagnostic_category:
                [baselineResourceAvailability.body?.error, postResourceAvailability.body?.error]
                  .filter(Boolean)
                  .some((message) => String(message).includes('Missing NEXT_PUBLIC_SUPABASE_URL') || String(message).includes('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY') || String(message).includes('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'))
                  ? 'environment_invalid'
                  : baselineResourceAvailability.status >= 500 || postResourceAvailability.status >= 500
                    ? 'availability_error'
                    : 'unexpected_server_error',
            },
          )
        : ok('blocked', { reason: 'Run with --base-url=http://localhost:3000 to validate /api/availability.', diagnostic_category: 'environment_invalid' }),
      holiday_provider_group_enforcement: baseUrl
        ? ok(
            baselineHolidayAvailability.ok &&
              postHolidayAvailability.ok &&
              uniqueSlots(baselineHolidayAvailability.body?.slots).length > 0 &&
              uniqueSlots(postHolidayAvailability.body?.slots).length === 0
              ? 'pass'
              : 'fail',
            {
              baseline_slots: uniqueSlots(baselineHolidayAvailability.body?.slots),
              after_slots: uniqueSlots(postHolidayAvailability.body?.slots),
              baseline_status: baselineHolidayAvailability.status,
              after_status: postHolidayAvailability.status,
              baseline_error: baselineHolidayAvailability.body?.error || null,
              after_error: postHolidayAvailability.body?.error || null,
              diagnostic_category:
                [baselineHolidayAvailability.body?.error, postHolidayAvailability.body?.error]
                  .filter(Boolean)
                  .some((message) => String(message).includes('Missing NEXT_PUBLIC_SUPABASE_URL') || String(message).includes('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY') || String(message).includes('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'))
                  ? 'environment_invalid'
                  : baselineHolidayAvailability.status >= 500 || postHolidayAvailability.status >= 500
                    ? 'availability_error'
                    : 'unexpected_server_error',
            },
          )
        : ok('blocked', { reason: 'Run with --base-url=http://localhost:3000 to validate holiday blocking.', diagnostic_category: 'environment_invalid' }),
    },
    evidence_checked: [
      { name: 'controlled_booking_create', status: controlledBookingEvidence.create?.status || controlledBookingFlow.status, response_status: controlledBookingEvidence.create?.response_status ?? null },
      { name: 'controlled_booking_reschedule', status: controlledBookingEvidence.reschedule?.status || controlledBookingFlow.status, response_status: controlledBookingEvidence.reschedule?.response_status ?? null },
      { name: 'controlled_booking_cancel', status: controlledBookingEvidence.cancel?.status || controlledBookingFlow.status, response_status: controlledBookingEvidence.cancel?.response_status ?? null },
    ],
  }

  const reportPath = path.join(root, `LIVE_SMOKE_REPORT_${smokeDate}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log(`REPORT_PATH=${reportPath}`)
}

main().catch((error) => {
  const diagnosticCategory = classifyExecutionError(error)
  console.error({
    message: error?.message || 'Unknown error',
    diagnostic_category: diagnosticCategory,
    details: error?.details || null,
  })
  process.exit(1)
})
