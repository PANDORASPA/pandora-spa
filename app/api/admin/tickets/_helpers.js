import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'

export const normalizeText = (value) => String(value || '').trim()

export const normalizeEmail = (value) => normalizeText(value).toLowerCase()

export const normalizePositiveInteger = (value) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export const addYears = (date, years) => {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

const MAX_CSV_BYTES = 256 * 1024
const MAX_CSV_ROWS = 500
const FORMULA_INJECTION_PATTERN = /^[=+\-@]\s*[A-Za-z(]/

export async function loadAdminContext() {
  const authSupabase = getServerClient()
  const {
    data: { user },
    error: userError,
  } = await authSupabase.auth.getUser()

  if (userError) return { error: userError.message, status: 401 }
  if (!user?.id) return { error: 'Unauthorized', status: 401 }

  const supabase = getServiceClient()
  const { data: profile, error: profileError } = await supabase
    .from('member_profiles')
    .select('id,is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) return { error: profileError.message, status: 500 }
  if (!profile?.is_admin) return { error: 'Forbidden', status: 403 }

  return { user, supabase, error: null, status: 200 }
}

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    pushField()
    if (row.some((cell) => normalizeText(cell))) rows.push(row)
    row = []
  }

  for (let index = 0; index < String(text || '').length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      pushField()
    } else if (char === '\n') {
      pushRow()
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field || row.length) pushRow()
  return rows
}

const HEADER_ALIASES = {
  email: ['email', 'e-mail', 'member_email'],
  phone: ['phone', 'mobile', 'tel', 'telephone'],
  full_name: ['full_name', 'name', 'customer_name', 'member_name'],
  ticket_name: ['ticket_name', 'package_name', '套票', '套票名稱'],
  service_name: ['service_name', 'service', '服務', '服務名稱'],
  remaining_count: ['remaining_count', 'count', 'balance', 'remaining', '餘額', '剩餘次數'],
  expiry_date: ['expiry_date', 'expires_at', 'expiry', '到期日'],
  note: ['note', 'notes', '備註'],
}

const canonicalHeader = (header) => {
  const normalized = normalizeText(header).toLowerCase()
  return Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.includes(normalized))?.[0] || normalized
}

export function parseTicketImportCsv(csvText) {
  const byteLength = new TextEncoder().encode(String(csvText || '')).length
  if (byteLength > MAX_CSV_BYTES) {
    return { headers: [], rows: [], errors: [`CSV file is too large. Maximum size is ${MAX_CSV_BYTES} bytes.`] }
  }

  const rows = parseCsv(csvText)
  if (rows.length === 0) return { headers: [], rows: [] }
  if (rows.length - 1 > MAX_CSV_ROWS) {
    return { headers: [], rows: [], errors: [`CSV contains too many rows. Maximum import rows is ${MAX_CSV_ROWS}.`] }
  }

  const headers = rows[0].map(canonicalHeader)
  return {
    headers,
    rows: rows.slice(1).map((cells, index) => {
      const row = { rowNumber: index + 2 }
      headers.forEach((header, cellIndex) => {
        row[header] = normalizeText(cells[cellIndex])
      })
      row.__dangerousFormulaCells = cells
        .map((cell, cellIndex) => ({
          header: headers[cellIndex] || `column_${cellIndex + 1}`,
          value: normalizeText(cell),
        }))
        .filter((cell) => FORMULA_INJECTION_PATTERN.test(cell.value))
      return row
    }),
  }
}

