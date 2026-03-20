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

const serviceSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
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
const smokeDate = '2026-03-19'
const smokeConfig = {
  serviceId: 1,
  primaryStaffId: 3,
  secondaryStaffId: 4,
  createDate: '2026-03-27',
  rescheduleDate: '2026-03-28',
  rollbackDate: '2026-03-29',
  ticketCancelDate: '2026-03-31',
  locationCode: `SMOKE-LOC-${smokeDate}`,
  locationName: `SMOKE Location ${smokeDate}`,
  groupName: `SMOKE Provider Group ${smokeDate}`,
  resourceName: `SMOKE Resource ${smokeDate}`,
  smokeLabel: `Release Gate Smoke ${smokeDate}`,
  memberEmail: `codex.release.member.${smokeDate.replaceAll('-', '')}@example.com`,
  outsiderEmail: `codex.release.outsider.${smokeDate.replaceAll('-', '')}@example.com`,
  adminEmail: `codex.release.admin.${smokeDate.replaceAll('-', '')}@example.com`,
  password: 'ReleaseGate123!',
}

const outcome = (status, details = {}) => ({ status, ...details })
const createStructuredError = (message, details = {}) => {
  const error = new Error(message)
  error.details = details
  return error
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

const addMinutes = (time, amount) => {
  const start = parseTimeToMinutes(time)
  return start == null ? null : minutesToTime(start + amount)
}

const toLegacyDate = (dateISO) => {
  const [year, month, day] = String(dateISO).split('-')
  return `${Number(day)}/${Number(month)}/${year}`
}

const uniqueSlots = (slots) => [...new Set((slots || []).map((slot) => String(slot).slice(0, 5)).filter(Boolean))]

async function maybeSingle(query) {
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

async function fetchJson(url, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body,
    redirect: 'manual',
  })
  const payload = await response.json().catch(async () => {
    const text = await response.text().catch(() => '')
    return { raw: text }
  })
  return {
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    body: payload,
  }
}

