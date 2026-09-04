// =============================================================================
// SALON POKE — Supabase Data Layer
// Loads all data on init into in-memory state. Reads are sync. Writes are async
// and update state immediately for optimistic UI.
// =============================================================================
(function () {
  'use strict';

  if (!window.SUPABASE_CONFIG) {
    console.error('[Salon Poke] SUPABASE_CONFIG missing — load supabase-config.js first');
    return;
  }

  // ---- Supabase client init ----
  // Use the global supabase from CDN loaded in HTML
  const sb = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
  window.sb = sb;

  // ---- In-memory state (hydrated from Supabase) ----
  const state = {
    loaded: false,
    loading: null,
    passTemplates: [],
    products: [],
    schedule: [],
    siteSettings: null,
    preorderItems: [],
    customers: [],
    customerPasses: [],
    bookings: [],
    preorderReservations: [],
    blockedDates: [],
    newsletterSubscribers: []
  };
  window.salonPokeState = state;

  // ---- Map DB row -> app shape (camelCase) ----
  function rowToBooking(r) {
    if (!r) return null;
    return {
      id: r.id,
      customerId: r.customer_id,
      customerPassId: r.customer_pass_id,
      night: r.night,
      bookingDate: r.booking_date,
      partySize: r.party_size,
      plan: r.plan,
      notes: r.notes,
      status: r.status,
      isWalkin: r.is_walkin,
      source: r.source,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      attendedAt: r.attended_at,
      cancelledAt: r.cancelled_at,
      cancelledBy: r.cancelled_by,
      rescheduledAt: r.rescheduled_at,
      rescheduledBy: r.rescheduled_by,
      rescheduledFrom: r.rescheduled_from
    };
  }
  function bookingToRow(b) {
    return {
      customer_id: b.customerId,
      customer_pass_id: b.customerPassId || null,
      night: b.night,
      booking_date: b.bookingDate,
      party_size: b.partySize || 1,
      plan: b.plan,
      notes: b.notes,
      status: b.status || 'pending',
      is_walkin: b.isWalkin || false,
      source: b.source || 'web'
    };
  }
  function rowToPass(r) {
    return {
      id: r.id,
      customerId: r.customer_id,
      passTemplateId: r.pass_template_id,
      visitsTotal: r.visits_total,
      visitsRemaining: r.visits_remaining,
      visitsUsed: r.visits_used,
      purchasedAt: r.purchased_at,
      expiresAt: r.expires_at,
      status: r.status,
      paymentStatus: r.payment_status,
      priceGbp: r.price_gbp,
      source: r.source
    };
  }
  function passToRow(p) {
    return {
      customer_id: p.customerId,
      pass_template_id: p.passTemplateId,
      visits_total: p.visitsTotal,
      visits_remaining: p.visitsRemaining,
      visits_used: p.visitsUsed || 0,
      purchased_at: p.purchasedAt || new Date().toISOString(),
      expires_at: p.expiresAt || null,
      status: p.status || 'active',
      payment_status: p.paymentStatus || 'pending',
      price_gbp: p.priceGbp,
      source: p.source || 'web'
    };
  }
  function rowToCustomer(r) {
    return {
      id: r.id,
      email: r.email,
      name: r.full_name,
      phone: r.phone,
      notes: r.notes,
      tags: r.tags || [],
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }
  function customerToRow(c) {
    return {
      email: c.email,
      full_name: c.name,
      phone: c.phone,
      notes: c.notes,
      tags: c.tags || []
    };
  }
  function rowToPreorder(r) {
    return {
      id: r.id,
      customerId: r.customer_id,
      preorderItemId: r.preorder_item_id,
      itemName: r.item_name,
      itemCode: r.item_code,
      quantity: r.quantity,
      depositPaid: r.deposit_paid,
      status: r.status,
      reservedAt: r.reserved_at,
      pickedUpAt: r.picked_up_at,
      cancelledAt: r.cancelled_at,
      cancelledBy: r.cancelled_by
    };
  }
  function preorderToRow(p) {
    return {
      customer_id: p.customerId,
      preorder_item_id: p.preorderItemId,
      item_name: p.itemName,
      item_code: p.itemCode,
      quantity: p.quantity || 1,
      deposit_paid: p.depositPaid || 20,
      status: p.status || 'reserved'
    };
  }
  function rowToBlocked(r) {
    return { date: r.block_date, reason: r.reason, blockedAt: r.blocked_at };
  }
  function blockedToRow(b) {
    return { block_date: b.date, reason: b.reason || null };
  }

  // ---- Initial load ----
  async function loadAllData() {
    if (state.loading) return state.loading;
    state.loading = (async () => {
      try {
        const [ptpl, prd, sch, ss, po, cust, passes, bks, pres, blocks, subs] = await Promise.all([
          sb.from('pass_templates').select('*').order('sort_order'),
          sb.from('products').select('*'),
          sb.from('schedule_days').select('*').order('day_num'),
          sb.from('site_settings').select('*').eq('id', 1).maybeSingle(),
          sb.from('preorder_items').select('*'),
          sb.from('customers').select('*').order('created_at'),
          sb.from('customer_passes').select('*').order('purchased_at', { ascending: false }),
          sb.from('bookings').select('*').order('created_at', { ascending: false }),
          sb.from('preorder_reservations').select('*').order('reserved_at', { ascending: false }),
          sb.from('blocked_dates').select('*').order('block_date'),
          sb.from('newsletter_subscribers').select('*')
        ]);
        state.passTemplates = ptpl.data || [];
        state.products = prd.data || [];
        state.schedule = sch.data || [];
        state.siteSettings = ss.data;
        state.preorderItems = po.data || [];
        state.customers = (cust.data || []).map(rowToCustomer);
        state.customerPasses = (passes.data || []).map(rowToPass);
        state.bookings = (bks.data || []).map(rowToBooking);
        state.preorderReservations = (pres.data || []).map(rowToPreorder);
        state.blockedDates = (blocks.data || []).map(rowToBlocked);
        state.newsletterSubscribers = subs.data || [];
        state.loaded = true;
        console.log('[Salon Poke] Data loaded from Supabase:', {
          passTemplates: state.passTemplates.length,
          products: state.products.length,
          schedule: state.schedule.length,
          customers: state.customers.length,
          passes: state.customerPasses.length,
          bookings: state.bookings.length,
          preorders: state.preorderReservations.length,
          blocked: state.blockedDates.length
        });
        return true;
      } catch (e) {
        console.error('[Salon Poke] Load error:', e);
        throw e;
      } finally {
        state.loading = null;
      }
    })();
    return state.loading;
  }

  // ---- Sync getters (return references into state) ----
  function getPassTemplates() { return state.passTemplates; }
  function getProducts() { return state.products; }
  function getSchedule() { return state.schedule; }
  function getSiteSettings() { return state.siteSettings; }
  function getSiteMeta() { return state.siteSettings && state.siteSettings.site_meta; }
  function getHero() { return state.siteSettings && state.siteSettings.hero; }
  function getPricing() { return state.siteSettings && state.siteSettings.pricing; }
  function getOpeningHours() { return state.siteSettings && state.siteSettings.opening_hours; }
  function getAdminConfig() { return state.siteSettings && state.siteSettings.admin_config; }
  function getPassFaq() { return state.siteSettings && state.siteSettings.pass_faq; }
  function getPromo() { return state.siteSettings && state.siteSettings.promo; }
  function getPreorderItems() { return state.preorderItems; }
  function getCustomers() { return state.customers; }
  function getCustomerPasses() { return state.customerPasses; }
  function getBookings() { return state.bookings; }
  function getPreorderReservations() { return state.preorderReservations; }
  function getBlockedDates() { return state.blockedDates; }
  function getNewsletterSubscribers() { return state.newsletterSubscribers; }
  function isLoaded() { return state.loaded; }

  // ---- Customers ----
  async function upsertCustomer(c) {
    if (!c.email) return null;
    const email = c.email.trim().toLowerCase();
    const existing = state.customers.find(function (x) { return x.email === email; });
    if (existing) {
      // Update
      if (c.name && existing.name !== c.name) existing.name = c.name;
      if (c.phone && !existing.phone) existing.phone = c.phone;
      const { data, error } = await sb.from('customers').update({
        full_name: existing.name,
        phone: existing.phone
      }).eq('id', existing.id).select().single();
      if (error) throw error;
      Object.assign(existing, rowToCustomer(data));
      return existing;
    } else {
      // Insert
      const row = { email: email, full_name: c.name || email.split('@')[0], phone: c.phone || '', tags: [] };
      const { data, error } = await sb.from('customers').insert(row).select().single();
      if (error) throw error;
      const newC = rowToCustomer(data);
      state.customers.push(newC);
      return newC;
    }
  }

  // ---- Customer passes ----
  async function createCustomerPass(p) {
    const row = passToRow(p);
    const { data, error } = await sb.from('customer_passes').insert(row).select().single();
    if (error) throw error;
    const newPass = rowToPass(data);
    state.customerPasses.unshift(newPass);
    return newPass;
  }

  async function updateCustomerPass(passId, updates) {
    const idx = state.customerPasses.findIndex(function (x) { return x.id === passId; });
    if (idx < 0) return null;
    const row = {};
    if ('visitsRemaining' in updates) row.visits_remaining = updates.visitsRemaining;
    if ('visitsUsed' in updates) row.visits_used = updates.visitsUsed;
    if ('status' in updates) row.status = updates.status;
    if ('paymentStatus' in updates) row.payment_status = updates.paymentStatus;
    if ('paidAt' in updates) row.paid_at = updates.paidAt;
    const { data, error } = await sb.from('customer_passes').update(row).eq('id', passId).select().single();
    if (error) throw error;
    state.customerPasses[idx] = rowToPass(data);
    return state.customerPasses[idx];
  }

  async function deleteCustomerPass(passId) {
    const { error } = await sb.from('customer_passes').delete().eq('id', passId);
    if (error) throw error;
    state.customerPasses = state.customerPasses.filter(function (x) { return x.id !== passId; });
  }

  // ---- Bookings ----
  async function createBooking(b) {
    const row = bookingToRow(b);
    const { data, error } = await sb.from('bookings').insert(row).select().single();
    if (error) throw error;
    const newB = rowToBooking(data);
    state.bookings.unshift(newB);
    return newB;
  }

  async function updateBooking(bookingId, updates) {
    const idx = state.bookings.findIndex(function (x) { return x.id === bookingId; });
    if (idx < 0) return null;
    const row = {};
    if (updates.status) row.status = updates.status;
    if (updates.cancelledAt) row.cancelled_at = updates.cancelledAt;
    if (updates.cancelledBy !== undefined) row.cancelled_by = updates.cancelledBy;
    if (updates.attendedAt) row.attended_at = updates.attendedAt;
    if (updates.bookingDate) row.booking_date = updates.bookingDate;
    if (updates.night) row.night = updates.night;
    if (updates.rescheduledAt) row.rescheduled_at = updates.rescheduledAt;
    if (updates.rescheduledBy !== undefined) row.rescheduled_by = updates.rescheduledBy;
    if (updates.rescheduledFrom !== undefined) row.rescheduled_from = updates.rescheduledFrom;
    if (updates.notes !== undefined) row.notes = updates.notes;
    row.updated_at = new Date().toISOString();
    const { data, error } = await sb.from('bookings').update(row).eq('id', bookingId).select().single();
    if (error) throw error;
    state.bookings[idx] = rowToBooking(data);
    return state.bookings[idx];
  }

  // Atomic: mark attended and auto-deduct pass
  async function markAttended(bookingId, mark) {
    const { data, error } = await sb.rpc('mark_attended', { p_booking_id: bookingId, p_mark: mark });
    if (error) throw error;
    // Reload affected records
    await loadAllData();
  }

  // Refund a pass visit
  async function refundPassVisit(passId) {
    const { error } = await sb.rpc('refund_pass_visit', { p_pass_id: passId });
    if (error) throw error;
    await loadAllData();
  }

  async function expireOldPasses() {
    const { error } = await sb.rpc('expire_old_passes');
    if (error) throw error;
    await loadAllData();
  }

  // ---- Analytics: page view tracking ----
  async function trackPageView(path, referrer) {
    try {
      await sb.from('page_views').insert({
        path: path || (typeof location !== 'undefined' ? location.pathname : '/'),
        referrer: referrer || (typeof document !== 'undefined' ? document.referrer : null),
        user_agent: typeof navigator !== 'undefined' ? (navigator.userAgent || '').slice(0, 200) : null
      });
    } catch (e) { /* fail silently */ }
  }

  async function getPageViews(days) {
    days = days || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await sb.from('page_views').select('*').gte('created_at', since);
    if (error) return [];
    return data || [];
  }

  // ---- Pre-orders ----
  async function createPreorderReservation(p) {
    const row = preorderToRow(p);
    const { data, error } = await sb.from('preorder_reservations').insert(row).select().single();
    if (error) throw error;
    const newR = rowToPreorder(data);
    state.preorderReservations.unshift(newR);
    return newR;
  }

  async function updatePreorderReservation(resId, updates) {
    const idx = state.preorderReservations.findIndex(function (x) { return x.id === resId; });
    if (idx < 0) return null;
    const row = {};
    if (updates.status) row.status = updates.status;
    if (updates.pickedUpAt) row.picked_up_at = updates.pickedUpAt;
    if (updates.cancelledAt) row.cancelled_at = updates.cancelledAt;
    if (updates.cancelledBy !== undefined) row.cancelled_by = updates.cancelledBy;
    const { data, error } = await sb.from('preorder_reservations').update(row).eq('id', resId).select().single();
    if (error) throw error;
    state.preorderReservations[idx] = rowToPreorder(data);
    return state.preorderReservations[idx];
  }

  // ---- Blocked dates ----
  async function addBlockedDate(date, reason) {
    const row = blockedToRow({ date: date, reason: reason });
    const { data, error } = await sb.from('blocked_dates').insert(row).select().single();
    if (error) throw error;
    state.blockedDates.push(rowToBlocked(data));
  }

  async function removeBlockedDate(date) {
    const { error } = await sb.from('blocked_dates').delete().eq('block_date', date);
    if (error) throw error;
    state.blockedDates = state.blockedDates.filter(function (x) { return x.date !== date; });
  }

  // ---- Customer notes / tags (stored on customers.tags / customers.notes) ----
  async function setCustomerNote(customerId, note) {
    const { error } = await sb.from('customers').update({ notes: note || null }).eq('id', customerId);
    if (error) throw error;
    const c = state.customers.find(function (x) { return x.id === customerId; });
    if (c) c.notes = note;
  }

  async function setCustomerTags(customerId, tags) {
    const { error } = await sb.from('customers').update({ tags: tags || [] }).eq('id', customerId);
    if (error) throw error;
    const c = state.customers.find(function (x) { return x.id === customerId; });
    if (c) c.tags = tags || [];
  }

  // ---- GDPR delete ----
  async function gdprDeleteCustomer(customerId) {
    // First delete related records (cascade should handle some, but be explicit)
    await sb.from('customer_passes').delete().eq('customer_id', customerId);
    await sb.from('bookings').delete().eq('customer_id', customerId);
    await sb.from('preorder_reservations').delete().eq('customer_id', customerId);
    const { error } = await sb.from('customers').delete().eq('id', customerId);
    if (error) throw error;
    state.customers = state.customers.filter(function (c) { return c.id !== customerId; });
    state.customerPasses = state.customerPasses.filter(function (p) { return p.customerId !== customerId; });
    state.bookings = state.bookings.filter(function (b) { return b.customerId !== customerId; });
    state.preorderReservations = state.preorderReservations.filter(function (r) { return r.customerId !== customerId; });
  }

  // ---- Customer self-service portal (used by Member Center) ----
  const customerPortal = {
    findByEmail: function (email) {
      email = (email || '').trim().toLowerCase();
      if (!email) return null;
      const c = state.customers.find(function (x) { return x.email === email; });
      if (!c) return null;
      return {
        customer: c,
        bookings: state.bookings.filter(function (b) { return b.customerId === c.id; }),
        passes: state.customerPasses.filter(function (p) { return p.customerId === c.id; }),
        preorders: state.preorderReservations.filter(function (r) { return r.customerId === c.id; })
      };
    },
    cancelBooking: function (bookingId, email) {
      email = (email || '').trim().toLowerCase();
      const b = state.bookings.find(function (x) { return x.id === bookingId; });
      if (!b) return Promise.resolve({ ok: false, error: 'Booking not found' });
      const c = state.customers.find(function (x) { return x.id === b.customerId; });
      if (!c || c.email !== email) return Promise.resolve({ ok: false, error: 'Email does not match this booking' });
      if (b.status === 'cancelled') return Promise.resolve({ ok: false, error: 'Booking is already cancelled' });
      if (b.status === 'attended') return Promise.resolve({ ok: false, error: 'Cannot cancel — already attended' });
      if (b.status === 'no_show') return Promise.resolve({ ok: false, error: 'Cannot cancel a no-show record' });
      return updateBooking(bookingId, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'customer'
      }).then(function () { return { ok: true }; });
    },
    rescheduleBooking: function (bookingId, email, newDate, newNight) {
      email = (email || '').trim().toLowerCase();
      const b = state.bookings.find(function (x) { return x.id === bookingId; });
      if (!b) return Promise.resolve({ ok: false, error: 'Booking not found' });
      const c = state.customers.find(function (x) { return x.id === b.customerId; });
      if (!c || c.email !== email) return Promise.resolve({ ok: false, error: 'Email does not match this booking' });
      if (b.status !== 'pending' && b.status !== 'confirmed') return Promise.resolve({ ok: false, error: 'Cannot reschedule a ' + b.status + ' booking' });
      if (!newDate) return Promise.resolve({ ok: false, error: 'New date required' });
      const blocked = state.blockedDates.find(function (x) { return x.date === newDate; });
      if (blocked) return Promise.resolve({ ok: false, error: 'New date is blocked' });
      return updateBooking(bookingId, {
        bookingDate: newDate,
        night: newNight || b.night,
        rescheduledAt: new Date().toISOString(),
        rescheduledBy: 'customer',
        rescheduledFrom: b.bookingDate + ' ' + b.night
      }).then(function () { return { ok: true }; });
    },
    cancelPreorder: function (resId, email) {
      email = (email || '').trim().toLowerCase();
      const r = state.preorderReservations.find(function (x) { return x.id === resId; });
      if (!r) return Promise.resolve({ ok: false, error: 'Pre-order not found' });
      const c = state.customers.find(function (x) { return x.id === r.customerId; });
      if (!c || c.email !== email) return Promise.resolve({ ok: false, error: 'Email does not match this reservation' });
      if (r.status !== 'reserved') return Promise.resolve({ ok: false, error: 'Pre-order is ' + r.status });
      return updatePreorderReservation(resId, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'customer'
      }).then(function () { return { ok: true }; });
    },
    downloadBookingIcs: function (bookingId, email) {
      // Build ICS — same as before but using sb data
      email = (email || '').trim().toLowerCase();
      const b = state.bookings.find(function (x) { return x.id === bookingId; });
      if (!b) return;
      const c = state.customers.find(function (x) { return x.id === b.customerId; });
      if (!c || c.email !== email) return;
      const sm = getSiteMeta() || {};
      const dayCfg = state.schedule.find(function (d) { return d.day && d.day.toLowerCase().slice(0, 3) === b.night; });
      const startTime = (dayCfg && dayCfg.start_time) || '19:00';
      const endTime = (dayCfg && dayCfg.end_time) || '22:00';
      const dateStr = b.bookingDate.replace(/-/g, '');
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Salon Poke//Booking//EN',
        'BEGIN:VEVENT',
        'UID:' + b.id + '@salonpoke.co.uk',
        'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
        'DTSTART:' + dateStr + 'T' + startTime.replace(':', '') + '00',
        'DTEND:' + dateStr + 'T' + endTime.replace(':', '') + '00',
        'SUMMARY:Salon Poke — ' + (dayCfg ? dayCfg.theme : b.night),
        'DESCRIPTION:' + (b.plan + ' · party of ' + (b.partySize || 1)).replace(/\n/g, '\\n'),
        'LOCATION:' + (sm.address || '60A Park Row') + ', ' + (sm.city || 'Bristol') + ' ' + (sm.postcode || 'BS1 5LE'),
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'salonpoke-' + b.bookingDate + '.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // ---- Public API ----
  window.salonPokeData2 = {
    loadAllData: loadAllData,
    isLoaded: isLoaded,
    getPassTemplates: getPassTemplates,
    getProducts: getProducts,
    getSchedule: getSchedule,
    getSiteSettings: getSiteSettings,
    getSiteMeta: getSiteMeta,
    getHero: getHero,
    getPricing: getPricing,
    getOpeningHours: getOpeningHours,
    getAdminConfig: getAdminConfig,
    getPassFaq: getPassFaq,
    getPromo: getPromo,
    getPreorderItems: getPreorderItems,
    getCustomers: getCustomers,
    getCustomerPasses: getCustomerPasses,
    getBookings: getBookings,
    getPreorderReservations: getPreorderReservations,
    getBlockedDates: getBlockedDates,
    getNewsletterSubscribers: getNewsletterSubscribers,
    upsertCustomer: upsertCustomer,
    createCustomerPass: createCustomerPass,
    updateCustomerPass: updateCustomerPass,
    deleteCustomerPass: deleteCustomerPass,
    createBooking: createBooking,
    updateBooking: updateBooking,
    markAttended: markAttended,
    refundPassVisit: refundPassVisit,
    expireOldPasses: expireOldPasses,
    trackPageView: trackPageView,
    getPageViews: getPageViews,
    createPreorderReservation: createPreorderReservation,
    updatePreorderReservation: updatePreorderReservation,
    addBlockedDate: addBlockedDate,
    removeBlockedDate: removeBlockedDate,
    setCustomerNote: setCustomerNote,
    setCustomerTags: setCustomerTags,
    gdprDeleteCustomer: gdprDeleteCustomer,
    customerPortal: customerPortal,
    sb: sb,
    // Sync helpers (used by localStorage shim for diff-based writes)
    createFromSync: function (key, item) {
      if (key === 'salonPokeBookings') return createBooking(item);
      if (key === 'salonPokeCustomers') return upsertCustomer(item);
      if (key === 'salonPokeCustomerPasses') return createCustomerPass(item);
      if (key === 'salonPokePreorderReservations') return createPreorderReservation(item);
      if (key === 'salonPokeBlockedDates') return addBlockedDate(item.date, item.reason);
      return Promise.resolve(null);
    },
    updateFromSync: function (key, item) {
      if (key === 'salonPokeBookings') return updateBooking(item.id, item);
      if (key === 'salonPokeCustomerPasses') return updateCustomerPass(item.id, item);
      if (key === 'salonPokeCustomers') {
        return sb.from('customers').update({
          full_name: item.name, phone: item.phone, notes: item.notes, tags: item.tags || []
        }).eq('id', item.id).then(function () { return null; });
      }
      if (key === 'salonPokePreorderReservations') return updatePreorderReservation(item.id, item);
      if (key === 'salonPokeBlockedDates') {
        // blocked dates have no update — remove + add
        return removeBlockedDate(item.date).then(function () { return addBlockedDate(item.date, item.reason); });
      }
      return Promise.resolve(null);
    },
    deleteFromSync: function (key, item) {
      if (key === 'salonPokeBookings') return sb.from('bookings').delete().eq('id', item.id);
      if (key === 'salonPokeCustomerPasses') return sb.from('customer_passes').delete().eq('id', item.id);
      if (key === 'salonPokePreorderReservations') return sb.from('preorder_reservations').delete().eq('id', item.id);
      if (key === 'salonPokeCustomers') return sb.from('customers').delete().eq('id', item.id);
      if (key === 'salonPokeBlockedDates') return removeBlockedDate(item.date);
      return Promise.resolve(null);
    }
  };

  // Backward compat: also expose on window for direct access
  window.salonPokeCustomerPortal = customerPortal;

  // ===================================================================
  // LOCALSTORAGE SHIM — makes existing code work without rewrites
  // Reads return in-memory state as JSON. Writes to salon keys are no-op
  // (state is canonical, real Supabase writes happen via the data2 API).
  // ===================================================================
  var realLocalStorage = window.localStorage;
  var shimData = {
    'salonPokeCustomers': function () { return state.customers; },
    'salonPokeBookings': function () { return state.bookings; },
    'salonPokeCustomerPasses': function () { return state.customerPasses; },
    'salonPokePreorderReservations': function () { return state.preorderReservations; },
    'salonPokeBlockedDates': function () { return state.blockedDates; },
    'salonPokeData': function () { return {}; }
  };

  window.localStorage = {
    getItem: function (key) {
      if (shimData[key]) {
        return JSON.stringify(shimData[key]());
      }
      return realLocalStorage.getItem(key);
    },
    setItem: function (key, value) {
      if (shimData[key] && value) {
        // Diff-based sync: compare new array to state, push changes to Supabase
        syncToSupabase(key, value).catch(function (e) {
          console.error('[Salon Poke] Sync error for ' + key + ':', e);
        });
      } else {
        realLocalStorage.setItem(key, value);
      }
    },
    removeItem: function (key) { realLocalStorage.removeItem(key); },
    clear: function () { realLocalStorage.clear(); },
    key: function (i) { return realLocalStorage.key(i); },
    get length() { return realLocalStorage.length; }
  };

  // Diff sync: compare new array (JSON string) with lastSynced snapshot
  var lastSynced = {};
  function syncToSupabase(key, jsonString) {
    var newArr = [];
    try { newArr = JSON.parse(jsonString) || []; } catch (e) { return Promise.resolve(); }
    var s2 = window.salonPokeData2;
    if (!s2) return Promise.resolve();

    var prev = lastSynced[key] || [];
    var prevIds = {};
    prev.forEach(function (x) { if (x && x.id) prevIds[x.id] = x; });
    var newIds = {};
    newArr.forEach(function (x) { if (x && x.id) newIds[x.id] = x; });

    var ops = [];

    // Find creates (in new but not in prev)
    newArr.forEach(function (item) {
      if (item && item.id && !prevIds[item.id]) {
        ops.push(s2.createFromSync(key, item));
      }
    });
    // Find updates (in both, but different)
    newArr.forEach(function (item) {
      if (item && item.id && prevIds[item.id]) {
        if (JSON.stringify(item) !== JSON.stringify(prevIds[item.id])) {
          ops.push(s2.updateFromSync(key, item));
        }
      }
    });
    // Find deletes (in prev but not in new)
    prev.forEach(function (item) {
      if (item && item.id && !newIds[item.id]) {
        ops.push(s2.deleteFromSync(key, item));
      }
    });

    lastSynced[key] = newArr;
    return Promise.all(ops.map(function (p) { return p.catch(function () {}); }));
  }

  // Initialize lastSynced when data loads
  var _origLoadAll = loadAllData;
  loadAllData = function () {
    return _origLoadAll().then(function () {
      lastSynced['salonPokeBookings'] = JSON.parse(JSON.stringify(state.bookings));
      lastSynced['salonPokeCustomers'] = JSON.parse(JSON.stringify(state.customers));
      lastSynced['salonPokeCustomerPasses'] = JSON.parse(JSON.stringify(state.customerPasses));
      lastSynced['salonPokePreorderReservations'] = JSON.parse(JSON.stringify(state.preorderReservations));
      lastSynced['salonPokeBlockedDates'] = JSON.parse(JSON.stringify(state.blockedDates));
    });
  };

})();