const normalizeDateValue = (value) => {
  const text = normalizeText(value)
  if (!text) return null
  const direct = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}T23:59:59.000Z`
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const day = slash[1].padStart(2, '0')
    const month = slash[2].padStart(2, '0')
    return `${slash[3]}-${month}-${day}T23:59:59.000Z`
  }
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export async function buildTicketImportPreview({ supabase, csvText }) {
  const parsed = parseTicketImportCsv(csvText)
  if (parsed.errors?.length) {
    return {
      rows: [],
      summary: { totalRows: 0, validRows: 0, errorRows: 0 },
      errors: parsed.errors,
    }
  }
  const requiredHeaders = ['ticket_name', 'remaining_count']
  const missingHeaders = requiredHeaders.filter((header) => !parsed.headers.includes(header))

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      summary: { totalRows: 0, validRows: 0, errorRows: 0 },
      errors: [`Missing required CSV headers: ${missingHeaders.join(', ')}`],
    }
  }

  const [profilesRes, ticketsRes, servicesRes, userTicketsRes] = await Promise.all([
    supabase.from('member_profiles').select('id,email,full_name,phone').order('email'),
    supabase.from('tickets').select('id,name,service_id,count,enabled').order('name'),
    supabase.from('services').select('id,name').order('name'),
    supabase.from('user_tickets').select('id,member_user_id,ticket_id,remaining_count,expiry_date'),
  ])

  if (profilesRes.error) throw profilesRes.error
  if (ticketsRes.error) throw ticketsRes.error
  if (servicesRes.error) throw servicesRes.error
  if (userTicketsRes.error) throw userTicketsRes.error

  const profiles = profilesRes.data || []
  const tickets = ticketsRes.data || []
  const services = servicesRes.data || []
  const existingUserTickets = userTicketsRes.data || []

  const serviceByName = new Map(services.map((service) => [normalizeText(service.name).toLowerCase(), service]))
  const ticketByName = new Map(tickets.map((ticket) => [normalizeText(ticket.name).toLowerCase(), ticket]))

  const previewRows = parsed.rows.map((row) => {
    const errors = []
    const warnings = []
    const email = normalizeEmail(row.email)
    const phone = normalizeText(row.phone)
    const remainingCount = normalizePositiveInteger(row.remaining_count)
    const ticketName = normalizeText(row.ticket_name)
    const serviceName = normalizeText(row.service_name)
    const expiryDate = normalizeDateValue(row.expiry_date) || addYears(new Date(), 1).toISOString()

    if (!email && !phone) errors.push('email or phone is required')
    if (!ticketName) errors.push('ticket_name is required')
    if (!remainingCount) errors.push('remaining_count must be a positive integer')
    if (row.__dangerousFormulaCells?.length) {
      errors.push(`CSV contains formula-like cell values in: ${row.__dangerousFormulaCells.map((cell) => cell.header).join(', ')}`)
    }

    const profileMatches = profiles.filter((profile) => {
      const profileEmail = normalizeEmail(profile.email)
      const profilePhone = normalizeText(profile.phone)
      return (email && profileEmail === email) || (phone && profilePhone === phone)
    })
    if (profileMatches.length === 0) errors.push('No matching member profile')
    if (profileMatches.length > 1) errors.push('Multiple matching member profiles')

    const ticket = ticketByName.get(ticketName.toLowerCase()) || null
    if (!ticket) errors.push('No matching package/ticket template')
    if (ticket?.enabled === false) warnings.push('Matched package template is disabled')

    const service = serviceName ? serviceByName.get(serviceName.toLowerCase()) || null : null
    if (serviceName && !service) errors.push('No matching service')
    if (service && ticket?.service_id && Number(ticket.service_id) !== Number(service.id)) {
      errors.push('Ticket template service does not match service_name')
    }
    const existingBalance = profileMatches[0] && ticket
      ? existingUserTickets.find(
          (item) =>
            String(item.member_user_id) === String(profileMatches[0].id) &&
            Number(item.ticket_id) === Number(ticket.id) &&
            Number(item.remaining_count || 0) > 0,
        )
      : null
    if (existingBalance) {
      warnings.push(`Member already has package balance #${existingBalance.id}; commit will add a new balance row, not overwrite it`)
    }

    return {
      rowNumber: row.rowNumber,
      email,
      phone,
      full_name: normalizeText(row.full_name),
      ticket_name: ticketName,
      service_name: serviceName,
      remaining_count: remainingCount || 0,
      expiry_date: expiryDate,
      note: normalizeText(row.note),
      member: profileMatches[0] || null,
      ticket,
      service,
      errors,
      warnings,
      valid: errors.length === 0,
    }
  })

  return {
    rows: previewRows,
    summary: {
      totalRows: previewRows.length,
      validRows: previewRows.filter((row) => row.valid).length,
      errorRows: previewRows.filter((row) => !row.valid).length,
    },
    errors: [],
  }
}