async function probeAuthenticatedRoute(cookieHeader) {
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

async function ensureSmokeUser({ email, isAdmin }) {
  const list = await serviceSupabase.auth.admin.listUsers()
  if (list.error) throw list.error
  let user = (list.data?.users || []).find((item) => item.email === email)
  if (!user) {
    const created = await serviceSupabase.auth.admin.createUser({
      email,
      password: smokeConfig.password,
      email_confirm: true,
    })
    if (created.error) throw created.error
    user = created.data.user
  } else {
    const updated = await serviceSupabase.auth.admin.updateUserById(user.id, {
      password: smokeConfig.password,
      email_confirm: true,
    })
    if (updated.error) throw updated.error
    user = updated.data.user
  }

  const { error: profileError } = await serviceSupabase
    .from('member_profiles')
    .upsert({ id: user.id, is_admin: isAdmin }, { onConflict: 'id' })
  if (profileError) throw profileError

  return user
}

async function buildCookieHeader(email) {
  const login = await anonSupabase.auth.signInWithPassword({
    email,
    password: smokeConfig.password,
  })
  if (login.error) throw login.error
  const chunks = createChunks(anonSupabase.auth.storageKey, JSON.stringify(login.data.session))
  return chunks.map((chunk) => `${chunk.name}=${encodeURIComponent(chunk.value)}`).join('; ')
}

async function ensureLocation() {
  const existing = await maybeSingle(serviceSupabase.from('locations').select('*').eq('code', smokeConfig.locationCode))
  if (existing) return existing
  const { data, error } = await serviceSupabase
    .from('locations')
    .insert({
      code: smokeConfig.locationCode,
      name: smokeConfig.locationName,
      address: 'Release gate validation address',
      contact_phone: '0000 0000',
      enabled: true,
      sort_order: 998,
      timezone: 'Asia/Hong_Kong',
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function ensureProviderGroup() {
  const existing = await maybeSingle(serviceSupabase.from('provider_groups').select('*').eq('name', smokeConfig.groupName))
  if (existing) return existing
  const { data, error } = await serviceSupabase
    .from('provider_groups')
    .insert({
      name: smokeConfig.groupName,
      description: 'Release gate provider group',
      enabled: true,
      sort_order: 998,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function ensureResource(locationId) {
  const existing = await maybeSingle(
    serviceSupabase.from('resources').select('*').eq('name', smokeConfig.resourceName).eq('location_id', locationId),
  )
  if (existing) return existing
  const { data, error } = await serviceSupabase
    .from('resources')
    .insert({
      name: smokeConfig.resourceName,
      type: 'chair',
      location_id: locationId,
      capacity: 1,
      enabled: true,
      sort_order: 998,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function ensureServiceRelations(locationId, providerGroupId, resourceId) {
  await serviceSupabase.from('service_locations').upsert({
    service_id: smokeConfig.serviceId,
    location_id: locationId,
    extra_price: 0,
    enabled: true,
  })
  await serviceSupabase.from('service_provider_groups').upsert({
    service_id: smokeConfig.serviceId,
    provider_group_id: providerGroupId,
    assignment_mode: 'required',
  })
  await serviceSupabase.from('service_resources').upsert({
    service_id: smokeConfig.serviceId,
    resource_id: resourceId,
    quantity: 1,
    required: true,
  })
  await serviceSupabase.from('service_resources').delete().eq('service_id', smokeConfig.serviceId).neq('resource_id', resourceId)
  await serviceSupabase.from('staff_provider_groups').upsert({ staff_id: smokeConfig.primaryStaffId, provider_group_id: providerGroupId })
  await serviceSupabase.from('staff_provider_groups').upsert({ staff_id: smokeConfig.secondaryStaffId, provider_group_id: providerGroupId })
  const primaryStaff = await maybeSingle(serviceSupabase.from('staff').select('*').eq('id', smokeConfig.primaryStaffId))
  const secondaryStaff = await maybeSingle(serviceSupabase.from('staff').select('*').eq('id', smokeConfig.secondaryStaffId))
  const mergeServices = (staffRow) => {
    const list = Array.isArray(staffRow?.services) ? staffRow.services.map((value) => Number(value)).filter(Number.isFinite) : []
    return Array.from(new Set([...list, smokeConfig.serviceId]))
  }
  await serviceSupabase
    .from('staff')
    .update({ location_id: locationId, provider_group_id: providerGroupId, services: mergeServices(primaryStaff) })
    .eq('id', smokeConfig.primaryStaffId)
  await serviceSupabase
    .from('staff')
    .update({ location_id: locationId, provider_group_id: providerGroupId, services: mergeServices(secondaryStaff) })
    .eq('id', smokeConfig.secondaryStaffId)
}

async function ensureShift(staffId, dateISO) {
  const { error } = await serviceSupabase
    .from('staff_shifts')
    .upsert(
      {
        staff_id: staffId,
        date: dateISO,
        start_time: '09:00:00',
        end_time: '18:00:00',
        is_off: false,
      },
      { onConflict: 'staff_id,date' },
    )
  if (error) throw error
}

async function ensureTicketForUser(userId) {
  const existing = await maybeSingle(
    serviceSupabase.from('user_tickets').select('*').eq('member_user_id', userId).eq('ticket_name', `Release Gate Ticket ${smokeDate}`),
  )
  const payload = {
    member_user_id: userId,
    customer_id: null,
    ticket_id: 1,
    ticket_name: `Release Gate Ticket ${smokeDate}`,
    remaining_count: 2,
    expiry_date: '2026-12-31T00:00:00+00:00',
  }
  if (existing) {
    const { data, error } = await serviceSupabase.from('user_tickets').update(payload).eq('id', existing.id).select('*').single()
    if (error) throw error
    return data
  }
  const { data, error } = await serviceSupabase.from('user_tickets').insert(payload).select('*').single()
  if (error) throw error
  return data
}

async function cleanupUserBookings(userId) {
  const { data: rows, error } = await serviceSupabase
    .from('bookings')
    .select('id,ref')
    .eq('user_id', userId)
    .ilike('customer_name', `${smokeConfig.smokeLabel}%`)
  if (error) throw error
  const ids = (rows || []).map((row) => row.id).filter(Boolean)
  if (!ids.length) return
  await serviceSupabase.from('booking_resource_allocations').delete().in('booking_id', ids)
  await serviceSupabase.from('bookings').delete().in('id', ids)
}

async function runAvailability(dateISO, locationId, staffId) {
  const url = `${baseUrl}/api/availability?date=${dateISO}&serviceId=${smokeConfig.serviceId}&staffId=${staffId}&locationId=${locationId}`
  return fetchJson(url)
}

async function runMonthSummary(referenceDateISO, locationId, staffId) {
  const [year, month] = String(referenceDateISO).split('-')
  const url = `${baseUrl}/api/availability/month-summary?serviceId=${smokeConfig.serviceId}&staffId=${staffId}&locationId=${locationId}&year=${Number(year)}&month=${Number(month)}`
  return fetchJson(url)
}

async function findSlot(dateISO, locationId, staffId, preferred = []) {
  const monthSummary = await runMonthSummary(dateISO, locationId, staffId)
  const dates = Array.isArray(monthSummary.body?.dates) ? monthSummary.body.dates : []
  const dateEntry = dates.find((entry) => entry?.date === dateISO) || null
  if (!monthSummary.ok) {
    return {
      monthSummary,
      dateEntry,
      availability: null,
      slots: [],
      chosen: null,
      diagnosticCategory: monthSummary.status >= 500 ? 'availability_error' : 'seed_invalid',
      diagnosticReason: monthSummary.body?.error || 'month_summary_failed',
    }
  }
  if (!dateEntry) {
    return {
      monthSummary,
      dateEntry,
      availability: null,
      slots: [],
      chosen: null,
      diagnosticCategory: 'seed_invalid',
      diagnosticReason: 'date_missing_from_month_summary',
    }
  }
  if (dateEntry.status !== 'available') {
    return {
      monthSummary,
      dateEntry,
      availability: null,
      slots: [],
      chosen: null,
      diagnosticCategory: 'seed_invalid',
      diagnosticReason: dateEntry.reason || dateEntry.status || 'not_available',
    }
  }

  const availability = await runAvailability(dateISO, locationId, staffId)
  const slots = uniqueSlots(availability.body?.slots)
  const chosen = preferred.find((slot) => slots.includes(slot)) || slots[0] || null
  return {
    monthSummary,
    dateEntry,
    availability,
    slots,
    chosen,
    diagnosticCategory: availability.ok ? (chosen ? null : 'seed_invalid') : availability.status >= 500 ? 'availability_error' : 'unexpected_server_error',
    diagnosticReason: availability.ok ? (chosen ? null : 'no_bookable_slots') : availability.body?.error || 'availability_failed',
  }
}

async function createBookingRequest({ cookieHeader, dateISO, startTime, locationId, staffId, userTicketId = null, label }) {
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
      startTime,
      locationId,
      customerName: `${smokeConfig.smokeLabel} ${label}`,
      customerPhone: '12345678',
      ...(userTicketId ? { userTicketId } : {}),
    }),
  })
}

async function fetchBookingSnapshot(bookingId) {
  const booking = await maybeSingle(serviceSupabase.from('bookings').select('*').eq('id', bookingId))
  const { data: allocations, error } = await serviceSupabase.from('booking_resource_allocations').select('*').eq('booking_id', bookingId)
  if (error) throw error
  return { booking, allocations: allocations || [] }
}

async function rescheduleBooking({ cookieHeader, bookingId, dateISO, startTime, locationId, staffId, extraHeaders = {} }) {
  return fetchJson(`${baseUrl}/api/account/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
      ...extraHeaders,
    },
    body: JSON.stringify({
      action: 'reschedule',
      date: dateISO,
      serviceId: smokeConfig.serviceId,
      staffId,
      startTime,
      locationId,
      customerName: `${smokeConfig.smokeLabel} Rescheduled`,
      customerPhone: '12345678',
    }),
  })
}

async function cancelBooking({ cookieHeader, bookingId }) {
  return fetchJson(`${baseUrl}/api/account/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
    },
    body: JSON.stringify({ action: 'cancel' }),
  })
}

async function main() {
  const service = await maybeSingle(serviceSupabase.from('services').select('*').eq('id', smokeConfig.serviceId))
  if (!service) throw new Error(`Service ${smokeConfig.serviceId} not found`)

  const location = await ensureLocation()
  const providerGroup = await ensureProviderGroup()
  const resource = await ensureResource(location.id)
  await ensureServiceRelations(location.id, providerGroup.id, resource.id)

  for (const date of [smokeConfig.createDate, smokeConfig.rescheduleDate, smokeConfig.rollbackDate, smokeConfig.ticketCancelDate]) {
    await ensureShift(smokeConfig.primaryStaffId, date)
    await ensureShift(smokeConfig.secondaryStaffId, date)
  }

  const memberUser = await ensureSmokeUser({ email: smokeConfig.memberEmail, isAdmin: false })
  const outsiderUser = await ensureSmokeUser({ email: smokeConfig.outsiderEmail, isAdmin: false })
  const adminUser = await ensureSmokeUser({ email: smokeConfig.adminEmail, isAdmin: true })
  const memberCookie = await buildCookieHeader(smokeConfig.memberEmail)
  const outsiderCookie = await buildCookieHeader(smokeConfig.outsiderEmail)
  const adminCookie = await buildCookieHeader(smokeConfig.adminEmail)
  const environmentProbe = await probeAvailabilityEnvironment()
  if (!environmentProbe.valid) {
    throw createStructuredError('Availability environment probe failed.', {
      diagnostic_category: 'environment_invalid',
      environment_probe: environmentProbe,
    })
  }
  const memberProbe = await probeAuthenticatedRoute(memberCookie)
  const outsiderProbe = await probeAuthenticatedRoute(outsiderCookie)
  const adminProbe = await probeAuthenticatedRoute(adminCookie)
  if (!memberProbe.valid) {
    throw createStructuredError('Smoke member session is not valid for account route.', {
      diagnostic_category: 'auth_session_invalid',
      auth_probe: memberProbe,
      outsider_probe: outsiderProbe,
      admin_probe: adminProbe,
    })
  }

  await cleanupUserBookings(memberUser.id)
  await cleanupUserBookings(outsiderUser.id)

  const ticket = await ensureTicketForUser(memberUser.id)

  const createBaseline = await findSlot(smokeConfig.createDate, location.id, smokeConfig.primaryStaffId)
  if (!createBaseline.chosen) {
    throw createStructuredError('No create slot available for primary staff.', {
      diagnostic_category: createBaseline.diagnosticCategory || 'seed_invalid',
      create_baseline: {
        date: smokeConfig.createDate,
        date_entry: createBaseline.dateEntry,
        month_summary_status: createBaseline.monthSummary?.status ?? null,
        month_summary_error: createBaseline.monthSummary?.body?.error ?? null,
        availability_status: createBaseline.availability?.status ?? null,
        availability_error: createBaseline.availability?.body?.error ?? null,
        diagnostic_reason: createBaseline.diagnosticReason,
      },
    })
  }

  const createSuccess = await createBookingRequest({
    cookieHeader: memberCookie,
    dateISO: smokeConfig.createDate,
    startTime: createBaseline.chosen,
    locationId: location.id,
    staffId: smokeConfig.primaryStaffId,
    label: 'Create',
  })
  if (!createSuccess.ok) {
    throw new Error(`Create smoke failed unexpectedly: ${JSON.stringify(createSuccess.body)}`)
  }

  const createdBooking = createSuccess.body?.booking
  const createSnapshot = await fetchBookingSnapshot(createdBooking.id)

  const duplicateCreate = await createBookingRequest({
    cookieHeader: memberCookie,
    dateISO: smokeConfig.createDate,
    startTime: createBaseline.chosen,
    locationId: location.id,
    staffId: smokeConfig.primaryStaffId,
    label: 'Duplicate',
  })

  const resourceFull = await createBookingRequest({
    cookieHeader: memberCookie,
    dateISO: smokeConfig.createDate,
    startTime: createBaseline.chosen,
    locationId: location.id,
    staffId: smokeConfig.secondaryStaffId,
    label: 'ResourceFull',
  })

  const selfExclusionAttempt = await rescheduleBooking({
    cookieHeader: memberCookie,
    bookingId: createdBooking.id,
    dateISO: smokeConfig.createDate,
    startTime: createBaseline.chosen,
    locationId: location.id,
    staffId: smokeConfig.primaryStaffId,
  })
  const selfExclusionSnapshot = await fetchBookingSnapshot(createdBooking.id)

  const rescheduleTarget = await findSlot(smokeConfig.rescheduleDate, location.id, smokeConfig.primaryStaffId, ['10:00', '10:15', '10:30', '11:00'])
  if (!rescheduleTarget.chosen) {
    throw createStructuredError('No reschedule slot available for primary staff.', {
      diagnostic_category: rescheduleTarget.diagnosticCategory || 'seed_invalid',
      reschedule_target: {
        date: smokeConfig.rescheduleDate,
        date_entry: rescheduleTarget.dateEntry,
        availability_status: rescheduleTarget.availability?.status ?? null,
        diagnostic_reason: rescheduleTarget.diagnosticReason,
      },
    })
  }

  const beforeReschedule = await fetchBookingSnapshot(createdBooking.id)
  const rescheduleSuccess = await rescheduleBooking({
    cookieHeader: memberCookie,
    bookingId: createdBooking.id,
    dateISO: smokeConfig.rescheduleDate,
    startTime: rescheduleTarget.chosen,
    locationId: location.id,
    staffId: smokeConfig.primaryStaffId,
  })
  const afterReschedule = await fetchBookingSnapshot(createdBooking.id)

  const rollbackTarget = await findSlot(smokeConfig.rollbackDate, location.id, smokeConfig.primaryStaffId, ['11:00', '11:15', '11:30', '12:00'])
  if (!rollbackTarget.chosen) {
    throw createStructuredError('No rollback target slot available for primary staff.', {
      diagnostic_category: rollbackTarget.diagnosticCategory || 'seed_invalid',
      rollback_target: {
        date: smokeConfig.rollbackDate,
        date_entry: rollbackTarget.dateEntry,
        availability_status: rollbackTarget.availability?.status ?? null,
        diagnostic_reason: rollbackTarget.diagnosticReason,
      },
    })
  }

  const beforeRollback = await fetchBookingSnapshot(createdBooking.id)
  const forcedRollback = await rescheduleBooking({
    cookieHeader: memberCookie,
    bookingId: createdBooking.id,
    dateISO: smokeConfig.rollbackDate,
    startTime: rollbackTarget.chosen,
    locationId: location.id,
    staffId: smokeConfig.primaryStaffId,
    extraHeaders: {
      'x-smoke-force-allocation-fail': '1',
    },
  })
  const afterRollback = await fetchBookingSnapshot(createdBooking.id)

  const ticketCreateBaseline = await findSlot(smokeConfig.ticketCancelDate, location.id, smokeConfig.primaryStaffId, ['09:00', '10:00', '11:00'])
  if (!ticketCreateBaseline.chosen) {
    throw createStructuredError('No ticket cancel slot available for primary staff.', {
      diagnostic_category: ticketCreateBaseline.diagnosticCategory || 'seed_invalid',
      ticket_target: {
        date: smokeConfig.ticketCancelDate,
        date_entry: ticketCreateBaseline.dateEntry,
        availability_status: ticketCreateBaseline.availability?.status ?? null,
        diagnostic_reason: ticketCreateBaseline.diagnosticReason,
      },
    })
  }
  const ticketCreate = await createBookingRequest({
    cookieHeader: memberCookie,
    dateISO: smokeConfig.ticketCancelDate,
    startTime: ticketCreateBaseline.chosen,
    locationId: location.id,
    staffId: smokeConfig.primaryStaffId,
    userTicketId: ticket.id,
    label: 'TicketCancel',
  })
  if (!ticketCreate.ok) {
    throw new Error(`Ticket create smoke failed unexpectedly: ${JSON.stringify(ticketCreate.body)}`)
  }
  const ticketBeforeCancel = await maybeSingle(serviceSupabase.from('user_tickets').select('*').eq('id', ticket.id))
  const cancelOwn = await cancelBooking({ cookieHeader: memberCookie, bookingId: ticketCreate.body.booking.id })
  const ticketAfterCancel = await maybeSingle(serviceSupabase.from('user_tickets').select('*').eq('id', ticket.id))
  const outsiderPatch = await fetchJson(`${baseUrl}/api/account/bookings/${createdBooking.id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      cookie: outsiderCookie,
    },
    body: JSON.stringify({ action: 'cancel' }),
  })

  const unauthAdmin = await fetch(`${baseUrl}/admin`, { redirect: 'manual' })
  const memberAdmin = await fetch(`${baseUrl}/admin`, { headers: { cookie: memberCookie }, redirect: 'manual' })
  const adminAccess = await fetch(`${baseUrl}/admin`, { headers: { cookie: adminCookie }, redirect: 'manual' })
  const unauthAccount = await fetch(`${baseUrl}/account/bookings`, { redirect: 'manual' })
  const memberAccount = await fetch(`${baseUrl}/account/bookings`, { headers: { cookie: memberCookie }, redirect: 'manual' })

  const rollbackEvidenceReady = Boolean(beforeRollback.booking && afterRollback.booking)
  const rollbackRestored =
    rollbackEvidenceReady &&
    beforeRollback.booking?.appointment_date === afterRollback.booking?.appointment_date &&
    String(beforeRollback.booking?.start_time).slice(0, 5) === String(afterRollback.booking?.start_time).slice(0, 5) &&
    beforeRollback.allocations.length === afterRollback.allocations.length &&
    afterRollback.allocations.length > 0

  const rollbackStatus = !rollbackEvidenceReady
    ? 'insufficient_evidence'
    : forcedRollback.status >= 500 && forcedRollback.body?.details?.rollbackVerified === true && rollbackRestored
      ? 'pass'
      : 'fail'

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    seeds: {
      member_user_id: memberUser.id,
      outsider_user_id: outsiderUser.id,
      admin_user_id: adminUser.id,
      location_id: location.id,
      provider_group_id: providerGroup.id,
      resource_id: resource.id,
      create_booking_id: createdBooking.id,
      ticket_booking_id: ticketCreate.body?.booking?.id || null,
      user_ticket_id: ticket.id,
      primary_staff_id: smokeConfig.primaryStaffId,
      secondary_staff_id: smokeConfig.secondaryStaffId,
    },
    checks: {
      booking_create_success: outcome(
        createSuccess.ok &&
          createSnapshot.booking?.appointment_date === smokeConfig.createDate &&
          String(createSnapshot.booking?.location_id) === String(location.id) &&
          String(createSnapshot.booking?.provider_group_id) === String(providerGroup.id) &&
          (createSnapshot.allocations || []).length > 0
          ? 'pass'
          : 'fail',
        {
          response_status: createSuccess.status,
          booking_id: createdBooking.id,
          appointment_date: createSnapshot.booking?.appointment_date || null,
          start_time: createSnapshot.booking?.start_time || null,
          end_time: createSnapshot.booking?.end_time || null,
          buffer_end_time: createSnapshot.booking?.buffer_end_time || null,
          location_id: createSnapshot.booking?.location_id || null,
          provider_group_id: createSnapshot.booking?.provider_group_id || null,
          allocation_count: createSnapshot.allocations.length,
        },
      ),
      booking_create_duplicate_conflict: outcome(
        duplicateCreate.status === 409 && ['staff_collision', 'buffer_collision', 'provider_location_mismatch'].includes(duplicateCreate.body?.code)
          ? 'pass'
          : 'fail',
        {
          response_status: duplicateCreate.status,
          response_code: duplicateCreate.body?.code || null,
          response_error: duplicateCreate.body?.error || null,
        },
      ),
      booking_create_resource_full: outcome(
        resourceFull.status === 409 && resourceFull.body?.code === 'resource_full'
          ? 'pass'
          : 'fail',
        {
          response_status: resourceFull.status,
          response_code: resourceFull.body?.code || null,
          response_error: resourceFull.body?.error || null,
        },
      ),
      reschedule_self_exclusion: outcome(
        selfExclusionAttempt.ok &&
          selfExclusionSnapshot.booking?.appointment_date === smokeConfig.createDate &&
          String(selfExclusionSnapshot.booking?.start_time).slice(0, 5) === createBaseline.chosen
          ? 'pass'
          : 'fail',
        {
          response_status: selfExclusionAttempt.status,
          booking_id: createdBooking.id,
          appointment_date: selfExclusionSnapshot.booking?.appointment_date || null,
          start_time: selfExclusionSnapshot.booking?.start_time || null,
          allocation_count: selfExclusionSnapshot.allocations.length,
        },
      ),
      reschedule_success_allocation_rebuild: outcome(
        rescheduleSuccess.ok &&
          afterReschedule.booking?.appointment_date === smokeConfig.rescheduleDate &&
          String(afterReschedule.booking?.start_time).slice(0, 5) === rescheduleTarget.chosen &&
          afterReschedule.allocations.length > 0 &&
          beforeReschedule.allocations.length > 0
          ? 'pass'
          : 'fail',
        {
          response_status: rescheduleSuccess.status,
          before_snapshot: {
            appointment_date: beforeReschedule.booking?.appointment_date || null,
            start_time: beforeReschedule.booking?.start_time || null,
            allocation_count: beforeReschedule.allocations.length,
          },
          after_snapshot: {
            appointment_date: afterReschedule.booking?.appointment_date || null,
            start_time: afterReschedule.booking?.start_time || null,
            allocation_count: afterReschedule.allocations.length,
          },
        },
      ),
      reschedule_rollback_failure: outcome(
        rollbackStatus,
        {
          artifact: 'forced_allocation_failure_header',
          response_status: forcedRollback.status,
          response_code: forcedRollback.body?.code || null,
          response_error: forcedRollback.body?.error || null,
          rollback_verified: forcedRollback.body?.details?.rollbackVerified === true,
          before_snapshot: {
            appointment_date: beforeRollback.booking?.appointment_date || null,
            start_time: beforeRollback.booking?.start_time || null,
            allocation_count: beforeRollback.allocations.length,
          },
          after_snapshot: {
            appointment_date: afterRollback.booking?.appointment_date || null,
            start_time: afterRollback.booking?.start_time || null,
            allocation_count: afterRollback.allocations.length,
          },
          restore_details: forcedRollback.body?.details || null,
        },
      ),
      account_cancel_ticket_restore: outcome(
        cancelOwn.ok &&
          ticketBeforeCancel &&
          ticketAfterCancel &&
          Number(ticketAfterCancel.remaining_count || 0) === Number(ticketBeforeCancel.remaining_count || 0) + 1
          ? 'pass'
          : 'fail',
        {
          response_status: cancelOwn.status,
          booking_id: ticketCreate.body?.booking?.id || null,
          remaining_before_cancel: ticketBeforeCancel?.remaining_count ?? null,
          remaining_after_cancel: ticketAfterCancel?.remaining_count ?? null,
        },
      ),
      account_ownership_denial: outcome(
        outsiderPatch.status === 404 || outsiderPatch.status === 403 ? 'pass' : 'fail',
        {
          response_status: outsiderPatch.status,
          response_error: outsiderPatch.body?.error || null,
        },
      ),
      auth_admin_guard: outcome(
        unauthAdmin.status === 307 &&
          memberAdmin.status === 307 &&
          adminAccess.status === 200 &&
          unauthAccount.status === 307 &&
          memberAccount.status === 200
          ? 'pass'
          : 'fail',
        {
          unauth_admin: { status: unauthAdmin.status, location: unauthAdmin.headers.get('location') },
          member_admin: { status: memberAdmin.status, location: memberAdmin.headers.get('location') },
          admin_access: { status: adminAccess.status, location: adminAccess.headers.get('location') },
          unauth_account: { status: unauthAccount.status, location: unauthAccount.headers.get('location') },
          member_account: { status: memberAccount.status, location: memberAccount.headers.get('location') },
        },
      ),
    },
  }

  const checkEntries = Object.entries(report.checks)
  const blockingFindings = checkEntries
    .filter(([, check]) => check.status === 'fail')
    .map(([name, check]) => ({ name, response_status: check.response_status ?? null, response_code: check.response_code ?? null }))
  const evidenceGaps = checkEntries
    .filter(([, check]) => check.status === 'insufficient_evidence')
    .map(([name]) => name)

  report.release_decision =
    blockingFindings.length > 0 ? 'NO-GO' : evidenceGaps.length > 0 ? 'Conditional GO' : 'GO'
  report.blocking_findings = blockingFindings
  report.known_p2 = evidenceGaps
  report.known_p3 = []
  report.evidence_checked = checkEntries.map(([name, check]) => ({
    name,
    status: check.status,
    response_status: check.response_status ?? null,
  }))
  report.next_fix_round_needed = report.release_decision === 'GO' ? 'no' : 'yes'

  const reportPath = path.join(root, `RELEASE_GATE_REPORT_${smokeDate}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log(`REPORT_PATH=${reportPath}`)
}

main().catch((error) => {
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    checks: {},
    release_decision: 'NO-GO',
    blocking_findings: [
      {
        name: 'script_execution',
        response_status: null,
        response_code: error?.details?.diagnostic_category || 'unexpected_server_error',
      },
    ],
    known_p2: [],
    known_p3: [],
    evidence_checked: [],
    next_fix_round_needed: 'yes',
    failure: {
      message: error?.message || 'Unknown error',
      diagnostic_category: error?.details?.diagnostic_category || 'unexpected_server_error',
      details: error?.details || null,
    },
  }
  const reportPath = path.join(root, `RELEASE_GATE_REPORT_${smokeDate}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.error(error)
  console.log(`REPORT_PATH=${reportPath}`)
  process.exit(1)
})
