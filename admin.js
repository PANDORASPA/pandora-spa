/* ============================================
   SALON POKE — Admin Dashboard Logic
   ============================================ */

(function () {
    'use strict';

    const DATA_KEY = 'salonPokeData';
    const AUTH_KEY = 'salonPokeAuth';
    const PASSWORD_KEY = 'salonPokePassword';

    let siteData = null;
    let dirty = false;

    // ----- Default password = salonpoke2026 (overridable via localStorage) -----
    function getPassword() {
        return localStorage.getItem(PASSWORD_KEY) || 'salonpoke2026';
    }
    function setPassword(p) {
        localStorage.setItem(PASSWORD_KEY, p);
    }

    // ----- Session token -----
    function setAuth(token) {
        sessionStorage.setItem(AUTH_KEY, JSON.stringify({ token: token, ts: Date.now() }));
    }
    function getAuth() {
        try {
            var a = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
            if (!a) return null;
            // Expire after 12 hours
            if (Date.now() - a.ts > 12 * 3600 * 1000) {
                sessionStorage.removeItem(AUTH_KEY);
                return null;
            }
            return a;
        } catch (e) { return null; }
    }
    function clearAuth() {
        sessionStorage.removeItem(AUTH_KEY);
    }

    // ----- Toast -----
    function toast(msg, isError) {
        var t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.toggle('error', !!isError);
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(function () { t.classList.remove('show'); }, 2400);
    }

    // ----- Login -----
    var loginForm = document.getElementById('loginForm');
    // Show warning if using default password
    (function checkDefaultPwd() {
        var stored = localStorage.getItem(PASSWORD_KEY);
        var cfg = window.salonPokeData2 && window.salonPokeData2.getAdminConfig && window.salonPokeData2.getAdminConfig();
        var isDefault = !stored && (!cfg || (cfg.password || 'salonpoke2026') === 'salonpoke2026');
        if (isDefault) {
            var hint = document.getElementById('loginHint');
            if (hint) {
                hint.innerHTML = '<b style="color:#ff5a5a;">⚠ Default password — change in Settings after login.</b>';
            }
        }
    })();
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var pw = document.getElementById('loginPassword').value;
        if (pw === getPassword()) {
            setAuth('ok');
            showApp();
            document.getElementById('loginError').textContent = '';
            document.getElementById('loginPassword').value = '';
        } else {
            document.getElementById('loginError').textContent = '✕ Wrong password';
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', function () {
        clearAuth();
        document.getElementById('adminApp').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        toast('Logged out');
    });

    // ----- Show app if already logged in -----
    function showApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminApp').style.display = 'grid';
        loadDataAndRender();
    }

    if (getAuth()) showApp();

    // ----- Load data -----
    function loadDataAndRender() {
        document.getElementById('statusText').textContent = 'Loading…';
        fetch('data.json?_=' + Date.now())
            .then(function (r) { return r.json(); })
            .then(function (defaultData) {
                var overrides = {};
                try { overrides = JSON.parse(localStorage.getItem(DATA_KEY) || '{}'); } catch (e) {}
                siteData = mergeDeep(defaultData, overrides);
                document.getElementById('statusText').textContent = 'Loaded · saved';
                renderAll();
            })
            .catch(function () {
                siteData = JSON.parse(localStorage.getItem(DATA_KEY) || 'null');
                if (!siteData) {
                    toast('Failed to load data.json', true);
                    return;
                }
                document.getElementById('statusText').textContent = 'Loaded from cache';
                renderAll();
            });
    }

    function mergeDeep(target, source) {
        if (!source || typeof source !== 'object') return target;
        for (var k in source) {
            if (source.hasOwnProperty(k)) {
                if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
                    target[k] = mergeDeep(target[k] || {}, source[k]);
                } else {
                    target[k] = source[k];
                }
            }
        }
        return target;
    }

    // ----- Render all editors -----
    function renderAll() {
        bindSectionNav();
        renderFormInputs();
        renderHeroStats();
        renderProducts();
        renderSchedule();
        renderPreorder();
        renderPromoBanner();
        renderSettings();
        wireTopbar();
    }

    function bindSectionNav() {
        var links = document.querySelectorAll('.sidebar-link');
        links.forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                links.forEach(function (l) { l.classList.remove('active'); });
                a.classList.add('active');
                var sec = a.dataset.section;
                document.querySelectorAll('.admin-section').forEach(function (s) {
                    s.style.display = s.dataset.section === sec ? 'block' : 'none';
                });
                document.getElementById('sectionTitle').textContent = a.textContent.trim();
            });
        });
    }

    // ----- Generic data-cfg input bind -----
    function getDeep(obj, path) {
        return path.split('.').reduce(function (o, k) { return o && o[k]; }, obj);
    }
    function setDeep(obj, path, value) {
        var parts = path.split('.');
        var cur = obj;
        for (var i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]]) cur[parts[i]] = {};
            cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = value;
    }

    function renderFormInputs() {
        var inputs = document.querySelectorAll('input[data-cfg], textarea[data-cfg], select[data-cfg]');
        inputs.forEach(function (el) {
            var path = el.getAttribute('data-cfg');
            var val = getDeep(siteData, path);
            if (val !== undefined && val !== null) el.value = val;
            el.addEventListener('input', function () {
                var v = el.type === 'number' ? parseFloat(el.value) : el.value;
                setDeep(siteData, path, v);
                markDirty();
            });
        });
    }

    function markDirty() {
        dirty = true;
        var el = document.getElementById('saveStatus');
        el.textContent = '● Unsaved changes';
        el.classList.add('unsaved');
    }

    function markClean() {
        dirty = false;
        var el = document.getElementById('saveStatus');
        el.textContent = '✓ All changes saved';
        el.classList.remove('unsaved');
    }

    // ----- Hero stats editor -----
    function renderHeroStats() {
        var container = document.getElementById('heroStatsEditor');
        container.innerHTML = '';
        if (!siteData.hero || !siteData.hero.stats) return;
        siteData.hero.stats.forEach(function (s, idx) {
            var row = document.createElement('div');
            row.className = 'stat-row';
            row.innerHTML =
                '<div class="form-group"><label>Value</label><input type="text" data-stat-idx="' + idx + '" data-stat-field="value"></div>' +
                '<div class="form-group"><label>Label</label><input type="text" data-stat-idx="' + idx + '" data-stat-field="label"></div>';
            container.appendChild(row);
            row.querySelector('[data-stat-field="value"]').value = s.value;
            row.querySelector('[data-stat-field="label"]').value = s.label;
        });
        container.querySelectorAll('input').forEach(function (inp) {
            inp.addEventListener('input', function () {
                var idx = parseInt(inp.dataset.statIdx, 10);
                var field = inp.dataset.statField;
                siteData.hero.stats[idx][field] = inp.value;
                markDirty();
            });
        });
    }

    // ----- Products editor -----
    function renderProducts() {
        var container = document.getElementById('productsEditor');
        container.innerHTML = '';
        if (!siteData.products) return;
        siteData.products.forEach(function (p, idx) {
            var row = document.createElement('div');
            row.className = 'product-row';
            row.innerHTML =
                '<div class="form-group"><label>Name</label><input type="text" data-p-idx="' + idx + '" data-p-field="name"></div>' +
                '<div class="form-group"><label>JP Name</label><input type="text" data-p-idx="' + idx + '" data-p-field="jpName"></div>' +
                '<div class="form-group"><label>Code</label><input type="text" data-p-idx="' + idx + '" data-p-field="code"></div>' +
                '<div class="form-group"><label>Tier</label><select data-p-idx="' + idx + '" data-p-field="tier"><option value="TOP">TOP</option><option value="CLASSIC">CLASSIC</option><option value="ENTRY">ENTRY</option></select></div>' +
                '<div class="form-group"><label>Price (£)</label><input type="number" min="0" step="1" data-p-idx="' + idx + '" data-p-field="price"></div>' +
                '<div class="form-group"><label>Stock</label><input type="number" min="0" step="1" data-p-idx="' + idx + '" data-p-field="stock"></div>' +
                '<div class="form-group"><label>Status</label><select data-p-idx="' + idx + '" data-p-field="stockStatus"><option value="in">In Stock</option><option value="low">Low</option><option value="out">Sold Out</option></select></div>' +
                '<div class="form-group" style="grid-column:1/-1;"><label>Description</label><input type="text" data-p-idx="' + idx + '" data-p-field="desc"></div>' +
                '<div class="form-group" style="grid-column:1/-1;"><label>Badge Text</label><input type="text" data-p-idx="' + idx + '" data-p-field="badgeText"></div>' +
                '<div class="form-group"><label>Featured?</label><select data-p-idx="' + idx + '" data-p-field="featured"><option value="true">Yes</option><option value="false">No</option></select></div>' +
                '<div class="form-group"><label>Image filename</label><input type="text" data-p-idx="' + idx + '" data-p-field="img"></div>';
            container.appendChild(row);
            ['name','jpName','code','tier','price','stock','stockStatus','desc','badgeText','featured','img'].forEach(function (f) {
                var el = row.querySelector('[data-p-field="' + f + '"]');
                if (!el) return;
                var v = p[f];
                if (f === 'featured') v = v ? 'true' : 'false';
                el.value = v !== undefined && v !== null ? v : '';
                el.addEventListener('input', function () {
                    var val = el.value;
                    if (f === 'price' || f === 'stock') val = parseFloat(val) || 0;
                    if (f === 'featured') val = val === 'true';
                    siteData.products[idx][f] = val;
                    markDirty();
                });
                el.addEventListener('change', function () {
                    el.dispatchEvent(new Event('input'));
                });
            });
        });
    }

    // ----- Schedule editor -----
    function renderSchedule() {
        var container = document.getElementById('scheduleEditor');
        container.innerHTML = '';
        if (!siteData.schedule) return;
        siteData.schedule.forEach(function (d, idx) {
            var row = document.createElement('div');
            row.className = 'day-row';
            row.innerHTML =
                '<div class="form-group"><label>Day</label><input type="text" data-d-idx="' + idx + '" data-d-field="day"></div>' +
                '<div class="form-group"><label>Kicker</label><input type="text" data-d-idx="' + idx + '" data-d-field="kicker"></div>' +
                '<div class="form-group"><label>Theme</label><input type="text" data-d-idx="' + idx + '" data-d-field="theme"></div>' +
                '<div class="form-group"><label>Start (HH:MM)</label><input type="time" data-d-idx="' + idx + '" data-d-field="startTime"></div>' +
                '<div class="form-group"><label>End (HH:MM)</label><input type="time" data-d-idx="' + idx + '" data-d-field="endTime"></div>' +
                '<div class="form-group"><label>Seats</label><input type="number" min="0" data-d-idx="' + idx + '" data-d-field="seats"></div>' +
                '<div class="form-group"><label>Single (£)</label><input type="number" min="0" data-d-idx="' + idx + '" data-d-field="singlePrice"></div>' +
                '<div class="form-group"><label>Bundle (£)</label><input type="number" min="0" data-d-idx="' + idx + '" data-d-field="bundlePrice"></div>' +
                '<div class="form-group"><label>Box (£)</label><input type="number" min="0" data-d-idx="' + idx + '" data-d-field="boxPrice"></div>' +
                '<div class="form-group"><label>Entry (£)</label><input type="number" min="0" data-d-idx="' + idx + '" data-d-field="entryPrice"></div>' +
                '<div class="form-group"><label>Featured?</label><select data-d-idx="' + idx + '" data-d-field="isFeatured"><option value="true">★</option><option value="false">—</option></select></div>' +
                '<div class="form-group"><label>Closed?</label><select data-d-idx="' + idx + '" data-d-field="isClosed"><option value="true">Yes</option><option value="false">No</option></select></div>';
            container.appendChild(row);
            ['day','kicker','theme','startTime','endTime','seats','singlePrice','bundlePrice','boxPrice','entryPrice','isFeatured','isClosed'].forEach(function (f) {
                var el = row.querySelector('[data-d-field="' + f + '"]');
                if (!el) return;
                var v = d[f];
                if (f === 'isFeatured' || f === 'isClosed') v = v ? 'true' : 'false';
                if (f === 'seats' || f === 'singlePrice' || f === 'bundlePrice' || f === 'boxPrice' || f === 'entryPrice') v = (v === null || v === undefined) ? '' : v;
                el.value = v !== undefined && v !== null ? v : '';
                el.addEventListener('input', function () {
                    var val = el.value;
                    if (['seats','singlePrice','bundlePrice','boxPrice','entryPrice'].indexOf(f) > -1) {
                        val = val === '' ? null : (parseFloat(val) || 0);
                    }
                    if (f === 'isFeatured' || f === 'isClosed') val = val === 'true';
                    siteData.schedule[idx][f] = val;
                    markDirty();
                });
                el.addEventListener('change', function () {
                    el.dispatchEvent(new Event('input'));
                });
            });
        });
    }

    // ----- Pre-order editor -----
    function renderPreorder() {
        var container = document.getElementById('preorderEditor');
        container.innerHTML = '';
        if (!siteData.preorder) return;
        siteData.preorder.forEach(function (p, idx) {
            var row = document.createElement('div');
            row.className = 'preorder-row';
            row.innerHTML =
                '<div class="form-group"><label>Name</label><input type="text" data-po-idx="' + idx + '" data-po-field="name"></div>' +
                '<div class="form-group"><label>Code</label><input type="text" data-po-idx="' + idx + '" data-po-field="code"></div>' +
                '<div class="form-group"><label>Release Date Text</label><input type="text" data-po-idx="' + idx + '" data-po-field="badge"></div>' +
                '<div class="form-group"><label>Reserved %</label><input type="number" min="0" max="100" data-po-idx="' + idx + '" data-po-field="reservedPct"></div>' +
                '<div class="form-group"><label>Description</label><input type="text" data-po-idx="' + idx + '" data-po-field="desc"></div>' +
                '<div class="form-group"><label>Upcoming?</label><select data-po-idx="' + idx + '" data-po-field="isUpcoming"><option value="true">★ Highlighted</option><option value="false">—</option></select></div>' +
                '<div class="form-group"><label>Image filename</label><input type="text" data-po-idx="' + idx + '" data-po-field="img"></div>';
            container.appendChild(row);
            ['name','code','badge','reservedPct','desc','isUpcoming','img'].forEach(function (f) {
                var el = row.querySelector('[data-po-field="' + f + '"]');
                if (!el) return;
                var v = p[f];
                if (f === 'isUpcoming') v = v ? 'true' : 'false';
                el.value = v !== undefined && v !== null ? v : '';
                el.addEventListener('input', function () {
                    var val = el.value;
                    if (f === 'reservedPct') val = parseFloat(val) || 0;
                    if (f === 'isUpcoming') val = val === 'true';
                    siteData.preorder[idx][f] = val;
                    markDirty();
                });
                el.addEventListener('change', function () {
                    el.dispatchEvent(new Event('input'));
                });
            });
        });
    }

    // ----- Promo banner -----
    function renderPromoBanner() {
        if (!siteData.promo) siteData.promo = { enabled: false, text: '', cta: '', link: '' };
        var cb = document.getElementById('promoEnabled');
        var txt = document.getElementById('promoText');
        var cta = document.getElementById('promoCta');
        var lnk = document.getElementById('promoLink');
        cb.checked = !!siteData.promo.enabled;
        txt.value = siteData.promo.text || '';
        cta.value = siteData.promo.cta || '';
        lnk.value = siteData.promo.link || '';
        [cb, txt, cta, lnk].forEach(function (el) {
            el.addEventListener('input', function () {
                siteData.promo.enabled = cb.checked;
                siteData.promo.text = txt.value;
                siteData.promo.cta = cta.value;
                siteData.promo.link = lnk.value;
                markDirty();
            });
        });
    }

    // ----- Settings (password change) -----
    function renderSettings() {
        var btn = document.getElementById('changePasswordBtn');
        btn.addEventListener('click', function () {
            var cur = document.getElementById('currentPassword').value;
            var nw = document.getElementById('newPassword').value;
            var msg = document.getElementById('passwordMsg');
            if (cur !== getPassword()) {
                msg.textContent = '✕ Current password is wrong';
                msg.className = 'form-note error';
                return;
            }
            if (nw.length < 6) {
                msg.textContent = '✕ New password must be at least 6 characters';
                msg.className = 'form-note error';
                return;
            }
            setPassword(nw);
            msg.textContent = '✓ Password updated. Remember it!';
            msg.className = 'form-note success';
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
        });

        document.getElementById('exportBtn2').addEventListener('click', exportJson);
        document.getElementById('importInput2').addEventListener('change', importJson);
        document.getElementById('resetBtn2').addEventListener('click', resetAll);
        // Bulk operations
        var expCsv = document.getElementById('exportCustomersCsv');
        if (expCsv) expCsv.addEventListener('click', exportCustomersCsv);
        var expAll = document.getElementById('exportAllData');
        if (expAll) expAll.addEventListener('click', exportAllData);
        var impCsv = document.getElementById('importCustomersCsv');
        if (impCsv) impCsv.addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) { importCustomersCsv(ev.target.result); };
            reader.readAsText(file);
            e.target.value = '';
        });
    }

    // ----- Topbar buttons -----
    function wireTopbar() {
        document.getElementById('saveBtn').addEventListener('click', saveAll);
        document.getElementById('exportBtn').addEventListener('click', exportJson);
        document.getElementById('importInput').addEventListener('change', importJson);
        document.getElementById('resetBtn').addEventListener('click', resetAll);
    }

    function saveAll() {
        try {
            localStorage.setItem(DATA_KEY, JSON.stringify(siteData));
            markClean();
            toast('✓ Saved — refresh public site to see changes');
        } catch (e) {
            toast('Save failed: ' + e.message, true);
        }
    }

    function exportJson() {
        var blob = new Blob([JSON.stringify(siteData, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'salon-poke-data-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('✓ Exported data.json');
    }

    function importJson(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var data = JSON.parse(ev.target.result);
                siteData = data;
                localStorage.setItem(DATA_KEY, JSON.stringify(siteData));
                renderAll();
                markClean();
                toast('✓ Imported — all sections updated');
            } catch (err) {
                toast('Import failed: invalid JSON', true);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    function resetAll() {
        if (!confirm('Reset ALL changes back to defaults? This cannot be undone.')) return;
        localStorage.removeItem(DATA_KEY);
        location.reload();
    }

    // ----- Auto-save on Ctrl+S -----
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveAll();
        }
    });

    // Warn if leaving with unsaved changes
    window.addEventListener('beforeunload', function (e) {
        if (dirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // ============================================
    // RUNTIME DATA STORE (localStorage)
    // TODO: Replace with Supabase once project is ready
    // ============================================
    var KEY_BOOKINGS = 'salonPokeBookings';
    var KEY_CUSTOMERS = 'salonPokeCustomers';
    var KEY_CUSTOMER_PASSES = 'salonPokeCustomerPasses';
    var KEY_PREORDER_RES = 'salonPokePreorderReservations';

    var currentPreorderFilter = 'all';

    function lsGet(key, fallback) {
        try {
            var v = JSON.parse(localStorage.getItem(key) || 'null');
            return v === null ? fallback : v;
        } catch (e) { return fallback; }
    }
    function lsSet(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
    function getBookings() { return window.salonPokeData2 ? window.salonPokeData2.getBookings() : lsGet(KEY_BOOKINGS, []); }
    function saveBookings(arr) {
        // State is updated via reference. Trigger a full re-sync (lightweight).
        if (window.salonPokeData2) window.salonPokeData2.loadAllData();
        else lsSet(KEY_BOOKINGS, arr);
    }
    function getCustomers() { return window.salonPokeData2 ? window.salonPokeData2.getCustomers() : lsGet(KEY_CUSTOMERS, []); }
    function saveCustomers(arr) {
        if (window.salonPokeData2) window.salonPokeData2.loadAllData();
        else lsSet(KEY_CUSTOMERS, arr);
    }
    function getCustomerPasses() { return window.salonPokeData2 ? window.salonPokeData2.getCustomerPasses() : lsGet(KEY_CUSTOMER_PASSES, []); }
    function saveCustomerPasses(arr) {
        if (window.salonPokeData2) window.salonPokeData2.loadAllData();
        else lsSet(KEY_CUSTOMER_PASSES, arr);
    }
    function getPreorderReservations() { return window.salonPokeData2 ? window.salonPokeData2.getPreorderReservations() : lsGet(KEY_PREORDER_RES, []); }
    function savePreorderReservations(arr) { lsSet(KEY_PREORDER_RES, arr); }

    // Auto-expire passes whose expires_at is in the past
    function checkAndExpirePasses() {
        var passes = getCustomerPasses();
        var now = Date.now();
        var changed = false;
        passes.forEach(function (p) {
            if (p.status === 'active' && p.expiresAt && new Date(p.expiresAt).getTime() < now) {
                p.status = 'expired';
                changed = true;
            }
        });
        if (changed) saveCustomerPasses(passes);
    }

    function findOrCreateCustomer(email, name, phone) {
        email = (email || '').trim().toLowerCase();
        name = (name || '').trim();
        phone = (phone || '').trim();
        if (!email) return null;
        var customers = getCustomers();
        var existing = customers.find(function (c) { return c.email === email; });
        if (existing) {
            if (name && existing.name !== name) existing.name = name;
            if (phone && !existing.phone) existing.phone = phone;
            existing.updatedAt = new Date().toISOString();
            saveCustomers(customers);
            return existing;
        }
        var c = {
            id: 'cust_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            email: email,
            name: name || email.split('@')[0],
            phone: phone || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        customers.push(c);
        saveCustomers(customers);
        return c;
    }

    // ============================================
    // PASS TEMPLATES
    // ============================================
    function renderPasses() {
        // templates
        var container = document.getElementById('passTemplatesEditor');
        var templates = (siteData && siteData.passTemplates) || [];
        var countEl = document.getElementById('passTemplateCount');
        if (countEl) countEl.textContent = templates.length;
        container.innerHTML = '';
        if (templates.length === 0) {
            container.innerHTML = '<p class="empty-hint">No pass templates yet. Click <b>+ Add Template</b> to create one.</p>';
        } else {
            templates.sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
            templates.forEach(function (t) {
                var row = document.createElement('div');
                row.className = 'pass-template-row';
                row.innerHTML =
                    '<div class="ptr-badge" style="background:' + (t.accent || '#ffd700') + '22; color:' + (t.accent || '#ffd700') + ';">' + escapeHtml(t.badge || 'PASS') + '</div>' +
                    '<div class="ptr-main">' +
                        '<div class="ptr-name">' + escapeHtml(t.name) + (t.jpName ? ' <span class="ptr-jp">' + escapeHtml(t.jpName) + '</span>' : '') + '</div>' +
                        '<div class="ptr-meta">' + t.visitsTotal + ' visits · £' + t.priceGbp + ' · ' + (t.validityDays || '∞') + ' days' + (t.isActive ? '' : ' · <span class="inactive">DRAFT</span>') + '</div>' +
                    '</div>' +
                    '<div class="ptr-actions">' +
                        '<button class="btn btn-ghost btn-sm" data-pt-edit="' + t.id + '">Edit</button>' +
                    '</div>';
                container.appendChild(row);
            });
            container.querySelectorAll('[data-pt-edit]').forEach(function (b) {
                b.addEventListener('click', function () { openPassTemplateModal(b.getAttribute('data-pt-edit')); });
            });
        }

        // issued passes
        renderIssuedPasses();

        // add button
        var addBtn = document.getElementById('addPassTemplateBtn');
        if (addBtn) addBtn.onclick = function () { openPassTemplateModal(null); };
        var issueBtn = document.getElementById('issuePassBtn');
        if (issueBtn) issueBtn.onclick = function () { openIssuePassModal(); };
        var ipSave = document.getElementById('ip_saveBtn');
        if (ipSave) ipSave.onclick = handleIssuePassSave;
    }

    function renderIssuedPasses() {
        var list = document.getElementById('issuedPassesList');
        if (!list) return;
        var filterEl = document.getElementById('issuedPassFilter');
        var filter = filterEl ? filterEl.value : 'all';
        var passes = getCustomerPasses();
        var customers = getCustomers();
        var cMap = {};
        customers.forEach(function (c) { cMap[c.id] = c; });
        var templates = (siteData && siteData.passTemplates) || [];
        var tMap = {};
        templates.forEach(function (t) { tMap[t.id] = t; });

        if (filter !== 'all') passes = passes.filter(function (p) { return p.status === filter; });

        if (passes.length === 0) {
            list.innerHTML = '<p class="empty-hint">No customer passes yet. When a customer buys a pass on the public site, it shows up here.</p>';
            return;
        }
        passes.sort(function (a, b) { return (b.purchasedAt || '').localeCompare(a.purchasedAt || ''); });
        list.innerHTML = passes.map(function (p) {
            var c = cMap[p.customerId] || { name: '(unknown)', email: '' };
            var t = tMap[p.passTemplateId] || { name: '(deleted template)' };
            var payStatus = p.paymentStatus || 'paid';
            var exp = p.expiresAt ? ' · exp ' + p.expiresAt.slice(0, 10) : '';
            return '<div class="ip-row">' +
                '<div class="ip-customer"><b>' + escapeHtml(c.name) + '</b><span>' + escapeHtml(c.email) + '</span></div>' +
                '<div class="ip-template">' + escapeHtml(t.name) + '<span class="ip-pay ip-pay-' + payStatus + '">' + payStatus + '</span></div>' +
                '<div class="ip-progress"><b>' + p.visitsRemaining + '</b>/' + p.visitsTotal + ' left</div>' +
                '<div class="ip-status ip-status-' + p.status + '">' + p.status + exp + '</div>' +
                '<div class="ip-date">' + formatDate(p.purchasedAt) + '</div>' +
                '<div class="ip-actions">' +
                    (payStatus !== 'paid' ? '<button class="btn btn-primary btn-sm" data-ip-paid="' + p.id + '">Mark Paid</button>' : '') +
                    (p.visitsRemaining > 0 ? '<button class="btn btn-ghost btn-sm" data-ip-adj="' + p.id + '">Adjust</button>' : '') +
                '</div>' +
            '</div>';
        }).join('');
        list.querySelectorAll('[data-ip-adj]').forEach(function (b) {
            b.addEventListener('click', function () { adjustIssuedPass(b.getAttribute('data-ip-adj')); });
        });
        list.querySelectorAll('[data-ip-paid]').forEach(function (b) {
            b.addEventListener('click', function () { markPassPaid(b.getAttribute('data-ip-paid')); });
        });
    }

    function markPassPaid(passId) {
        var passes = getCustomerPasses();
        var p = passes.find(function (x) { return x.id === passId; });
        if (!p) return;
        p.paymentStatus = 'paid';
        p.paidAt = new Date().toISOString();
        saveCustomerPasses(passes);
        renderIssuedPasses();
        toast('✓ Marked as paid');
    }

    // ============================================
    // ISSUE PASS (admin manually issues to a customer)
    // ============================================
    function openIssuePassModal() {
        var modal = document.getElementById('issuePassModal');
        if (!modal) return;
        var select = document.getElementById('ip_templateId');
        if (select) {
            var templates = (siteData && siteData.passTemplates) || [];
            var active = templates.filter(function (t) { return t.isActive !== false; });
            select.innerHTML = active.length === 0
                ? '<option value="">(no active templates — create one first)</option>'
                : active.map(function (t) { return '<option value="' + t.id + '">' + escapeHtml(t.name) + ' (£' + t.priceGbp + ')</option>'; }).join('');
        }
        document.getElementById('ip_name').value = '';
        document.getElementById('ip_email').value = '';
        document.getElementById('ip_phone').value = '';
        document.getElementById('ip_paymentStatus').value = 'paid';
        var today = new Date().toISOString().slice(0, 10);
        document.getElementById('ip_startDate').value = today;
        modal.style.display = 'flex';
    }

    function handleIssuePassSave() {
        var templateId = document.getElementById('ip_templateId').value;
        var name = document.getElementById('ip_name').value.trim();
        var email = document.getElementById('ip_email').value.trim();
        var phone = document.getElementById('ip_phone').value.trim();
        var paymentStatus = document.getElementById('ip_paymentStatus').value;
        var startDateStr = document.getElementById('ip_startDate').value;
        if (!templateId) { toast('No template selected', true); return; }
        if (!email) { toast('Email is required', true); return; }

        var templates = (siteData && siteData.passTemplates) || [];
        var t = templates.find(function (x) { return x.id === templateId; });
        if (!t) { toast('Template not found', true); return; }

        var customer = findOrCreateCustomer(email, name, phone);

        var startDate = startDateStr ? new Date(startDateStr) : new Date();
        var expires = null;
        if (t.validityDays && t.validityDays > 0) {
            expires = new Date(startDate.getTime() + t.validityDays * 86400000).toISOString();
        }
        var pass = {
            id: 'cp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            customerId: customer.id,
            passTemplateId: t.id,
            visitsTotal: t.visitsTotal,
            visitsRemaining: t.visitsTotal,
            visitsUsed: 0,
            purchasedAt: startDate.toISOString(),
            expiresAt: expires,
            status: 'active',
            paymentStatus: paymentStatus,
            priceGbp: t.priceGbp,
            source: 'admin-issued'
        };
        var passes = getCustomerPasses();
        passes.push(pass);
        saveCustomerPasses(passes);
        renderIssuedPasses();
        renderCustomers();
        document.getElementById('issuePassModal').style.display = 'none';
        toast('✓ Pass issued to ' + customer.name);
    }

    function adjustIssuedPass(passId) {
        var passes = getCustomerPasses();
        var p = passes.find(function (x) { return x.id === passId; });
        if (!p) return;
        var v = prompt('Adjust visits_remaining for this pass. Current: ' + p.visitsRemaining + '. Enter new value (integer):', p.visitsRemaining);
        if (v === null) return;
        var n = parseInt(v, 10);
        if (isNaN(n) || n < 0) { toast('Invalid number', true); return; }
        p.visitsRemaining = n;
        if (n === 0) p.status = 'exhausted';
        else if (p.status === 'exhausted') p.status = 'active';
        p.visitsUsed = Math.max(0, (p.visitsTotal || 0) - n);
        saveCustomerPasses(passes);
        renderIssuedPasses();
        toast('Pass adjusted');
    }

    function openPassTemplateModal(id) {
        var modal = document.getElementById('passTemplateModal');
        var templates = (siteData && siteData.passTemplates) || [];
        var t = id ? templates.find(function (x) { return x.id === id; }) : null;
        document.getElementById('passTemplateModalTitle').textContent = t ? 'Edit Pass Template' : 'New Pass Template';
        document.getElementById('pt_name').value = t ? t.name : '';
        document.getElementById('pt_jpName').value = t ? (t.jpName || '') : '';
        document.getElementById('pt_visitsTotal').value = t ? t.visitsTotal : 5;
        document.getElementById('pt_priceGbp').value = t ? t.priceGbp : 95;
        document.getElementById('pt_validityDays').value = t ? (t.validityDays || 0) : 90;
        document.getElementById('pt_badge').value = t ? (t.badge || '') : '';
        document.getElementById('pt_description').value = t ? (t.description || '') : '';
        document.getElementById('pt_sortOrder').value = t ? (t.sortOrder || 0) : (templates.length + 1);
        document.getElementById('pt_accent').value = t ? (t.accent || '#ffd700') : '#ffd700';
        document.getElementById('pt_isActive').checked = t ? !!t.isActive : true;
        var delBtn = document.getElementById('pt_deleteBtn');
        delBtn.style.display = t ? 'inline-flex' : 'none';
        delBtn.onclick = function () {
            if (!confirm('Delete this pass template? Customer passes already issued will keep working but lose their template name.')) return;
            siteData.passTemplates = templates.filter(function (x) { return x.id !== id; });
            markDirty();
            saveAll();
            renderPasses();
            modal.style.display = 'none';
        };
        document.getElementById('pt_saveBtn').onclick = function () {
            var name = document.getElementById('pt_name').value.trim();
            if (!name) { toast('Name is required', true); return; }
            var payload = {
                id: t ? t.id : 'pass_' + Date.now(),
                name: name,
                jpName: document.getElementById('pt_jpName').value.trim(),
                visitsTotal: parseInt(document.getElementById('pt_visitsTotal').value, 10) || 1,
                priceGbp: parseFloat(document.getElementById('pt_priceGbp').value) || 0,
                validityDays: parseInt(document.getElementById('pt_validityDays').value, 10) || 0,
                description: document.getElementById('pt_description').value.trim(),
                badge: document.getElementById('pt_badge').value.trim(),
                sortOrder: parseInt(document.getElementById('pt_sortOrder').value, 10) || 0,
                accent: document.getElementById('pt_accent').value,
                isActive: document.getElementById('pt_isActive').checked
            };
            if (!siteData.passTemplates) siteData.passTemplates = [];
            if (t) {
                var idx = siteData.passTemplates.findIndex(function (x) { return x.id === t.id; });
                siteData.passTemplates[idx] = payload;
            } else {
                siteData.passTemplates.push(payload);
            }
            markDirty();
            saveAll();
            renderPasses();
            modal.style.display = 'none';
            toast('✓ Pass template saved');
        };
        modal.style.display = 'flex';
    }

    // ============================================
    // BOOKINGS
    // ============================================
    var currentBookingFilter = 'all';

    function renderBookings() {
        var list = document.getElementById('bookingsList');
        if (!list) return;
        var bookings = getBookings();
        var customers = getCustomers();
        var cMap = {};
        customers.forEach(function (c) { cMap[c.id] = c; });
        var passes = getCustomerPasses();
        var pMap = {};
        passes.forEach(function (p) { pMap[p.id] = p; });
        var templates = (siteData && siteData.passTemplates) || [];
        var tMap = {};
        templates.forEach(function (t) { tMap[t.id] = t; });
        var dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
        var planNames = { single: 'Single £8', bundle: 'Bundle £24', box: 'Full Box', byo: 'BYO' };

        var today = new Date().toISOString().slice(0, 10);
        // Week range: today through +6 days
        var weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        var filtered = bookings.slice();
        if (currentBookingFilter === 'today') {
            filtered = filtered.filter(function (b) { return b.bookingDate === today; });
        } else if (currentBookingFilter === 'week') {
            filtered = filtered.filter(function (b) { return b.bookingDate >= today && b.bookingDate <= weekEnd && b.status !== 'cancelled'; });
        } else if (currentBookingFilter === 'upcoming') {
            filtered = filtered.filter(function (b) { return b.bookingDate >= today && b.status !== 'cancelled' && b.status !== 'attended'; });
        } else if (currentBookingFilter === 'past') {
            filtered = filtered.filter(function (b) { return b.bookingDate < today; });
        } else if (currentBookingFilter === 'pending') {
            filtered = filtered.filter(function (b) { return b.status === 'pending'; });
        } else if (currentBookingFilter === 'attended') {
            filtered = filtered.filter(function (b) { return b.status === 'attended'; });
        }
        // Sort by bookingDate ascending (next upcoming first), then createdAt desc
        filtered.sort(function (a, b) {
            var ad = a.bookingDate || '9999';
            var bd = b.bookingDate || '9999';
            if (ad !== bd) return ad.localeCompare(bd);
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        document.getElementById('bookingsCount').textContent = filtered.length + ' booking' + (filtered.length === 1 ? '' : 's');

        if (filtered.length === 0) {
            list.innerHTML = '<p class="empty-hint">No bookings match this filter. ' + (bookings.length === 0 ? 'When customers book through the public site, they appear here.' : 'Try a different filter.') + '</p>';
            return;
        }
        list.innerHTML = filtered.map(function (b) {
            var c = cMap[b.customerId] || { name: '(unknown)', email: '' };
            var cp = b.customerPassId ? pMap[b.customerPassId] : null;
            var pt = cp ? tMap[cp.passTemplateId] : null;
            var passLabel = cp && pt ? '<span class="bk-pass">🎟️ ' + escapeHtml(pt.name) + ' (' + cp.visitsRemaining + ' left)</span>' : '';
            var notesHtml = b.notes ? '<div class="bk-notes">"' + escapeHtml(b.notes) + '"</div>' : '';
            return '<div class="bk-row bk-status-' + b.status + '">' +
                '<div class="bk-date">' +
                    '<div class="bk-day">' + (dayNames[b.night] || b.night) + '</div>' +
                    '<div class="bk-when">' + formatDate(b.bookingDate) + '</div>' +
                '</div>' +
                '<div class="bk-customer">' +
                    '<div class="bk-name"><b>' + escapeHtml(c.name) + '</b></div>' +
                    '<div class="bk-contact">' + escapeHtml(c.email) + (c.phone ? ' · ' + escapeHtml(c.phone) : '') + '</div>' +
                    '<div class="bk-meta">' + (planNames[b.plan] || b.plan) + ' · party of ' + (b.partySize || 1) + passLabel + '</div>' +
                    notesHtml +
                '</div>' +
                '<div class="bk-status bk-status-pill-' + b.status + '">' + b.status + '</div>' +
                '<div class="bk-actions">' +
                    actionButtons(b) +
                '</div>' +
            '</div>';
        }).join('');

        // wire actions
        list.querySelectorAll('[data-bk-action]').forEach(function (b) {
            b.addEventListener('click', function () {
                handleBookingAction(b.getAttribute('data-bk-action'), b.getAttribute('data-bk-id'));
            });
        });

        // wire filter
        document.querySelectorAll('.bookings-filter .filter-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === currentBookingFilter);
            btn.onclick = function () {
                currentBookingFilter = btn.getAttribute('data-filter');
                renderBookings();
            };
        });
    }

    function actionButtons(b) {
        var s = b.status;
        var out = '';
        if (s === 'pending') {
            out += '<button class="btn btn-primary btn-sm" data-bk-action="confirm" data-bk-id="' + b.id + '">Confirm</button>';
            out += '<button class="btn btn-ghost btn-sm" data-bk-action="email" data-bk-id="' + b.id + '" title="Email customer">✉</button>';
            out += '<button class="btn btn-ghost btn-sm" data-bk-action="cancel" data-bk-id="' + b.id + '">Cancel</button>';
        } else if (s === 'confirmed') {
            out += '<button class="btn btn-primary btn-sm" data-bk-action="attended" data-bk-id="' + b.id + '">✓ Mark Attended</button>';
            out += '<button class="btn btn-ghost btn-sm" data-bk-action="remind" data-bk-id="' + b.id + '" title="Send reminder">⏰</button>';
            out += '<button class="btn btn-ghost btn-sm" data-bk-action="reschedule" data-bk-id="' + b.id + '" title="Reschedule">↻</button>';
            out += '<button class="btn btn-ghost btn-sm" data-bk-action="ics" data-bk-id="' + b.id + '" title="Download ICS">📅</button>';
            out += '<button class="btn btn-ghost btn-sm" data-bk-action="noshow" data-bk-id="' + b.id + '">No-show</button>';
            out += '<button class="btn btn-ghost btn-sm" data-bk-action="cancel" data-bk-id="' + b.id + '">Cancel</button>';
        } else if (s === 'attended') {
            out += '<span class="bk-when-done">Attended ' + formatDate(b.attendedAt, true) + '</span>';
        } else if (s === 'cancelled') {
            out += '<span class="bk-when-done">Cancelled</span>';
        } else if (s === 'no_show') {
            out += '<span class="bk-when-done">No-show</span>';
        }
        return out;
    }

    function handleBookingAction(action, bookingId) {
        var bookings = getBookings();
        var idx = bookings.findIndex(function (x) { return x.id === bookingId; });
        if (idx < 0) return;
        var b = bookings[idx];

        if (action === 'confirm') {
            b.status = 'confirmed';
            b.confirmedAt = new Date().toISOString();
            saveBookings(bookings);
            renderBookings();
            toast('✓ Booking confirmed');
        } else if (action === 'email') {
            emailCustomerForBooking(b, 'confirmation');
        } else if (action === 'remind') {
            emailCustomerForBooking(b, 'reminder');
        } else if (action === 'ics') {
            downloadIcsForBooking(b);
        } else if (action === 'reschedule') {
            openRescheduleModal(b);
        } else if (action === 'cancel') {
            var wasAttended = (b.status === 'attended');
            if (!confirm('Cancel this booking?' + (wasAttended ? ' A visit was already deducted from the pass — it will be refunded.' : ''))) return;
            // Only refund if a visit was actually deducted (status was 'attended')
            if (b.customerPassId && wasAttended) {
                refundPassVisit(b.customerPassId);
            }
            b.status = 'cancelled';
            b.cancelledAt = new Date().toISOString();
            saveBookings(bookings);
            renderBookings();
            renderIssuedPasses();
            var msg = '✓ Booking cancelled';
            if (b.customerPassId && wasAttended) msg += ' — visit refunded to pass';
            toast(msg);
        } else if (action === 'noshow') {
            b.status = 'no_show';
            b.noShowAt = new Date().toISOString();
            // no pass deduction
            saveBookings(bookings);
            renderBookings();
            toast('Marked as no-show (no pass deduction)');
        } else if (action === 'attended') {
            // CRITICAL: auto-deduct pass visit
            if (b.customerPassId) {
                var ok = deductPassVisit(b.customerPassId);
                if (!ok) {
                    toast('Cannot mark attended: pass has no visits remaining', true);
                    return;
                }
            }
            b.status = 'attended';
            b.attendedAt = new Date().toISOString();
            saveBookings(bookings);
            renderBookings();
            renderIssuedPasses();
            renderCustomers();
            toast(b.customerPassId ? '✓ Attended — 1 visit deducted from pass' : '✓ Marked attended');
        }
    }

    function deductPassVisit(passId) {
        var passes = getCustomerPasses();
        var p = passes.find(function (x) { return x.id === passId; });
        if (!p) return false;
        if (p.status !== 'active') return false;
        if (p.visitsRemaining <= 0) return false;
        p.visitsRemaining -= 1;
        p.visitsUsed = (p.visitsUsed || 0) + 1;
        if (p.visitsRemaining === 0) p.status = 'exhausted';
        saveCustomerPasses(passes);
        return true;
    }

    function refundPassVisit(passId) {
        var passes = getCustomerPasses();
        var p = passes.find(function (x) { return x.id === passId; });
        if (!p) return;
        if (p.visitsUsed > 0) p.visitsUsed -= 1;
        p.visitsRemaining = (p.visitsRemaining || 0) + 1;
        if (p.status === 'exhausted' && p.visitsRemaining > 0) p.status = 'active';
        saveCustomerPasses(passes);
    }

    // ============================================
    // CUSTOMERS
    // ============================================
    function renderCustomers() {
        var list = document.getElementById('customersList');
        if (!list) return;
        var customers = getCustomers();
        var bookings = getBookings();
        var passes = getCustomerPasses();
        var templates = (siteData && siteData.passTemplates) || [];
        var tMap = {};
        templates.forEach(function (t) { tMap[t.id] = t; });

        var searchEl = document.getElementById('customerSearch');
        var search = searchEl ? searchEl.value.trim().toLowerCase() : '';
        if (search) {
            customers = customers.filter(function (c) {
                return (c.name || '').toLowerCase().indexOf(search) >= 0 ||
                       (c.email || '').toLowerCase().indexOf(search) >= 0;
            });
        }
        customers.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
        document.getElementById('customersCount').textContent = customers.length + ' customer' + (customers.length === 1 ? '' : 's');

        if (customers.length === 0) {
            list.innerHTML = '<p class="empty-hint">No customers yet. Customers are auto-created when someone buys a pass or makes a booking.</p>';
            return;
        }
        list.innerHTML = customers.map(function (c) {
            var cBookings = bookings.filter(function (b) { return b.customerId === c.id; });
            var attended = cBookings.filter(function (b) { return b.status === 'attended'; }).length;
            var cPasses = passes.filter(function (p) { return p.customerId === c.id; });
            var activePasses = cPasses.filter(function (p) { return p.status === 'active'; });
            var totalVisitsLeft = activePasses.reduce(function (sum, p) { return sum + (p.visitsRemaining || 0); }, 0);
            return '<div class="cu-row" data-cu-id="' + c.id + '">' +
                '<div class="cu-name"><b>' + escapeHtml(c.name) + '</b><span>' + escapeHtml(c.email) + '</span></div>' +
                '<div class="cu-stats">' +
                    '<span class="cu-pill">' + cBookings.length + ' bookings</span>' +
                    '<span class="cu-pill">' + attended + ' attended</span>' +
                    '<span class="cu-pill cu-pill-pass">' + (totalVisitsLeft > 0 ? '🎟️ ' + totalVisitsLeft + ' visits left' : 'no active pass') + '</span>' +
                '</div>' +
            '</div>';
        }).join('');
        list.querySelectorAll('[data-cu-id]').forEach(function (r) {
            r.addEventListener('click', function () { openCustomerModal(r.getAttribute('data-cu-id')); });
        });

        if (searchEl && !searchEl._wired) {
            searchEl._wired = true;
            searchEl.addEventListener('input', renderCustomers);
        }
    }

    function openCustomerModal(customerId) {
        var modal = document.getElementById('customerModal');
        var customers = getCustomers();
        var c = customers.find(function (x) { return x.id === customerId; });
        if (!c) return;
        var bookings = getBookings().filter(function (b) { return b.customerId === customerId; }).sort(function (a, b) { return (b.bookingDate || '').localeCompare(a.bookingDate || ''); });
        var passes = getCustomerPasses().filter(function (p) { return p.customerId === customerId; });
        var templates = (siteData && siteData.passTemplates) || [];
        var tMap = {};
        templates.forEach(function (t) { tMap[t.id] = t; });
        var dayNames = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

        document.getElementById('customerModalTitle').textContent = c.name;
        var html = '<div class="cu-modal-info">' +
            '<div><b>Email:</b> ' + escapeHtml(c.email) + '</div>' +
            '<div><b>Phone:</b> ' + (c.phone ? escapeHtml(c.phone) : '—') + '</div>' +
            '<div><b>Customer since:</b> ' + formatDate(c.createdAt) + '</div>' +
        '</div>';

        html += '<h4>Passes</h4>';
        if (passes.length === 0) {
            html += '<p class="empty-hint">No passes yet.</p>';
        } else {
            html += passes.map(function (p) {
                var t = tMap[p.passTemplateId] || { name: '(deleted)' };
                return '<div class="cu-pass-row cu-pass-' + p.status + '">' +
                    '<div><b>' + escapeHtml(t.name) + '</b></div>' +
                    '<div class="cu-pass-progress">' + p.visitsRemaining + ' / ' + p.visitsTotal + ' visits left</div>' +
                    '<div class="cu-pass-status">' + p.status + '</div>' +
                '</div>';
            }).join('');
        }

        html += '<h4>Bookings</h4>';
        if (bookings.length === 0) {
            html += '<p class="empty-hint">No bookings yet.</p>';
        } else {
            html += '<div class="cu-bookings-list">' + bookings.map(function (b) {
                return '<div class="cu-bk-row">' +
                    '<div>' + (dayNames[b.night] || b.night) + ' ' + formatDate(b.bookingDate) + '</div>' +
                    '<div>' + b.plan + ' · ' + b.status + '</div>' +
                '</div>';
            }).join('') + '</div>';
        }

        document.getElementById('customerModalBody').innerHTML = html;
        modal.style.display = 'flex';
    }

    // ============================================
    // MODAL CLOSE WIRING
    // ============================================
    document.querySelectorAll('[data-modal-close]').forEach(function (el) {
        el.addEventListener('click', function () {
            var m = el.closest('.modal');
            if (m) m.style.display = 'none';
        });
    });

    // ============================================
    // HELPERS
    // ============================================
    function escapeHtml(s) {
        if (s === undefined || s === null) return '';
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function formatDate(iso, withTime) {
        if (!iso) return '—';
        var d = new Date(iso);
        if (isNaN(d.getTime())) return '—';
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        if (!withTime) return y + '-' + m + '-' + day;
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        return y + '-' + m + '-' + day + ' ' + hh + ':' + mm;
    }

    // ============================================
    // WIRE RENDER CALLS INTO renderAll
    // ============================================
    // ============================================
    // PRE-ORDER RESERVATIONS
    // ============================================
    function renderPreorderReservations() {
        var list = document.getElementById('preorderResList');
        if (!list) return;
        var reservations = getPreorderReservations();
        var customers = getCustomers();
        var cMap = {};
        customers.forEach(function (c) { cMap[c.id] = c; });
        var countEl = document.getElementById('preorderResCount');
        if (countEl) countEl.textContent = reservations.length;

        if (currentPreorderFilter !== 'all') {
            reservations = reservations.filter(function (r) { return r.status === currentPreorderFilter; });
        }
        reservations.sort(function (a, b) { return (b.reservedAt || '').localeCompare(a.reservedAt || ''); });

        if (reservations.length === 0) {
            list.innerHTML = '<p class="empty-hint">No pre-order reservations yet. When customers reserve a box on the public site, they appear here.</p>';
            return;
        }
        list.innerHTML = reservations.map(function (r) {
            var c = cMap[r.customerId] || { name: '(unknown)', email: '' };
            return '<div class="pr-row pr-status-' + r.status + '">' +
                '<div class="pr-item">' +
                    '<div class="pr-item-name"><b>' + escapeHtml(r.itemName || r.preorderItemId) + '</b></div>' +
                    '<div class="pr-item-code">' + escapeHtml(r.itemCode || '') + ' · ' + (r.quantity || 1) + ' box' + ((r.quantity || 1) > 1 ? 'es' : '') + '</div>' +
                '</div>' +
                '<div class="pr-customer">' +
                    '<div class="pr-customer-name"><b>' + escapeHtml(c.name) + '</b></div>' +
                    '<div class="pr-customer-email">' + escapeHtml(c.email) + (c.phone ? ' · ' + escapeHtml(c.phone) : '') + '</div>' +
                '</div>' +
                '<div class="pr-deposit">£' + r.depositPaid + ' deposit</div>' +
                '<div class="pr-status pr-status-pill-' + r.status + '">' + r.status + '</div>' +
                '<div class="pr-date">' + formatDate(r.reservedAt) + '</div>' +
                '<div class="pr-actions">' + preorderActionButtons(r) + '</div>' +
            '</div>';
        }).join('');

        // Wire actions
        list.querySelectorAll('[data-pr-action]').forEach(function (b) {
            b.addEventListener('click', function () {
                handlePreorderAction(b.getAttribute('data-pr-action'), b.getAttribute('data-pr-id'));
            });
        });

        // Wire filter
        document.querySelectorAll('.preorder-res-filter .filter-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-pr-filter') === currentPreorderFilter);
            btn.onclick = function () {
                currentPreorderFilter = btn.getAttribute('data-pr-filter');
                renderPreorderReservations();
            };
        });
    }

    function preorderActionButtons(r) {
        if (r.status === 'reserved') {
            return '<button class="btn btn-primary btn-sm" data-pr-action="picked_up" data-pr-id="' + r.id + '">✓ Picked Up</button>' +
                   '<button class="btn btn-ghost btn-sm" data-pr-action="cancel" data-pr-id="' + r.id + '">Cancel</button>';
        } else if (r.status === 'picked_up') {
            return '<span class="bk-when-done">Picked up ' + formatDate(r.pickedUpAt, true) + '</span>';
        } else if (r.status === 'cancelled') {
            return '<span class="bk-when-done">Cancelled</span>';
        }
        return '';
    }

    function handlePreorderAction(action, resId) {
        var reservations = getPreorderReservations();
        var idx = reservations.findIndex(function (x) { return x.id === resId; });
        if (idx < 0) return;
        var r = reservations[idx];
        if (action === 'picked_up') {
            r.status = 'picked_up';
            r.pickedUpAt = new Date().toISOString();
            savePreorderReservations(reservations);
            renderPreorderReservations();
            toast('✓ Marked as picked up');
        } else if (action === 'cancel') {
            if (!confirm('Cancel this pre-order reservation? The customer should be contacted about refunding the deposit.')) return;
            r.status = 'cancelled';
            r.cancelledAt = new Date().toISOString();
            savePreorderReservations(reservations);
            renderPreorderReservations();
            toast('✓ Reservation cancelled');
        }
    }

    var _origRenderAll = renderAll;
    renderAll = function () {
        _origRenderAll();
        checkAndExpirePasses();
        renderPasses();
        renderBookings();
        renderCustomers();
        renderPreorderReservations();
    };

    // ============================================
    // EMAIL / REMINDER / ICS HELPERS
    // ============================================
    function emailCustomerForBooking(booking, kind) {
        var customers = getCustomers();
        var c = customers.find(function (x) { return x.id === booking.customerId; });
        if (!c) { toast('No customer record', true); return; }
        var sm = (siteData && siteData.siteMeta) || {};
        var schedule = (siteData && siteData.schedule) || [];
        var dayMap = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
        var night = dayMap[booking.night] || booking.night;
        var dayCfg = schedule.find(function (d) { return d.day && d.day.toLowerCase().slice(0, 3) === booking.night; });
        var time = (dayCfg && dayCfg.startTime) ? dayCfg.startTime + ' – ' + (dayCfg.endTime || '') : '';
        var planLabels = { single: 'Single Pack (£8)', bundle: '3-Pack Bundle (£24)', box: 'Full Box', byo: 'BYO (£15)' };
        var plan = planLabels[booking.plan] || booking.plan;
        var passNote = booking.customerPassId ? '\n\n🎟️ You\'re using a Visit Pass — we\'ll deduct 1 visit when you attend.' : '';
        var firstName = c.name.split(' ')[0];

        var subject, body;
        if (kind === 'reminder') {
            subject = 'Reminder — your seat is reserved for tomorrow';
            body = 'Hi ' + firstName + ',\n\n' +
                'Just a quick reminder — your seat at Salon Poke is reserved for:\n\n' +
                '  ' + night + ' ' + booking.bookingDate + (time ? '\n  Time: ' + time : '') + '\n\n' +
                'Address: ' + (sm.address || '60A Park Row') + ', ' + (sm.city || 'Bristol') + ' ' + (sm.postcode || 'BS1 5LE') + '\n' +
                'Need to cancel? Reply at least 24h ahead.\n\n' +
                'See you tomorrow 🎴\nSalon Poke';
        } else {
            subject = 'Booking confirmed — ' + night + ' ' + booking.bookingDate;
            body = 'Hi ' + firstName + ',\n\n' +
                'Thanks for booking a seat at Salon Poke!\n\n' +
                '  Night:    ' + night + ' (' + booking.bookingDate + ')\n' +
                (time ? '  Time:     ' + time + '\n' : '') +
                '  Plan:     ' + plan + '\n' +
                '  Party:    ' + (booking.partySize || 1) + (booking.notes ? '\n  Notes:    ' + booking.notes : '') + '\n\n' +
                'Address: ' + (sm.address || '60A Park Row') + ', ' + (sm.city || 'Bristol') + ' ' + (sm.postcode || 'BS1 5LE') + '\n' +
                'Phone:   ' + (sm.phoneDisplay || '+44 117 555 0182') + '\n\n' +
                'Free cancellation up to 24h before. We\'ll send a reminder the day before.' + passNote + '\n\n' +
                'See you at the counter 🎴\nSalon Poke';
        }
        var mailto = 'mailto:' + encodeURIComponent(c.email) +
            '?subject=' + encodeURIComponent(subject) +
            '&body=' + encodeURIComponent(body);
        window.open(mailto, '_blank', 'noopener');
        toast('✓ Email opened — review and send');
    }

    function downloadIcsForBooking(booking) {
        var customers = getCustomers();
        var c = customers.find(function (x) { return x.id === booking.customerId; });
        var schedule = (siteData && siteData.schedule) || [];
        var dayCfg = schedule.find(function (d) { return d.day && d.day.toLowerCase().slice(0, 3) === booking.night; });
        var startTime = (dayCfg && dayCfg.startTime) || '19:00';
        var endTime = (dayCfg && dayCfg.endTime) || '22:00';
        var dateStr = booking.bookingDate.replace(/-/g, '');
        var startStr = dateStr + 'T' + startTime.replace(':', '') + '00';
        var endStr = dateStr + 'T' + endTime.replace(':', '') + '00';
        var sm = (siteData && siteData.siteMeta) || {};
        var location = (sm.address || '60A Park Row') + ', ' + (sm.city || 'Bristol') + ' ' + (sm.postcode || 'BS1 5LE');
        var summary = 'Salon Poke — ' + (dayCfg ? dayCfg.theme : booking.night);
        var desc = 'Plan: ' + booking.plan + '\\nParty: ' + (booking.partySize || 1) + (booking.notes ? '\\nNotes: ' + booking.notes : '');
        var ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Salon Poke//Booking//EN',
            'BEGIN:VEVENT',
            'UID:' + booking.id + '@salonpoke.co.uk',
            'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
            'DTSTART:' + startStr,
            'DTEND:' + endStr,
            'SUMMARY:' + summary,
            'DESCRIPTION:' + desc,
            'LOCATION:' + location,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
        var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'salonpoke-' + booking.bookingDate + '.ics';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('✓ ICS file downloaded');
    }

    function openRescheduleModal(booking) {
        var customers = getCustomers();
        var c = customers.find(function (x) { return x.id === booking.customerId; });
        var html = '<div class="modal" id="rescheduleModal" style="display:flex;">' +
            '<div class="modal-backdrop" data-modal-close></div>' +
            '<div class="modal-content">' +
                '<button class="modal-close" data-modal-close>×</button>' +
                '<h3>Reschedule Booking</h3>' +
                '<p class="section-desc">For ' + escapeHtml(c ? c.name : 'customer') + '. Move them to a different date / night.</p>' +
                '<div class="form-grid form-grid-2">' +
                    '<div class="form-group">' +
                        '<label>New Date</label>' +
                        '<input type="date" id="rs_date" value="' + booking.bookingDate + '" min="' + new Date().toISOString().slice(0, 10) + '">' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label>New Night</label>' +
                        '<select id="rs_night">' +
                            '<option value="mon" ' + (booking.night === 'mon' ? 'selected' : '') + '>Monday</option>' +
                            '<option value="tue" ' + (booking.night === 'tue' ? 'selected' : '') + '>Tuesday</option>' +
                            '<option value="wed" ' + (booking.night === 'wed' ? 'selected' : '') + '>Wednesday</option>' +
                            '<option value="thu" ' + (booking.night === 'thu' ? 'selected' : '') + '>Thursday</option>' +
                            '<option value="fri" ' + (booking.night === 'fri' ? 'selected' : '') + '>Friday</option>' +
                            '<option value="sat" ' + (booking.night === 'sat' ? 'selected' : '') + '>Saturday</option>' +
                            '<option value="sun" ' + (booking.night === 'sun' ? 'selected' : '') + '>Sunday</option>' +
                        '</select>' +
                    '</div>' +
                '</div>' +
                '<div class="modal-actions">' +
                    '<button class="btn btn-ghost" data-modal-close>Cancel</button>' +
                    '<button class="btn btn-primary" id="rs_save">Reschedule</button>' +
                '</div>' +
            '</div>' +
        '</div>';
        // Inject and wire
        var existing = document.getElementById('rescheduleModal');
        if (existing) existing.remove();
        var div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstChild);
        var modal = document.getElementById('rescheduleModal');
        modal.querySelectorAll('[data-modal-close]').forEach(function (el) {
            el.addEventListener('click', function () { modal.remove(); });
        });
        document.getElementById('rs_save').addEventListener('click', function () {
            var newDate = document.getElementById('rs_date').value;
            var newNight = document.getElementById('rs_night').value;
            if (!newDate) { toast('Date is required', true); return; }
            var bookings = getBookings();
            var idx = bookings.findIndex(function (x) { return x.id === booking.id; });
            if (idx < 0) return;
            var old = bookings[idx].bookingDate + ' ' + bookings[idx].night;
            bookings[idx].bookingDate = newDate;
            bookings[idx].night = newNight;
            bookings[idx].rescheduledFrom = old;
            bookings[idx].rescheduledAt = new Date().toISOString();
            saveBookings(bookings);
            renderBookings();
            modal.remove();
            toast('✓ Rescheduled to ' + newDate);
        });
    }

    // ============================================
    // BULK: SEND REMINDERS (for all tomorrow's bookings)
    // ============================================
    function sendBulkReminders() {
        var bookings = getBookings();
        var tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        var todaysBookings = bookings.filter(function (b) {
            return b.bookingDate === tomorrow && (b.status === 'confirmed' || b.status === 'pending');
        });
        if (todaysBookings.length === 0) {
            toast('No bookings for tomorrow (' + tomorrow + ')', true);
            return;
        }
        if (!confirm('Send reminder emails to ' + todaysBookings.length + ' customer(s) with bookings tomorrow? Opens ' + todaysBookings.length + ' email drafts.')) return;
        var sent = 0;
        todaysBookings.forEach(function (b) {
            setTimeout(function () { emailCustomerForBooking(b, 'reminder'); }, sent * 600);
            sent++;
        });
        toast('✓ Opened ' + sent + ' email drafts');
    }

    // ============================================
    // BULK: IMPORT / EXPORT (CSV + JSON)
    // ============================================
    function exportAllData() {
        var dump = {
            exportedAt: new Date().toISOString(),
            dataVersion: '1.0',
            customers: getCustomers(),
            bookings: getBookings(),
            customerPasses: getCustomerPasses(),
            preorderReservations: getPreorderReservations(),
            blockedDates: getBlockedDates(),
            customerNotes: getCustomerNotes(),
            customerTags: getCustomerTags()
        };
        var blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'salonpoke-export-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('✓ Full data exported');
    }

    function exportCustomersCsv() {
        var customers = getCustomers();
        var bookings = getBookings();
        var passes = getCustomerPasses();
        var notes = getCustomerNotes();
        var tags = getCustomerTags();
        var rows = [['id', 'name', 'email', 'phone', 'createdAt', 'bookings', 'attended', 'activeVisits', 'notes', 'tags']];
        customers.forEach(function (c) {
            var cBk = bookings.filter(function (b) { return b.customerId === c.id; });
            var attended = cBk.filter(function (b) { return b.status === 'attended'; }).length;
            var cPs = passes.filter(function (p) { return p.customerId === c.id && p.status === 'active'; });
            var visits = cPs.reduce(function (s, p) { return s + (p.visitsRemaining || 0); }, 0);
            rows.push([
                c.id, c.name, c.email, c.phone || '',
                c.createdAt, cBk.length, attended, visits,
                notes[c.id] || '',
                (tags[c.id] || []).join(';')
            ]);
        });
        var csv = rows.map(function (r) {
            return r.map(function (cell) {
                var s = String(cell || '').replace(/"/g, '""');
                return /[",\n]/.test(s) ? '"' + s + '"' : s;
            }).join(',');
        }).join('\n');
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'salonpoke-customers-' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('✓ Customers CSV exported');
    }

    function importCustomersCsv(csvText) {
        var lines = csvText.split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
        if (lines.length < 2) { toast('CSV is empty', true); return; }
        var header = parseCsvLine(lines[0]);
        var colMap = {};
        header.forEach(function (h, i) { colMap[h.trim().toLowerCase()] = i; });
        var requiredCols = ['name', 'email'];
        for (var i = 0; i < requiredCols.length; i++) {
            if (colMap[requiredCols[i]] === undefined) { toast('CSV missing required column: ' + requiredCols[i], true); return; }
        }
        var added = 0, updated = 0;
        var customers = getCustomers();
        for (var i = 1; i < lines.length; i++) {
            var cells = parseCsvLine(lines[i]);
            var name = (cells[colMap['name']] || '').trim();
            var email = (cells[colMap['email']] || '').trim().toLowerCase();
            if (!name || !email) continue;
            var existing = customers.find(function (c) { return c.email === email; });
            if (existing) {
                if (name && existing.name !== name) existing.name = name;
                if (colMap['phone'] !== undefined) {
                    var ph = (cells[colMap['phone']] || '').trim();
                    if (ph) existing.phone = ph;
                }
                existing.updatedAt = new Date().toISOString();
                updated++;
            } else {
                customers.push({
                    id: 'cust_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    name: name,
                    email: email,
                    phone: colMap['phone'] !== undefined ? (cells[colMap['phone']] || '').trim() : '',
                    createdAt: new Date().toISOString()
                });
                added++;
            }
        }
        saveCustomers(customers);
        renderCustomers();
        toast('✓ Imported: ' + added + ' new, ' + updated + ' updated');
    }

    function parseCsvLine(line) {
        var result = [];
        var current = '';
        var inQuote = false;
        for (var i = 0; i < line.length; i++) {
            var c = line[i];
            if (inQuote) {
                if (c === '"' && line[i + 1] === '"') { current += '"'; i++; }
                else if (c === '"') { inQuote = false; }
                else { current += c; }
            } else {
                if (c === '"') inQuote = true;
                else if (c === ',') { result.push(current); current = ''; }
                else current += c;
            }
        }
        result.push(current);
        return result;
    }

    // ============================================
    // GDPR: export / delete single customer
    // ============================================
    function exportCustomerData(customerId) {
        var c = getCustomers().find(function (x) { return x.id === customerId; });
        if (!c) { toast('Customer not found', true); return; }
        var dump = {
            gdprExport: true,
            exportedAt: new Date().toISOString(),
            customer: c,
            bookings: getBookings().filter(function (b) { return b.customerId === customerId; }),
            passes: getCustomerPasses().filter(function (p) { return p.customerId === customerId; }),
            preorderReservations: getPreorderReservations().filter(function (r) { return r.customerId === customerId; }),
            notes: getCustomerNotes()[customerId] || '',
            tags: getCustomerTags()[customerId] || []
        };
        var blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'gdpr-' + c.email.replace(/[^a-z0-9]/gi, '-') + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('✓ GDPR export ready');
    }

    function deleteCustomerData(customerId) {
        var c = getCustomers().find(function (x) { return x.id === customerId; });
        if (!c) return;
        if (!confirm('PERMANENTLY delete ' + c.name + ' and all their bookings, passes and pre-orders? This cannot be undone.')) return;
        if (!confirm('Are you absolutely sure? GDPR delete is irreversible.')) return;
        saveCustomers(getCustomers().filter(function (x) { return x.id !== customerId; }));
        saveBookings(getBookings().filter(function (b) { return b.customerId !== customerId; }));
        saveCustomerPasses(getCustomerPasses().filter(function (p) { return p.customerId !== customerId; }));
        savePreorderReservations(getPreorderReservations().filter(function (r) { return r.customerId !== customerId; }));
        var notes = getCustomerNotes(); delete notes[customerId]; saveCustomerNotes(notes);
        var tags = getCustomerTags(); delete tags[customerId]; saveCustomerTags(tags);
        renderCustomers();
        renderBookings();
        renderIssuedPasses();
        renderPreorderReservations();
        toast('✓ Customer data deleted (GDPR)');
    }

    // ============================================
    // CUSTOMER NOTES & TAGS
    // ============================================
    var KEY_CUSTOMER_NOTES = 'salonPokeCustomerNotes';
    var KEY_CUSTOMER_TAGS = 'salonPokeCustomerTags';
    var KEY_BLOCKED_DATES = 'salonPokeBlockedDates';
    function getCustomerNotes() { return lsGet(KEY_CUSTOMER_NOTES, {}); }
    function saveCustomerNotes(o) { lsSet(KEY_CUSTOMER_NOTES, o); }
    function getCustomerTags() { return lsGet(KEY_CUSTOMER_TAGS, {}); }
    function saveCustomerTags(o) { lsSet(KEY_CUSTOMER_TAGS, o); }
    function getBlockedDates() { return lsGet(KEY_BLOCKED_DATES, []); }
    function saveBlockedDates(arr) { lsSet(KEY_BLOCKED_DATES, arr); }

    function renderDashboard() {
        var bookings = getBookings();
        var passes = getCustomerPasses();
        var customers = getCustomers();
        var pres = getPreorderReservations();
        var blocked = getBlockedDates();
        var today = new Date().toISOString().slice(0, 10);
        var weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        var monthStart = today.slice(0, 7);
        var pricing = (siteData && siteData.pricing) || {};
        var priceSingle = pricing.singlePack || 8;
        var priceBundle = pricing.bundle3 || 24;
        var planRevenue = { single: priceSingle, bundle: priceBundle, box: 96, byo: pricing.byoEntry || 15 };
        function isThisMonth(d) { return d && d.slice(0, 7) === monthStart; }
        function revenueOf(b) { return b.status === 'attended' ? (planRevenue[b.plan] || 0) * (b.partySize || 1) : 0; }

        var todays = bookings.filter(function (b) { return b.bookingDate === today && b.status !== 'cancelled'; });
        var tomorrows = bookings.filter(function (b) { return b.bookingDate === weekEnd.slice(0, 10) === today ? false : b.bookingDate; });
        tomorrows = bookings.filter(function (b) {
            var tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
            return b.bookingDate === tomorrow && b.status !== 'cancelled';
        });
        var thisWeek = bookings.filter(function (b) { return b.bookingDate >= today && b.bookingDate <= weekEnd && b.status !== 'cancelled'; });
        var thisMonth = bookings.filter(function (b) { return isThisMonth(b.bookingDate); });
        var attended = bookings.filter(function (b) { return b.status === 'attended'; });
        var noShows = bookings.filter(function (b) { return b.status === 'no_show'; });
        var totalAttended = attended.length;
        var attendanceRate = totalAttended + noShows.length > 0
            ? Math.round((totalAttended / (totalAttended + noShows.length)) * 100)
            : 0;
        var monthRevenue = thisMonth.reduce(function (s, b) { return s + revenueOf(b); }, 0);

        // Most popular night
        var nightCounts = {};
        attended.forEach(function (b) { nightCounts[b.night] = (nightCounts[b.night] || 0) + 1; });
        var popularNight = Object.keys(nightCounts).sort(function (a, b) { return nightCounts[b] - nightCounts[a]; })[0];
        var dayMap = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

        // Most active customer
        var custCounts = {};
        attended.forEach(function (b) { custCounts[b.customerId] = (custCounts[b.customerId] || 0) + 1; });
        var topCustId = Object.keys(custCounts).sort(function (a, b) { return custCounts[b] - custCounts[a]; })[0];
        var topCust = topCustId ? customers.find(function (c) { return c.id === topCustId; }) : null;

        // Pass adoption
        var activePasses = passes.filter(function (p) { return p.status === 'active'; });
        var totalPassVisitsLeft = activePasses.reduce(function (s, p) { return s + (p.visitsRemaining || 0); }, 0);
        var passAdoption = customers.length > 0 ? Math.round((activePasses.length / customers.length) * 100) : 0;

        // Pending payouts / pre-orders
        var pendingPres = pres.filter(function (r) { return r.status === 'reserved'; });
        var pendingDeposits = pendingPres.reduce(function (s, r) { return s + (r.depositPaid || 0); }, 0);

        var html = '<div class="dash-grid">';
        html += '<div class="dash-card dash-card-large">' +
                    '<div class="dash-card-label">Today\'s Bookings</div>' +
                    '<div class="dash-card-value">' + todays.length + '</div>' +
                    '<div class="dash-card-sub">' + todays.filter(function (b) { return b.status === 'pending'; }).length + ' pending · ' + todays.filter(function (b) { return b.status === 'confirmed'; }).length + ' confirmed</div>' +
                '</div>';
        html += '<div class="dash-card">' +
                    '<div class="dash-card-label">This Week</div>' +
                    '<div class="dash-card-value">' + thisWeek.length + '</div>' +
                    '<div class="dash-card-sub">' + thisWeek.reduce(function (s, b) { return s + (b.partySize || 1); }, 0) + ' guests</div>' +
                '</div>';
        html += '<div class="dash-card">' +
                    '<div class="dash-card-label">This Month</div>' +
                    '<div class="dash-card-value">' + thisMonth.length + '</div>' +
                    '<div class="dash-card-sub">£' + monthRevenue + ' revenue (est.)</div>' +
                '</div>';
        html += '<div class="dash-card">' +
                    '<div class="dash-card-label">Attendance Rate</div>' +
                    '<div class="dash-card-value">' + attendanceRate + '%</div>' +
                    '<div class="dash-card-sub">' + totalAttended + ' attended · ' + noShows.length + ' no-show</div>' +
                '</div>';
        html += '<div class="dash-card">' +
                    '<div class="dash-card-label">Active Passes</div>' +
                    '<div class="dash-card-value">' + activePasses.length + '</div>' +
                    '<div class="dash-card-sub">' + totalPassVisitsLeft + ' visits left · ' + passAdoption + '% adoption</div>' +
                '</div>';
        html += '<div class="dash-card">' +
                    '<div class="dash-card-label">Total Customers</div>' +
                    '<div class="dash-card-value">' + customers.length + '</div>' +
                    '<div class="dash-card-sub">' + passes.length + ' passes ever issued</div>' +
                '</div>';
        html += '<div class="dash-card">' +
                    '<div class="dash-card-label">Popular Night</div>' +
                    '<div class="dash-card-value">' + (popularNight ? dayMap[popularNight] : '—') + '</div>' +
                    '<div class="dash-card-sub">' + (popularNight ? nightCounts[popularNight] + ' attended nights' : 'no data yet') + '</div>' +
                '</div>';
        html += '<div class="dash-card">' +
                    '<div class="dash-card-label">Top Customer</div>' +
                    '<div class="dash-card-value" style="font-size:18px;">' + (topCust ? escapeHtml(topCust.name) : '—') + '</div>' +
                    '<div class="dash-card-sub">' + (topCust ? custCounts[topCust.id] + ' attended' : 'no data yet') + '</div>' +
                '</div>';
        html += '<div class="dash-card">' +
                    '<div class="dash-card-label">Pre-Orders Reserved</div>' +
                    '<div class="dash-card-value">' + pendingPres.length + '</div>' +
                    '<div class="dash-card-sub">£' + pendingDeposits + ' in deposits</div>' +
                '</div>';

        // Analytics row (loaded async)
        html += '<div class="dash-card dash-card-analytics">' +
                    '<div class="dash-card-label">Page Views (30 days)</div>' +
                    '<div class="dash-card-value" id="dash_views_count">—</div>' +
                    '<div class="dash-card-sub" id="dash_views_sub">Loading…</div>' +
                '</div>';
        html += '</div>';

        // Quick actions
        html += '<h4>Quick Actions</h4>';
        html += '<div class="dash-actions">' +
                    '<button class="btn btn-primary" id="qa_reminders">⏰ Send Tomorrow\'s Reminders</button>' +
                    '<button class="btn btn-ghost" id="qa_printToday">🖨️ Print Today\'s Bookings</button>' +
                    '<button class="btn btn-ghost" id="qa_printWeek">🖨️ Print This Week</button>' +
                    '<button class="btn btn-ghost" id="qa_blockToday">🚫 Block Today</button>' +
                '</div>';

        // Blocked dates
        html += '<h4>Blocked Dates (' + blocked.length + ')</h4>';
        html += '<div class="blocked-dates-bar">' +
                    '<input type="date" id="block_dateInput" min="' + today + '">' +
                    '<input type="text" id="block_reasonInput" placeholder="Reason (optional, e.g. Private Hire)">' +
                    '<button class="btn btn-ghost btn-sm" id="block_addBtn">+ Block Date</button>' +
                '</div>';
        if (blocked.length > 0) {
            html += '<div class="blocked-dates-list">' + blocked.sort().map(function (b) {
                return '<div class="blocked-date-row">' +
                    '<div><b>' + b.date + '</b>' + (b.reason ? ' · ' + escapeHtml(b.reason) : '') + '</div>' +
                    '<button class="btn btn-ghost btn-sm" data-block-rm="' + b.date + '">Unblock</button>' +
                '</div>';
            }).join('') + '</div>';
        } else {
            html += '<p class="empty-hint">No blocked dates. Add one to prevent bookings on holidays or private-hire days.</p>';
        }

        // Tomorrow's bookings preview
        html += '<h4>Tomorrow\'s Bookings (' + tomorrows.length + ')</h4>';
        if (tomorrows.length === 0) {
            html += '<p class="empty-hint">No bookings for tomorrow.</p>';
        } else {
            html += '<div class="dash-tomorrow-list">' + tomorrows.map(function (b) {
                var c = customers.find(function (x) { return x.id === b.customerId; }) || { name: '?', email: '' };
                return '<div class="dash-tomorrow-row">' +
                    '<div><b>' + escapeHtml(c.name) + '</b> · ' + (dayMap[b.night] || b.night) + ' ' + b.bookingDate + '</div>' +
                    '<div>' + b.plan + ' · ' + b.status + '</div>' +
                '</div>';
            }).join('') + '</div>';
        }

        var container = document.getElementById('dashboardContent');
        if (container) container.innerHTML = html;

        // Wire up quick actions
        var qa = document.getElementById('qa_reminders');
        if (qa) qa.onclick = sendBulkReminders;
        var pt = document.getElementById('qa_printToday');
        if (pt) pt.onclick = function () { printBookingsByDateRange(today, today); };
        var pw = document.getElementById('qa_printWeek');
        if (pw) pw.onclick = function () { printBookingsByDateRange(today, weekEnd); };
        var bt = document.getElementById('qa_blockToday');
        if (bt) bt.onclick = function () { addBlockedDate(today, 'Admin blocked'); };
        var bAdd = document.getElementById('block_addBtn');
        if (bAdd) bAdd.onclick = function () {
            var d = document.getElementById('block_dateInput').value;
            var r = document.getElementById('block_reasonInput').value.trim();
            if (!d) { toast('Pick a date first', true); return; }
            addBlockedDate(d, r);
        };
        document.querySelectorAll('[data-block-rm]').forEach(function (b) {
            b.onclick = function () { removeBlockedDate(b.getAttribute('data-block-rm')); };
        });

        // Load page view analytics (async, fire-and-forget)
        if (window.salonPokeData2 && window.salonPokeData2.getPageViews) {
            window.salonPokeData2.getPageViews(30).then(function (views) {
                var vEl = document.getElementById('dash_views_count');
                var sEl = document.getElementById('dash_views_sub');
                if (!vEl) return;
                vEl.textContent = views.length;
                var unique = {};
                var todayCount = 0;
                var todayStr = new Date().toISOString().slice(0, 10);
                views.forEach(function (v) {
                    unique[v.path || '/'] = (unique[v.path || '/'] || 0) + 1;
                    if ((v.created_at || '').slice(0, 10) === todayStr) todayCount++;
                });
                var topPath = Object.keys(unique).sort(function (a, b) { return unique[b] - unique[a]; })[0];
                var parts = [todayCount + ' today'];
                if (topPath) parts.push('top: ' + topPath);
                if (sEl) sEl.textContent = parts.join(' · ');
            }).catch(function () { /* ignore */ });
        }
    }

    function addBlockedDate(date, reason) {
        var blocked = getBlockedDates();
        if (blocked.find(function (b) { return b.date === date; })) { toast('Already blocked', true); return; }
        blocked.push({ date: date, reason: reason || '', blockedAt: new Date().toISOString() });
        saveBlockedDates(blocked);
        renderDashboard();
        toast('✓ ' + date + ' blocked');
    }
    function removeBlockedDate(date) {
        saveBlockedDates(getBlockedDates().filter(function (b) { return b.date !== date; }));
        renderDashboard();
        toast('✓ ' + date + ' unblocked');
    }

    // ============================================
    // PRINT BOOKINGS
    // ============================================
    function printBookingsByDateRange(startDate, endDate) {
        var bookings = getBookings().filter(function (b) {
            return b.bookingDate >= startDate && b.bookingDate <= endDate && b.status !== 'cancelled';
        });
        if (bookings.length === 0) { toast('No bookings in range', true); return; }
        var customers = getCustomers();
        var cMap = {};
        customers.forEach(function (c) { cMap[c.id] = c; });
        var schedule = (siteData && siteData.schedule) || [];
        var dayMap = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
        var byDate = {};
        bookings.forEach(function (b) {
            if (!byDate[b.bookingDate]) byDate[b.bookingDate] = [];
            byDate[b.bookingDate].push(b);
        });
        var sm = (siteData && siteData.siteMeta) || {};
        var html = '<!doctype html><html><head><meta charset="utf-8"><title>Bookings ' + startDate + ' – ' + endDate + '</title>' +
            '<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#222;padding:24px;}' +
            'h1{margin:0 0 4px;font-size:20px;}h2{margin:24px 0 8px;font-size:15px;color:#666;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #ccc;padding-bottom:4px;}' +
            'table{width:100%;border-collapse:collapse;font-size:12px;}' +
            'th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #eee;}' +
            'th{background:#f4f4f4;font-size:11px;text-transform:uppercase;}' +
            '.meta{color:#666;font-size:11px;}</style></head><body>';
        html += '<h1>Salon Poke — Bookings ' + startDate + (startDate !== endDate ? ' to ' + endDate : '') + '</h1>';
        html += '<div class="meta">' + bookings.length + ' booking(s) · printed ' + new Date().toLocaleString() + '</div>';
        Object.keys(byDate).sort().forEach(function (d) {
            html += '<h2>' + d + '</h2><table><thead><tr><th>Time</th><th>Name</th><th>Phone</th><th>Plan</th><th>Party</th><th>Pass</th><th>Status</th><th>Notes</th></tr></thead><tbody>';
            byDate[d].forEach(function (b) {
                var c = cMap[b.customerId] || { name: '?', email: '', phone: '' };
                var dayCfg = schedule.find(function (x) { return x.day && x.day.toLowerCase().slice(0, 3) === b.night; });
                var time = dayCfg ? dayCfg.startTime : '';
                html += '<tr>' +
                    '<td>' + time + '</td>' +
                    '<td><b>' + escapeHtml(c.name) + '</b><br><span class="meta">' + escapeHtml(c.email) + '</span></td>' +
                    '<td>' + escapeHtml(c.phone || '') + '</td>' +
                    '<td>' + b.plan + '</td>' +
                    '<td>' + (b.partySize || 1) + '</td>' +
                    '<td>' + (b.customerPassId ? '✓' : '—') + '</td>' +
                    '<td>' + b.status + '</td>' +
                    '<td>' + escapeHtml(b.notes || '') + '</td>' +
                '</tr>';
            });
            html += '</tbody></table>';
        });
        html += '</body></html>';
        var w = window.open('', '_blank', 'width=800,height=600');
        if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300); }
        toast('✓ Print view opened');
    }

    // ============================================
    // CUSTOMER DETAIL MODAL — extended
    // ============================================
    function openCustomerModal(customerId) {
        var modal = document.getElementById('customerModal');
        var customers = getCustomers();
        var c = customers.find(function (x) { return x.id === customerId; });
        if (!c) return;
        var bookings = getBookings().filter(function (b) { return b.customerId === customerId; }).sort(function (a, b) { return (b.bookingDate || '').localeCompare(a.bookingDate || ''); });
        var passes = getCustomerPasses().filter(function (p) { return p.customerId === customerId; });
        var templates = (siteData && siteData.passTemplates) || [];
        var tMap = {};
        templates.forEach(function (t) { tMap[t.id] = t; });
        var dayNames = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
        var notes = getCustomerNotes();
        var tags = getCustomerTags();
        var custTags = tags[c.id] || [];
        var noShowCount = bookings.filter(function (b) { return b.status === 'no_show'; }).length;
        var attendedCount = bookings.filter(function (b) { return b.status === 'attended'; }).length;
        var autoTag = noShowCount >= 2 ? 'no-show-risk' : (attendedCount >= 5 ? 'vip' : '');

        document.getElementById('customerModalTitle').textContent = c.name;
        var html = '<div class="cu-modal-info">' +
            '<div><b>Email:</b> ' + escapeHtml(c.email) + '</div>' +
            '<div><b>Phone:</b> ' + (c.phone ? escapeHtml(c.phone) : '—') + '</div>' +
            '<div><b>Customer since:</b> ' + formatDate(c.createdAt) + '</div>' +
            '<div><b>Stats:</b> ' + bookings.length + ' bookings · ' + attendedCount + ' attended · ' + noShowCount + ' no-show</div>' +
        '</div>';

        // Notes
        html += '<h4>Notes</h4>';
        html += '<textarea id="cu_note" class="cu-note-input" placeholder="Internal notes about this customer (not visible to them)…" rows="3">' + escapeHtml(notes[c.id] || '') + '</textarea>';
        html += '<button class="btn btn-ghost btn-sm" id="cu_saveNote">Save Note</button>';

        // Tags
        html += '<h4>Tags</h4>';
        html += '<div class="cu-tags">' +
            '<label class="cu-tag"><input type="checkbox" value="vip" ' + (custTags.indexOf('vip') >= 0 ? 'checked' : '') + '> VIP</label>' +
            '<label class="cu-tag"><input type="checkbox" value="no-show-risk" ' + (custTags.indexOf('no-show-risk') >= 0 ? 'checked' : '') + '> No-show risk</label>' +
            '<label class="cu-tag"><input type="checkbox" value="collector" ' + (custTags.indexOf('collector') >= 0 ? 'checked' : '') + '> Collector</label>' +
            '<label class="cu-tag"><input type="checkbox" value="chase-list" ' + (custTags.indexOf('chase-list') >= 0 ? 'checked' : '') + '> On chase list</label>' +
            (autoTag && custTags.indexOf(autoTag) < 0 ? '<span class="cu-tag-suggestion">Suggested: ' + autoTag + ' (auto)</span>' : '') +
        '</div>';

        // Action buttons
        html += '<h4>Actions</h4>';
        html += '<div class="cu-actions">' +
            '<a class="btn btn-ghost btn-sm" id="cu_email" href="mailto:' + encodeURIComponent(c.email) + '">✉ Email ' + escapeHtml(c.name.split(' ')[0]) + '</a>' +
            (c.phone ? '<a class="btn btn-ghost btn-sm" id="cu_wa" href="https://wa.me/' + c.phone.replace(/[^0-9]/g, '') + '" target="_blank" rel="noopener">💬 WhatsApp</a>' : '') +
            '<button class="btn btn-ghost btn-sm" id="cu_walkin">+ Walk-in Booking</button>' +
            '<button class="btn btn-ghost btn-sm" id="cu_export">📋 GDPR Export</button>' +
            '<button class="btn btn-danger btn-sm" id="cu_delete">🗑️ GDPR Delete</button>' +
        '</div>';

        html += '<h4>Passes</h4>';
        if (passes.length === 0) {
            html += '<p class="empty-hint">No passes yet.</p>';
        } else {
            html += passes.map(function (p) {
                var t = tMap[p.passTemplateId] || { name: '(deleted)' };
                return '<div class="cu-pass-row cu-pass-' + p.status + '">' +
                    '<div><b>' + escapeHtml(t.name) + '</b></div>' +
                    '<div class="cu-pass-progress">' + p.visitsRemaining + ' / ' + p.visitsTotal + ' visits left</div>' +
                    '<div class="cu-pass-status">' + p.status + '</div>' +
                '</div>';
            }).join('');
        }

        html += '<h4>Bookings</h4>';
        if (bookings.length === 0) {
            html += '<p class="empty-hint">No bookings yet.</p>';
        } else {
            html += '<div class="cu-bookings-list">' + bookings.map(function (b) {
                return '<div class="cu-bk-row">' +
                    '<div>' + (dayNames[b.night] || b.night) + ' ' + formatDate(b.bookingDate) + '</div>' +
                    '<div>' + b.plan + ' · ' + b.status + '</div>' +
                '</div>';
            }).join('') + '</div>';
        }

        document.getElementById('customerModalBody').innerHTML = html;
        modal.style.display = 'flex';

        // Wire actions
        var saveNote = document.getElementById('cu_saveNote');
        if (saveNote) saveNote.onclick = function () {
            var n = document.getElementById('cu_note').value;
            var all = getCustomerNotes();
            if (n.trim()) all[c.id] = n; else delete all[c.id];
            saveCustomerNotes(all);
            toast('✓ Note saved');
        };
        document.querySelectorAll('.cu-tag input[type="checkbox"]').forEach(function (cb) {
            cb.addEventListener('change', function () {
                var all = getCustomerTags();
                var arr = all[c.id] || [];
                if (cb.checked && arr.indexOf(cb.value) < 0) arr.push(cb.value);
                if (!cb.checked) arr = arr.filter(function (t) { return t !== cb.value; });
                if (arr.length === 0) delete all[c.id]; else all[c.id] = arr;
                saveCustomerTags(all);
                renderCustomers();
            });
        });
        var expBtn = document.getElementById('cu_export');
        if (expBtn) expBtn.onclick = function () { exportCustomerData(customerId); };
        var delBtn = document.getElementById('cu_delete');
        if (delBtn) delBtn.onclick = function () { deleteCustomerData(customerId); modal.style.display = 'none'; };
        var walkinBtn = document.getElementById('cu_walkin');
        if (walkinBtn) walkinBtn.onclick = function () { openWalkinBookingModal(customerId); };
    }

    function openWalkinBookingModal(customerId) {
        var customers = getCustomers();
        var c = customers.find(function (x) { return x.id === customerId; });
        if (!c) return;
        var html = '<div class="modal" id="walkinModal" style="display:flex;">' +
            '<div class="modal-backdrop" data-modal-close></div>' +
            '<div class="modal-content">' +
                '<button class="modal-close" data-modal-close>×</button>' +
                '<h3>Walk-in Booking — ' + escapeHtml(c.name) + '</h3>' +
                '<div class="form-grid form-grid-2">' +
                    '<div class="form-group"><label>Date</label><input type="date" id="wi_date" value="' + new Date().toISOString().slice(0,10) + '" min="' + new Date().toISOString().slice(0,10) + '"></div>' +
                    '<div class="form-group"><label>Night</label><select id="wi_night">' +
                        '<option value="mon">Monday</option><option value="tue">Tuesday</option><option value="wed">Wednesday</option>' +
                        '<option value="thu">Thursday</option><option value="fri" selected>Friday</option><option value="sat">Saturday</option>' +
                        '<option value="sun">Sunday</option>' +
                    '</select></div>' +
                    '<div class="form-group"><label>Plan</label><select id="wi_plan">' +
                        '<option value="single">Single £8</option><option value="bundle" selected>Bundle £24</option>' +
                        '<option value="box">Full Box</option><option value="byo">BYO</option>' +
                    '</select></div>' +
                    '<div class="form-group"><label>Party Size</label><input type="number" id="wi_party" min="1" value="1"></div>' +
                    '<div class="form-group full"><label>Notes</label><input type="text" id="wi_notes" placeholder="Walk-in, VIP, etc."></div>' +
                '</div>' +
                '<div class="modal-actions">' +
                    '<button class="btn btn-ghost" data-modal-close>Cancel</button>' +
                    '<button class="btn btn-primary" id="wi_save">Create Booking</button>' +
                '</div>' +
            '</div>' +
        '</div>';
        var existing = document.getElementById('walkinModal');
        if (existing) existing.remove();
        var div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstChild);
        var modal = document.getElementById('walkinModal');
        modal.querySelectorAll('[data-modal-close]').forEach(function (el) {
            el.addEventListener('click', function () { modal.remove(); });
        });
        document.getElementById('wi_save').addEventListener('click', function () {
            var date = document.getElementById('wi_date').value;
            var night = document.getElementById('wi_night').value;
            var plan = document.getElementById('wi_plan').value;
            var party = parseInt(document.getElementById('wi_party').value, 10) || 1;
            var notes = document.getElementById('wi_notes').value;
            if (!date) { toast('Date required', true); return; }
            var bookings = getBookings();
            var booking = {
                id: 'bk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                customerId: customerId,
                customerPassId: null,
                night: night,
                bookingDate: date,
                partySize: party,
                plan: plan,
                notes: 'Walk-in: ' + (notes || ''),
                status: 'confirmed',
                source: 'walkin',
                createdAt: new Date().toISOString(),
                confirmedAt: new Date().toISOString()
            };
            bookings.push(booking);
            saveBookings(bookings);
            renderBookings();
            renderDashboard();
            modal.remove();
            document.getElementById('customerModal').style.display = 'none';
            toast('✓ Walk-in booking created');
        });
    }

    // Update customer list to show tags
    function renderCustomers() {
        var list = document.getElementById('customersList');
        if (!list) return;
        var customers = getCustomers();
        var bookings = getBookings();
        var passes = getCustomerPasses();
        var templates = (siteData && siteData.passTemplates) || [];
        var tMap = {};
        templates.forEach(function (t) { tMap[t.id] = t; });
        var tagsAll = getCustomerTags();

        var searchEl = document.getElementById('customerSearch');
        var search = searchEl ? searchEl.value.trim().toLowerCase() : '';
        if (search) {
            customers = customers.filter(function (c) {
                return (c.name || '').toLowerCase().indexOf(search) >= 0 ||
                       (c.email || '').toLowerCase().indexOf(search) >= 0;
            });
        }
        customers.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
        document.getElementById('customersCount').textContent = customers.length + ' customer' + (customers.length === 1 ? '' : 's');

        if (customers.length === 0) {
            list.innerHTML = '<p class="empty-hint">No customers yet. Customers are auto-created when someone buys a pass or makes a booking.</p>';
            return;
        }
        list.innerHTML = customers.map(function (c) {
            var cBookings = bookings.filter(function (b) { return b.customerId === c.id; });
            var attended = cBookings.filter(function (b) { return b.status === 'attended'; }).length;
            var cPasses = passes.filter(function (p) { return p.customerId === c.id; });
            var activePasses = cPasses.filter(function (p) { return p.status === 'active'; });
            var totalVisitsLeft = activePasses.reduce(function (sum, p) { return sum + (p.visitsRemaining || 0); }, 0);
            var custTags = tagsAll[c.id] || [];
            return '<div class="cu-row" data-cu-id="' + c.id + '">' +
                '<div class="cu-name"><b>' + escapeHtml(c.name) + '</b><span>' + escapeHtml(c.email) + '</span>' + (custTags.length ? '<div class="cu-tags-mini">' + custTags.map(function (t) { return '<span class="cu-tag-pill cu-tag-' + t + '">' + t + '</span>'; }).join('') + '</div>' : '') + '</div>' +
                '<div class="cu-stats">' +
                    '<span class="cu-pill">' + cBookings.length + ' bookings</span>' +
                    '<span class="cu-pill">' + attended + ' attended</span>' +
                    '<span class="cu-pill cu-pill-pass">' + (totalVisitsLeft > 0 ? '🎟️ ' + totalVisitsLeft + ' visits left' : 'no active pass') + '</span>' +
                '</div>' +
            '</div>';
        }).join('');
        list.querySelectorAll('[data-cu-id]').forEach(function (r) {
            r.addEventListener('click', function () { openCustomerModal(r.getAttribute('data-cu-id')); });
        });

        if (searchEl && !searchEl._wired) {
            searchEl._wired = true;
            searchEl.addEventListener('input', renderCustomers);
        }
    }

    // ============================================
    // WIRE renderDashboard into renderAll
    // ============================================
    var _origRenderAll2 = renderAll;
    renderAll = function () {
        _origRenderAll2();
        checkAndExpirePasses();
        renderPasses();
        renderBookings();
        renderCustomers();
        renderPreorderReservations();
        renderDashboard();
        renderCalendar();
    };

    // ============================================
    // CALENDAR
    // ============================================
    var calYear, calMonth; // current view (0-indexed month)

    function renderCalendar() {
        var titleEl = document.getElementById('cal_monthTitle');
        var gridEl = document.getElementById('cal_grid');
        if (!titleEl || !gridEl) return;
        if (calYear === undefined) {
            var now = new Date();
            calYear = now.getFullYear();
            calMonth = now.getMonth();
        }
        var monthName = ['January','February','March','April','May','June','July','August','September','October','November','December'][calMonth];
        titleEl.textContent = monthName + ' ' + calYear;

        var firstDay = new Date(calYear, calMonth, 1);
        var startWeekday = firstDay.getDay(); // 0 = Sun
        var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        var todayStr = new Date().toISOString().slice(0, 10);
        var bookings = getBookings();
        var blocked = getBlockedDates();

        // Build per-day booking counts
        var dayBookings = {};
        bookings.forEach(function (b) {
            if (b.status === 'cancelled') return;
            if (!dayBookings[b.bookingDate]) dayBookings[b.bookingDate] = [];
            dayBookings[b.bookingDate].push(b);
        });
        var blockedSet = {};
        blocked.forEach(function (b) { blockedSet[b.date] = b; });

        var html = '<div class="cal-weekdays">' +
            ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(function (d) { return '<div>' + d + '</div>'; }).join('') +
        '</div><div class="cal-days">';

        // Empty cells before first day
        for (var i = 0; i < startWeekday; i++) html += '<div class="cal-day cal-day-empty"></div>';

        for (var day = 1; day <= daysInMonth; day++) {
            var dateStr = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            var dow = new Date(calYear, calMonth, day).getDay(); // 0=Sun, 1=Mon...
            var isToday = dateStr === todayStr;
            var isBlocked = blockedSet[dateStr];
            var dayBk = dayBookings[dateStr] || [];
            var dotColors = [];
            // dot for each unique night
            dayBk.forEach(function (b) {
                var color = b.night === 'fri' ? '#ffd700' : b.night === 'sun' ? '#888' : '#ff8c00';
                if (dotColors.indexOf(color) < 0) dotColors.push(color);
            });
            var classes = ['cal-day'];
            if (isToday) classes.push('cal-day-today');
            if (isBlocked) classes.push('cal-day-blocked');
            if (dayBk.length > 0) classes.push('cal-day-has-bookings');
            if (dow === 0) classes.push('cal-day-sun');

            html += '<div class="' + classes.join(' ') + '" data-cal-day="' + dateStr + '">';
            html += '<div class="cal-day-num">' + day + '</div>';
            if (dotColors.length > 0) {
                html += '<div class="cal-day-dots">' + dotColors.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</div>';
            }
            if (dayBk.length > 0) {
                html += '<div class="cal-day-count">' + dayBk.length + ' booking' + (dayBk.length === 1 ? '' : 's') + '</div>';
            }
            if (isBlocked) {
                html += '<div class="cal-day-blocked-label">🚫 ' + escapeHtml(isBlocked.reason || 'Blocked') + '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
        gridEl.innerHTML = html;

        // Wire up clicks
        gridEl.querySelectorAll('[data-cal-day]').forEach(function (el) {
            el.addEventListener('click', function () {
                showCalDayDetail(el.getAttribute('data-cal-day'));
            });
        });

        // Wire nav
        var prev = document.getElementById('cal_prev');
        var next = document.getElementById('cal_next');
        var today = document.getElementById('cal_today');
        if (prev) prev.onclick = function () {
            calMonth--;
            if (calMonth < 0) { calMonth = 11; calYear--; }
            renderCalendar();
        };
        if (next) next.onclick = function () {
            calMonth++;
            if (calMonth > 11) { calMonth = 0; calYear++; }
            renderCalendar();
        };
        if (today) today.onclick = function () {
            var n = new Date();
            calYear = n.getFullYear();
            calMonth = n.getMonth();
            renderCalendar();
        };
    }

    function showCalDayDetail(dateStr) {
        var detail = document.getElementById('cal_detail');
        var title = document.getElementById('cal_detail_title');
        var body = document.getElementById('cal_detail_body');
        if (!detail || !body) return;
        var bookings = getBookings().filter(function (b) { return b.bookingDate === dateStr; });
        var customers = getCustomers();
        var cMap = {};
        customers.forEach(function (c) { cMap[c.id] = c; });
        var blocked = getBlockedDates().find(function (b) { return b.date === dateStr; });
        var dow = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' });
        title.textContent = dateStr + ' · ' + dow;
        var html = '';
        if (blocked) {
            html += '<div class="cal-detail-blocked">🚫 This date is blocked: ' + escapeHtml(blocked.reason || 'no reason given') + '</div>';
        }
        if (bookings.length === 0) {
            html += '<p class="empty-hint">No bookings for this date.</p>';
        } else {
            bookings.sort(function (a, b) {
                if (a.status === 'cancelled') return 1;
                if (b.status === 'cancelled') return -1;
                return (a.createdAt || '').localeCompare(b.createdAt || '');
            });
            html += '<div class="cal-detail-list">' + bookings.map(function (b) {
                var c = cMap[b.customerId] || { name: '?', email: '' };
                return '<div class="cal-detail-row cal-status-' + b.status + '">' +
                    '<div class="cal-detail-name"><b>' + escapeHtml(c.name) + '</b><span>' + escapeHtml(c.email) + '</span></div>' +
                    '<div class="cal-detail-meta">' + b.plan + ' · party of ' + (b.partySize || 1) + (b.customerPassId ? ' · 🎟️' : '') + (b.notes ? ' · "' + escapeHtml(b.notes) + '"' : '') + '</div>' +
                    '<div class="cal-detail-status">' + b.status + '</div>' +
                '</div>';
            }).join('') + '</div>';
        }
        body.innerHTML = html;
        detail.style.display = '';
        // Scroll into view
        detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ============================================
    // CUSTOMER-FACING SELF-SERVICE (used by Member Center)
    // These are exposed on window.salonPokeCustomerPortal
    // ============================================
    var customerPortal = {
        findBookings: function (email) {
            var customers = getCustomers();
            var c = customers.find(function (x) { return x.email === email.toLowerCase().trim(); });
            if (!c) return null;
            return {
                customer: c,
                bookings: getBookings().filter(function (b) { return b.customerId === c.id; }),
                passes: getCustomerPasses().filter(function (p) { return p.customerId === c.id; }),
                preorders: getPreorderReservations().filter(function (r) { return r.customerId === c.id; })
            };
        },
        cancelBooking: function (bookingId, email) {
            var bookings = getBookings();
            var b = bookings.find(function (x) { return x.id === bookingId; });
            if (!b) return { ok: false, error: 'Booking not found' };
            // Verify email matches the customer
            var customers = getCustomers();
            var c = customers.find(function (x) { return x.id === b.customerId; });
            if (!c || c.email !== email.toLowerCase().trim()) return { ok: false, error: 'Email does not match' };
            if (b.status === 'cancelled') return { ok: false, error: 'Already cancelled' };
            if (b.status === 'attended') return { ok: false, error: 'Cannot cancel a booking you have already attended' };
            // Refund pass if previously attended-and-then-changed... not relevant here since we already blocked attended
            // Refund pass if there was a pass attached AND was attended (edge: shouldn't happen since we block)
            if (b.customerPassId && b.status === 'attended') {
                refundPass(b.customerPassId);
            }
            var wasAttended = b.status === 'attended';
            b.status = 'cancelled';
            b.cancelledAt = new Date().toISOString();
            b.cancelledBy = 'customer';
            saveBookings(bookings);
            return { ok: true, refunded: wasAttended && !!b.customerPassId };
        },
        rescheduleBooking: function (bookingId, email, newDate, newNight) {
            var bookings = getBookings();
            var b = bookings.find(function (x) { return x.id === bookingId; });
            if (!b) return { ok: false, error: 'Booking not found' };
            var customers = getCustomers();
            var c = customers.find(function (x) { return x.id === b.customerId; });
            if (!c || c.email !== email.toLowerCase().trim()) return { ok: false, error: 'Email does not match' };
            if (b.status === 'cancelled' || b.status === 'attended') return { ok: false, error: 'Cannot reschedule a ' + b.status + ' booking' };
            if (!newDate) return { ok: false, error: 'New date required' };
            // Check new date not blocked
            var blocked = getBlockedDates().find(function (x) { return x.date === newDate; });
            if (blocked) return { ok: false, error: 'New date is blocked: ' + (blocked.reason || '') };
            b.bookingDate = newDate;
            b.night = newNight || b.night;
            b.rescheduledAt = new Date().toISOString();
            b.rescheduledBy = 'customer';
            saveBookings(bookings);
            return { ok: true };
        },
        cancelPreorder: function (resId, email) {
            var list = getPreorderReservations();
            var r = list.find(function (x) { return x.id === resId; });
            if (!r) return { ok: false, error: 'Pre-order not found' };
            var customers = getCustomers();
            var c = customers.find(function (x) { return x.id === r.customerId; });
            if (!c || c.email !== email.toLowerCase().trim()) return { ok: false, error: 'Email does not match' };
            if (r.status !== 'reserved') return { ok: false, error: 'Pre-order is ' + r.status };
            // Refund policy: cancel up to 7 days before release
            // We don't have release date here, just check it's not picked_up/cancelled
            r.status = 'cancelled';
            r.cancelledAt = new Date().toISOString();
            r.cancelledBy = 'customer';
            savePreorderReservations(list);
            return { ok: true };
        }
    };

    // Expose portal globally so script.js (customer site) can call it
    // Note: in a real Supabase setup this would be a server API; for localStorage
    // we trust the same browser. Customer uses Member Center from same device.
    window.salonPokeCustomerPortal = customerPortal;

})();