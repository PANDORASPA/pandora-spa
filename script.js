/* ============================================
   SALON POKE — Website Interactions
   ============================================ */

const salonPoke = (function () {
    'use strict';

    // ----- Navbar scroll effect -----
    const nav = document.getElementById('nav');

    function handleNavScroll() {
        if (window.pageYOffset > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll();

    // ----- Smooth scroll for anchor links -----
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#' || targetId.length < 2) return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const navHeight = nav.offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ----- Scroll reveal animations -----
    const revealSelectors = [
        '.about-text', '.about-feature', '.product-card', '.event-detail',
        '.day-card', '.pricing-matrix-row', '.rule-card',
        '.pass-card', '.passes-faq-title', '.passes-faq-list',
        '.preorder-card', '.gallery-item', '.testimonial',
        '.faq-item', '.book-intro', '.book-form', '.newsletter-inner',
        '.location-info', '.location-map', '.section-head', '.footer-col',
        '.pricing-matrix-head', '.quickbuy-card', '.quickbuy-head'
    ];

    const revealElements = document.querySelectorAll(revealSelectors.join(','));
    revealElements.forEach(el => el.classList.add('fade-up'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, Math.min(index * 50, 400));
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => observer.observe(el));

    // ----- FAQ Accordion -----
    document.querySelectorAll('.faq-q').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const wasOpen = item.classList.contains('open');
            // Close all
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
            // Open clicked if it was closed
            if (!wasOpen) {
                item.classList.add('open');
            }
        });
    });

    // ----- Default date input to today -----
    const dateInput = document.querySelector('input[type="date"][name="date"]');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.min = `${yyyy}-${mm}-${dd}`;
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // ----- Form: Booking -----
    function handleBooking(e) {
        const form = e.target;
        const data = Object.fromEntries(new FormData(form).entries());

        // Simulate submission
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Confirming...';
        btn.disabled = true;

        setTimeout(() => {
            // Show success message
            let successEl = form.querySelector('.form-success');
            if (!successEl) {
                successEl = document.createElement('div');
                successEl.className = 'form-success';
                form.appendChild(successEl);
            }
            successEl.textContent = `✓ Booking received for ${data.name || 'you'} — ${data.day ? data.day.toUpperCase() : ''} ${data.date}. We'll confirm via email within 24 hours.`;
            successEl.classList.add('show');

            btn.textContent = 'Confirmed ✓';
            btn.style.background = 'linear-gradient(135deg, #4ddb8e, #2eb872)';

            // Reset form after delay
            setTimeout(() => {
                form.reset();
                btn.textContent = originalText;
                btn.disabled = false;
                btn.style.background = '';
                successEl.classList.remove('show');
                // Re-set default date
                if (dateInput) {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    dateInput.value = `${yyyy}-${mm}-${dd}`;
                }
            }, 5000);

            console.log('Booking data:', data);
        }, 800);
    }

    // ----- Form: Newsletter -----
    function handleNewsletter(e) {
        const form = e.target;
        const input = form.querySelector('input[type="email"]');
        const btn = form.querySelector('button[type="submit"]');
        const email = input.value;
        const originalText = btn.textContent;

        btn.textContent = 'Subscribing...';
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = 'Subscribed ✓';
            btn.style.background = 'linear-gradient(135deg, #4ddb8e, #2eb872)';
            input.value = '';

            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
                btn.style.background = '';
            }, 3000);

            console.log('Newsletter signup:', email);
        }, 600);
    }

    // ----- Hero box hover parallax -----
    const heroBoxes = document.querySelectorAll('.hero-box');
    if (heroBoxes.length) {
        const heroVisual = document.querySelector('.hero-visual');
        if (heroVisual) {
            heroVisual.addEventListener('mousemove', (e) => {
                const rect = heroVisual.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                heroBoxes.forEach((box, i) => {
                    const factor = (i === 0 ? 1 : -1) * 12;
                    const yFactor = (i === 0 ? 1 : -1) * 8;
                    box.style.transform = `rotate(${(i === 0 ? -8 : 8) + x * factor}deg) translate(${x * factor}px, ${y * yFactor}px)`;
                });
            });
            heroVisual.addEventListener('mouseleave', () => {
                heroBoxes.forEach((box, i) => {
                    box.style.transform = i === 0
                        ? 'rotate(-8deg) translateX(-50px)'
                        : 'rotate(8deg) translateX(50px) translateY(20px)';
                });
            });
        }
    }

    // ----- Product card subtle tilt -----
    document.querySelectorAll('.product-card, .preorder-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const rotateX = (0.5 - y) * 6;
            const rotateY = (x - 0.5) * 6;
            card.style.transform = `translateY(-6px) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });

    // ----- Gallery item click -----
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', () => {
            const tag = item.querySelector('.gallery-tag')?.textContent || '';
            const text = item.querySelector('.gallery-text')?.textContent || '';
            console.log('Gallery item clicked:', tag, text);
        });
    });

    // ----- Active nav link highlighting -----
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    function updateActiveLink() {
        let current = '';
        const scrollPos = window.pageYOffset + 200;
        sections.forEach(section => {
            if (scrollPos >= section.offsetTop) {
                current = section.id;
            }
        });
        navLinks.forEach(link => {
            link.style.color = '';
            if (link.getAttribute('href') === '#' + current) {
                link.style.color = '#ffd700';
            }
        });
    }

    window.addEventListener('scroll', updateActiveLink, { passive: true });

    // ----- Day-card click → scroll to book -----
    document.querySelectorAll('.day-card:not(.day-card-closed)').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (e.target.closest('a, button')) return;
            const dayName = card.querySelector('.day-name')?.textContent.toLowerCase() || '';
            const dayMap = {
                'mon': 'mon', 'tue': 'tue', 'wed': 'wed',
                'thu': 'thu', 'fri': 'fri', 'sat': 'sat'
            };
            const dayValue = dayMap[dayName];
            const select = document.querySelector('select[name="day"]');
            if (select && dayValue) {
                select.value = dayValue;
            }
            const book = document.getElementById('book');
            if (book) {
                const navHeight = nav.offsetHeight;
                const targetPosition = book.getBoundingClientRect().top + window.pageYOffset - navHeight;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });

    // ----- Image lazy load fallback -----
    if ('IntersectionObserver' in window) {
        const imgObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    imgObserver.unobserve(img);
                }
            });
        });
        document.querySelectorAll('img[data-src]').forEach(img => imgObserver.observe(img));
    }

    // ----- Year auto-update -----
    const yearEl = document.querySelector('[data-year]');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ----- Console signature -----
    console.log('%cSALON POKE', 'color:#ffd700;font-size:18px;font-weight:bold;letter-spacing:2px;');
    console.log('%cBristol\'s home for sealed Japanese Pokemon TCG.', 'color:#888;font-size:12px;');

    // Public API
    return {
        handleBooking,
        handleNewsletter
    };
})();
/* ============================================
   SALON POKE �� V2 ADDITIONS (100% Complete)
   ============================================ */

// ----- Open Now live status (reads from siteData so admin edits apply) -----
// Default opening hours — overridden by siteData.openingHours if available
function getDefaultHours() {
    return {
        monThuOpen: '11:00', monThuClose: '19:00',
        friOpen: '11:00', friClose: '22:00',
        satOpen: '11:00', satClose: '19:00',
        sunNote: 'Closed (Private Hire Only)'
    };
}
function parseHM(t) {
    if (!t || typeof t !== 'string' || t.indexOf(':') < 0) return null;
    var p = t.split(':');
    var h = parseInt(p[0], 10);
    var m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}
function fmtHM(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}
function getOpenCloseForDay(weekday, hours) {
    var h = hours || getDefaultHours();
    switch (weekday) {
        case 'mon': case 'tue': case 'wed': case 'thu':
            return { open: parseHM(h.monThuOpen), close: parseHM(h.monThuClose) };
        case 'fri':
            return { open: parseHM(h.friOpen), close: parseHM(h.friClose) };
        case 'sat':
            return { open: parseHM(h.satOpen), close: parseHM(h.satClose) };
        case 'sun':
            return { open: -1, close: -1 };
    }
    return null;
}
function updateOpenNow() {
    var badge = document.getElementById('openNowBadge');
    var textEl = document.getElementById('openNowText');
    if (!badge || !textEl) return;

    var hours = (window.salonPokeData && window.salonPokeData.openingHours) || getDefaultHours();
    var now = new Date();
    var ukParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
    var weekday = '', hour = 0, minute = 0;
    ukParts.forEach(function (p) {
        if (p.type === 'weekday') weekday = p.value.toLowerCase();
        if (p.type === 'hour') hour = parseInt(p.value, 10);
        if (p.type === 'minute') minute = parseInt(p.value, 10);
    });
    var nowMinutes = hour * 60 + minute;

    var slot = getOpenCloseForDay(weekday, hours);
    var open = false, closesAt = '';
    if (slot && slot.open >= 0) {
        open = nowMinutes >= slot.open && nowMinutes < slot.close;
        closesAt = fmtHM(slot.close);
    }

    if (open) {
        badge.classList.remove('is-closed');
        textEl.textContent = 'Open · until ' + closesAt;
    } else {
        badge.classList.add('is-closed');
        if (weekday === 'sun') {
            textEl.textContent = (hours.sunNote || 'Closed').replace(/\s*\(.*\)/, '');
        } else {
            var order = ['mon','tue','wed','thu','fri','sat','sun'];
            var cur = order.indexOf(weekday);
            var nextOpen = '';
            for (var i = 1; i <= 7; i++) {
                var idx = (cur + i) % 7;
                var d = order[idx];
                if (d === 'sun') continue;
                var slot2 = getOpenCloseForDay(d, hours);
                if (!slot2 || slot2.open < 0) continue;
                var label2 = d.charAt(0).toUpperCase() + d.slice(1);
                if (i === 1 && slot && slot.open >= 0 && nowMinutes < slot.open) {
                    nextOpen = 'today ' + fmtHM(slot.open);
                    break;
                }
                nextOpen = label2 + ' ' + fmtHM(slot2.open);
                break;
            }
            textEl.textContent = 'Closed · opens ' + (nextOpen || 'Mon 11:00');
        }
    }
}
// Initial paint + interval — also re-run when data loads
updateOpenNow();
setInterval(updateOpenNow, 60000);
document.addEventListener('salonpoke:dataLoaded', function () { updateOpenNow(); });

// ----- Legal tabs -----
document.querySelectorAll('.legal-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.legal-tab').forEach(b => b.classList.remove('legal-tab-active'));
        document.querySelectorAll('.legal-panel').forEach(p => p.classList.remove('legal-panel-active'));
        btn.classList.add('legal-tab-active');
        const panel = document.querySelector('[data-panel="' + tab + '"]');
        if (panel) panel.classList.add('legal-panel-active');
    });
});

// ----- Footer legal links -> activate tab -----
document.querySelectorAll('[data-legal-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
        const tab = link.dataset.legalTab;
        // Wait for smooth scroll, then activate tab
        setTimeout(() => {
            const tabBtn = document.querySelector('[data-tab="' + tab + '"]');
            if (tabBtn) tabBtn.click();
        }, 600);
    });
});

// ----- Back to top button -----
const backToTop = document.getElementById('backToTop');
if (backToTop) {
    function updateBackToTop() {
        if (window.pageYOffset > 600) backToTop.classList.add('is-visible');
        else backToTop.classList.remove('is-visible');
    }
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    updateBackToTop();
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* ============================================
   SALON POKE — V3 DYNAMIC DATA SYSTEM
   Loads data.json + merges localStorage overrides
   Renders products, schedule, pre-order from data
   ============================================ */

const DATA_KEY = 'salonPokeData';

function getDeep(obj, path) {
    return path.split('.').reduce(function (o, k) { return o && o[k]; }, obj);
}

// Map Supabase rows to data.json format
function dbToDataJson() {
  var s = window.salonPokeState;
  if (!s || !s.loaded) return null;

  var products = (s.products || []).map(function (p) {
    return {
      id: p.id, code: p.code, jpCode: p.jp_code, name: p.name, jpName: p.jp_name,
      price: p.price, tier: p.tier, badgeText: p.badge_text, img: p.img, alt: p.alt,
      desc: p.description, stock: p.stock, stockStatus: p.stock_status, featured: p.featured
    };
  });
  var schedule = (s.schedule || []).map(function (d) {
    return {
      day: d.day, dayNum: d.day_num, kicker: d.kicker, theme: d.theme, jpTheme: d.jp_theme,
      themeClass: d.theme_class, startTime: d.start_time, endTime: d.end_time, seats: d.seats,
      closed: d.closed, singlePrice: d.single_price, bundlePrice: d.bundle_price,
      boxPrice: d.box_price, entryPrice: d.entry_price, isFeatured: d.is_featured,
      isClosed: d.is_closed, sessionNote: d.session_note
    };
  });
  var preorder = (s.preorderItems || []).map(function (p) {
    return {
      id: p.id, code: p.code, jpCode: p.jp_code, name: p.name, jpName: p.jp_name,
      releaseDate: p.release_date, img: p.image_url, alt: p.name + ' booster box',
      desc: p.description, reservedPct: p.reserved_pct, isUpcoming: p.is_active, badge: p.badge
    };
  });
  var passTemplates = (s.passTemplates || []).map(function (p) {
    return {
      id: p.id, name: p.name, jpName: p.jp_name, visitsTotal: p.visits_total,
      priceGbp: p.price_gbp, validityDays: p.validity_days, description: p.description,
      badge: p.badge, sortOrder: p.sort_order, isActive: p.is_active, accent: p.accent
    };
  });
  var ss = s.siteSettings || {};
  return {
    siteMeta: ss.site_meta || {},
    hero: ss.hero || {},
    pricing: ss.pricing || {},
    openingHours: ss.opening_hours || {},
    admin: ss.admin_config || { password: 'salonpoke2026', sessionHours: 12 },
    passTemplates: passTemplates,
    passFaq: ss.pass_faq || [],
    products: products,
    schedule: schedule,
    preorder: preorder,
    promo: ss.promo || { enabled: false, text: '', cta: '', link: '#' }
  };
}

function loadSiteData() {
    // Track page view (fire and forget, no await)
    if (window.salonPokeData2 && window.salonPokeData2.trackPageView) {
      try { window.salonPokeData2.trackPageView(window.location.pathname, document.referrer); } catch (e) {}
    }
    // Try Supabase first
    if (window.salonPokeData2 && typeof window.salonPokeData2.loadAllData === 'function') {
      return window.salonPokeData2.loadAllData()
        .then(function () {
          var data = dbToDataJson();
          if (data) {
            // Apply any legacy localStorage overrides
            var overrides = {};
            try { overrides = JSON.parse(localStorage.getItem(DATA_KEY) || '{}'); } catch (e) { overrides = {}; }
            return mergeDeep(data, overrides);
          }
          // Fallback to fetch
          return fetchFallback();
        })
        .catch(function (e) {
          console.warn('[Salon Poke] Supabase load failed, falling back to data.json:', e);
          return fetchFallback();
        });
    }
    return fetchFallback();
}

function fetchFallback() {
  return fetch('data.json?_=' + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (defaultData) {
      var overrides = {};
      try { overrides = JSON.parse(localStorage.getItem(DATA_KEY) || '{}'); } catch (e) { overrides = {}; }
      return mergeDeep(defaultData, overrides);
    })
    .catch(function () {
      try {
        var stored = JSON.parse(localStorage.getItem(DATA_KEY) || 'null');
        return stored || null;
      } catch (e) { return null; }
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

function renderHeroStats(stats) {
    var el = document.getElementById('heroStats');
    if (!el || !stats) return;
    var html = '';
    for (var i = 0; i < stats.length; i++) {
        var s = stats[i];
        html += '<div class="stat"><div class="stat-num">' + s.value + '</div><div class="stat-label">' + s.label + '</div></div>';
    }
    el.innerHTML = html;
}

function renderProducts(products) {
    var grid = document.getElementById('shopGrid');
    if (!grid || !products) return;
    var html = '';
    for (var i = 0; i < products.length; i++) {
        var p = products[i];
        var badgeClass = p.tier === 'TOP' ? '' : (p.tier === 'CLASSIC' ? 'badge-mid' : 'badge-entry');
        var productHotClass = p.featured ? ' product-hot' : '';
        var stockHtml = '';
        if (p.stockStatus === 'out') {
            stockHtml = '<div class="stock-badge stock-out">Sold Out</div>';
        } else if (p.stockStatus === 'low' && p.stock > 0 && p.stock < 10) {
            stockHtml = '<div class="stock-badge stock-low">Only ' + p.stock + ' left</div>';
        } else if (p.stock > 0) {
            stockHtml = '<div class="stock-badge stock-in">In Stock</div>';
        }
        var imgHtml = p.img
            ? '<img src="' + p.img + '" alt="' + p.alt + '" class="product-img" loading="lazy" decoding="async">' + stockHtml
            : '<div class="product-img-placeholder"><div class="placeholder-text">' + p.name + '<br><span>' + p.code + '</span></div></div>';
        var ctaClass = p.featured ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
        var ctaText = p.featured ? ('Hold One — £' + p.price) : 'Hold One';
        var codeHtml = p.code + (p.jpCode ? (' · ' + p.jpCode) : '');
        html += '<article class="product-card' + productHotClass + '">';
        html += '  <div class="product-badge ' + badgeClass + '">' + p.badgeText + '</div>';
        html += '  <div class="product-img-wrap">' + imgHtml + '</div>';
        html += '  <div class="product-info">';
        html += '    <div class="product-code">' + codeHtml + '</div>';
        html += '    <h3 class="product-name">' + p.name + '</h3>';
        if (p.jpName) html += '    <div class="product-jp">' + p.jpName + '</div>';
        html += '    <p class="product-desc">' + p.desc + '</p>';
        html += '    <a href="#book" class="' + ctaClass + '">' + ctaText + '</a>';
        html += '  </div>';
        html += '</article>';
    }
    grid.innerHTML = html;
}

function formatTime12(t) {
    if (!t) return '';
    var parts = t.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1] || '00';
    var suffix = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ':' + m + ' ' + suffix;
}

function renderSchedule(schedule) {
    var grid = document.getElementById('weekGrid');
    if (!grid || !schedule) return;
    var html = '';
    for (var i = 0; i < schedule.length; i++) {
        var d = schedule[i];
        var cardClass = 'day-card';
        if (d.isFeatured) cardClass += ' day-card-featured';
        if (d.isClosed) cardClass += ' day-card-closed';
        html += '<div class="' + cardClass + '" data-day="' + d.day.toLowerCase() + '">';
        html += '  <div class="day-head">';
        html += '    <div class="day-name">' + d.day + '</div>';
        html += '    <div class="day-num">' + d.dayNum + '</div>';
        if (d.isFeatured) html += '    <div class="day-flag">★ SIGNATURE</div>';
        html += '  </div>';
        html += '  <div class="day-theme ' + d.themeClass + '">';
        html += '    <div class="day-theme-kicker">' + d.kicker + '</div>';
        html += '    <div class="day-theme-title">' + d.theme + '</div>';
        html += '    <div class="day-theme-jp">' + d.jpTheme + '</div>';
        html += '  </div>';
        var timeText = d.startTime;
        if (d.endTime && d.endTime.indexOf(':') > -1) {
            timeText = formatTime12(d.startTime) + ' – ' + formatTime12(d.endTime);
            if (d.sessionNote) timeText += ' (' + d.sessionNote + ')';
        } else if (d.endTime) {
            timeText += ' – ' + d.endTime;
        }
        html += '  <div class="day-meta">';
        html += '    <div class="day-time">' + timeText + '</div>';
        var capSuffix = d.isClosed ? 'pax min' : 'seats';
        html += '    <div class="day-cap"><span>' + d.seats + '</span> ' + capSuffix + '</div>';
        html += '  </div>';
        html += '  <div class="day-price">';
        if (d.singlePrice) html += '    <span class="day-price-item"><b>£' + d.singlePrice + '</b> single</span>';
        if (d.bundlePrice) html += '    <span class="day-price-item"><b>£' + d.bundlePrice + '</b> bundle</span>';
        if (d.boxPrice) html += '    <span class="day-price-item"><b>£' + d.boxPrice + '</b> box</span>';
        if (d.entryPrice && d.isClosed) {
            html += '    <span class="day-price-item"><b>From £' + d.entryPrice + '</b> group</span>';
        } else if (d.entryPrice && !d.singlePrice && !d.bundlePrice && !d.boxPrice) {
            html += '    <span class="day-price-item"><b>£' + d.entryPrice + '</b> entry</span>';
            html += '    <span class="day-price-item"><b>+packs</b></span>';
        }
        html += '  </div>';
        html += '</div>';
    }
    grid.innerHTML = html;
}

function renderPreorder(items, deposit) {
    var grid = document.getElementById('preorderGrid');
    if (!grid || !items) return;
    // Compute real reserved counts from localStorage
    var reservations = lsGetLs('salonPokePreorderReservations', []);
    var liveReservedByItem = {};
    reservations.forEach(function (r) {
        if (r.status === 'reserved' || r.status === 'picked_up') {
            liveReservedByItem[r.preorderItemId] = (liveReservedByItem[r.preorderItemId] || 0) + (r.quantity || 1);
        }
    });
    var html = '';
    for (var i = 0; i < items.length; i++) {
        var p = items[i];
        var cardClass = 'preorder-card';
        if (p.isUpcoming) cardClass += ' preorder-upcoming';
        var ctaClass = p.isUpcoming ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
        // Compute reservedPct: use static data.json as baseline OR live count, whichever higher
        var liveCount = liveReservedByItem[p.id] || 0;
        // Assume each preorder item has a "totalSlots" baseline; if not, use reservedPct as proxy
        var totalSlots = p.totalSlots || 20; // default 20 slots per item
        var livePct = Math.min(100, Math.round((liveCount / totalSlots) * 100));
        var displayPct = Math.max(p.reservedPct || 0, livePct);
        var liveNote = liveCount > 0 ? ' · ' + liveCount + ' live reservations' : '';
        html += '<div class="' + cardClass + '" data-preorder-id="' + p.id + '">';
        html += '  <div class="preorder-badge">' + p.badge + '</div>';
        html += '  <div class="preorder-img-wrap">';
        if (p.img) html += '    <img src="' + p.img + '" alt="' + p.alt + '" class="product-img" loading="lazy" decoding="async">';
        html += '  </div>';
        html += '  <div class="preorder-info">';
        html += '    <div class="preorder-code">' + p.code + (p.jpCode ? (' · ' + p.jpCode) : '') + '</div>';
        html += '    <h3>' + p.name + '</h3>';
        html += '    <div class="preorder-jp">' + p.jpName + '</div>';
        html += '    <p>' + p.desc + '</p>';
        html += '    <div class="preorder-stock">';
        html += '      <span class="preorder-stock-bar"><span style="width:' + displayPct + '%"></span></span>';
        html += '      <span class="preorder-stock-text">' + displayPct + '% reserved' + liveNote + '</span>';
        html += '    </div>';
        html += '    <button class="' + ctaClass + '" data-preorder-reserve="' + p.id + '">Reserve · £' + deposit + ' deposit</button>';
        html += '  </div>';
        html += '</div>';
    }
    grid.innerHTML = html;
    // wire reserve buttons
    grid.querySelectorAll('[data-preorder-reserve]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            openPreorderModal(btn.getAttribute('data-preorder-reserve'));
        });
    });
}

// ----- Pre-order reservation modal -----
function openPreorderModal(itemId) {
    var modal = document.getElementById('preorderModal');
    if (!modal) return;
    var items = (window.salonPokeData && window.salonPokeData.preorder) || [];
    var p = items.find(function (x) { return x.id === itemId; });
    if (!p) return;
    var deposit = (window.salonPokeData && window.salonPokeData.pricing && window.salonPokeData.pricing.preorderDeposit) || 20;
    document.getElementById('preorderKicker').textContent = 'PRE-ORDER · ' + (p.code || 'NEW');
    document.getElementById('preorderTitle').textContent = 'Reserve ' + p.name;
    document.getElementById('preorderDesc').innerHTML =
        '<b>' + (p.jpName || p.name) + '</b> · ' + p.desc + '<br>' +
        '<span style="color:#888;font-size:12px;">Expected release: ' + (p.releaseDate || 'TBC') + '</span>';
    document.getElementById('preorderItemId').value = p.id;
    document.getElementById('preorderDepositAmt').textContent = '£' + deposit;
    var f = document.getElementById('preorderForm');
    if (f) { f.reset(); f.style.display = ''; }
    var s = document.getElementById('preorderSuccess');
    if (s) s.style.display = 'none';
    modal.style.display = 'flex';
}

function handlePreorderReservation(e) {
    if (e && e.preventDefault) e.preventDefault();
    var form = e.target;
    var data = Object.fromEntries(new FormData(form).entries());
    var itemId = data.preorderItemId;
    var items = (window.salonPokeData && window.salonPokeData.preorder) || [];
    var p = items.find(function (x) { return x.id === itemId; });
    if (!p) { spToast('Item not found', 'error'); return false; }
    if (!data.name || !data.email) { spToast('Name and email required', 'error'); return false; }

    var qty = parseInt(data.quantity, 10) || 1;
    var deposit = (window.salonPokeData && window.salonPokeData.pricing && window.salonPokeData.pricing.preorderDeposit) || 20;

    var sb2 = window.salonPokeData2;
    sb2.upsertCustomer({ email: data.email, name: data.name, phone: data.phone })
      .then(function (customer) {
        return sb2.createPreorderReservation({
          customerId: customer.id,
          preorderItemId: itemId,
          itemName: p.name,
          itemCode: p.code,
          quantity: qty,
          depositPaid: qty * deposit,
          status: 'reserved'
        });
      })
      .then(function () {
        form.style.display = 'none';
        var s = document.getElementById('preorderSuccess');
        if (s) {
            s.innerHTML =
                '<div class="sp-success-icon">✓</div>' +
                '<h3>Reservation locked in</h3>' +
                '<p><b>' + qty + ' × ' + escapeHtmlLs(p.name) + '</b> reserved for ' + escapeHtmlLs(data.name) + '.</p>' +
                '<p>Deposit due: <b>£' + (qty * deposit) + '</b>. We\'ll confirm by email within 24h.</p>' +
                '<div class="sp-success-actions">' +
                    '<button class="btn btn-primary" onclick="document.getElementById(\'preorderModal\').style.display=\'none\'; if(typeof renderPreorder===\'function\'){var d=window.salonPokeData; renderPreorder(d.preorder, d.pricing.preorderDeposit);}">Done</button>' +
                    '<a href="#book" class="btn btn-ghost" onclick="document.getElementById(\'preorderModal\').style.display=\'none\';">Book a night →</a>' +
                '</div>';
            s.style.display = '';
        }
      })
      .catch(function (err) {
        spToast('Error: ' + (err.message || err), 'error');
        console.error('[Preorder] Error:', err);
      });
    return false;
}

function renderPromoBanner(promo) {
    var el = document.getElementById('promoBanner');
    if (!el || !promo) return;
    if (promo.enabled && promo.text) {
        el.style.display = 'flex';
        document.getElementById('promoBannerText').textContent = promo.text;
        var ctaEl = document.getElementById('promoBannerCta');
        if (promo.cta && promo.link) {
            ctaEl.textContent = promo.cta;
            ctaEl.href = promo.link;
            ctaEl.style.display = 'inline-flex';
        } else {
            ctaEl.style.display = 'none';
        }
    } else {
        el.style.display = 'none';
    }
}

function applyDataCfgElements(data) {
    var els = document.querySelectorAll('[data-cfg]');
    for (var i = 0; i < els.length; i++) {
        var el = els[i];
        var path = el.getAttribute('data-cfg');
        var prefix = el.getAttribute('data-cfg-prefix') || '';
        var val = getDeep(data, path);
        if (val !== undefined && val !== null) {
            el.textContent = prefix + val;
        }
    }
}

function applyOpeningHours(data) {
    var el = document.getElementById('locHours');
    if (!el || !data.openingHours) return;
    var h = data.openingHours;
    el.innerHTML =
        '<b>Mon – Thu</b> · ' + h.monThuOpen + ' – ' + h.monThuClose + '<br>' +
        '<b>Friday</b> · ' + h.friOpen + ' – ' + h.friClose + (h.friPackNote ? ' (' + h.friPackNote + ')' : '') + '<br>' +
        '<b>Saturday</b> · ' + h.satOpen + ' – ' + h.satClose + (h.satPackNote ? ' (' + h.satPackNote + ')' : '') + '<br>' +
        '<b>Sunday</b> · ' + h.sunNote;
}

function applyAddress(data) {
    var el = document.getElementById('locAddress');
    if (!el || !data.siteMeta) return;
    el.innerHTML = data.siteMeta.address + '<br>' + data.siteMeta.city + ' ' + data.siteMeta.country + ' ' + data.siteMeta.postcode;
}

function applyContactBlock(data) {
    var el = document.getElementById('locContact');
    if (!el || !data.siteMeta) return;
    var s = data.siteMeta;
    el.innerHTML =
        '<a href="' + s.instagramUrl + '" target="_blank" rel="noopener" class="location-link">Instagram · ' + s.instagramHandle + '</a><br>' +
        '<a href="https://wa.me/' + s.whatsappRaw + '" target="_blank" rel="noopener" class="location-link">WhatsApp · ' + s.phoneDisplay + '</a><br>' +
        '<a href="mailto:' + s.emailPublic + '" class="location-link">' + s.emailPublic + '</a><br>' +
        '<a href="mailto:' + s.emailBookings + '" class="location-link">' + s.emailBookings + ' (reservations)</a>';
}

function applyMap(data) {
    var el = document.getElementById('locMap');
    if (!el || !data.siteMeta) return;
    var addr = encodeURIComponent(data.siteMeta.address + ' ' + data.siteMeta.city + ' ' + data.siteMeta.postcode + ' ' + data.siteMeta.country);
    el.src = 'https://www.google.com/maps?q=' + addr + '&output=embed';
}

// ----- Render Visit Passes (cards) -----
function renderPasses(templates) {
    var grid = document.getElementById('passesGrid');
    if (!grid) return;
    if (!templates || templates.length === 0) {
        grid.innerHTML = '<p style="color:#888;text-align:center;padding:32px;">No visit passes available right now — please check back soon.</p>';
        return;
    }
    var active = templates.filter(function (t) { return t.isActive !== false; })
                          .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
    if (active.length === 0) {
        grid.innerHTML = '<p style="color:#888;text-align:center;padding:32px;">No active visit passes — please check back soon.</p>';
        return;
    }
    var html = '';
    active.forEach(function (t) {
        var accent = t.accent || '#ffd700';
        html += '<div class="pass-card" style="--pass-accent:' + accent + ';">';
        html += '  <div class="pass-card-badge">' + escapeHtmlLs(t.badge || 'PASS') + '</div>';
        html += '  <div class="pass-card-head">';
        html += '    <div class="pass-card-name">' + escapeHtmlLs(t.name) + '</div>';
        if (t.jpName) html += '    <div class="pass-card-jp">' + escapeHtmlLs(t.jpName) + '</div>';
        html += '  </div>';
        html += '  <div class="pass-card-visits"><b>' + t.visitsTotal + '</b><span>visits</span></div>';
        html += '  <div class="pass-card-price">£' + t.priceGbp + '</div>';
        html += '  <div class="pass-card-per">' + (t.validityDays ? 'valid ' + t.validityDays + ' days' : 'no expiry') + '</div>';
        html += '  <p class="pass-card-desc">' + escapeHtmlLs(t.description || '') + '</p>';
        html += '  <button class="btn btn-primary btn-full" data-buy-pass="' + escapeHtmlLs(t.id) + '">Buy this pass</button>';
        html += '</div>';
    });
    grid.innerHTML = html;
    // wire buy buttons
    grid.querySelectorAll('[data-buy-pass]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (typeof openBuyPassModal === 'function') openBuyPassModal(btn.getAttribute('data-buy-pass'));
        });
    });
}

// ----- Render Pass FAQ -----
function renderPassFaq(faqs) {
    var list = document.getElementById('passesFaqList');
    if (!list) return;
    if (!faqs || faqs.length === 0) {
        list.innerHTML = '';
        return;
    }
    var html = '';
    faqs.forEach(function (f, idx) {
        html += '<div class="faq-item">' +
                    '<button class="faq-q" type="button">' +
                        '<span>' + escapeHtmlLs(f.q) + '</span>' +
                        '<span class="faq-icon">+</span>' +
                    '</button>' +
                    '<div class="faq-a"><p>' + escapeHtmlLs(f.a) + '</p></div>' +
                '</div>';
    });
    list.innerHTML = html;
    // wire accordion (same pattern as main FAQ)
    list.querySelectorAll('.faq-q').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var item = btn.closest('.faq-item');
            var wasOpen = item.classList.contains('open');
            list.querySelectorAll('.faq-item').forEach(function (i) { i.classList.remove('open'); });
            if (!wasOpen) item.classList.add('open');
        });
    });
}

// Main init
loadSiteData().then(function (data) {
    if (!data) {
        console.warn('[Salon Poke] Could not load data.json — using static defaults.');
        return;
    }
    window.salonPokeData = data;
    renderHeroStats(data.hero && data.hero.stats);
    renderProducts(data.products);
    renderSchedule(data.schedule);
    renderPreorder(data.preorder, data.pricing ? data.pricing.preorderDeposit : 20);
    renderPromoBanner(data.promo);
    renderPasses(data.passTemplates);
    renderPassFaq(data.passFaq);
    applyDataCfgElements(data);
    applyOpeningHours(data);
    applyAddress(data);
    applyContactBlock(data);
    applyMap(data);
    if (typeof renderPreorderCountdowns === 'function') renderPreorderCountdowns(data);
    document.dispatchEvent(new CustomEvent('salonpoke:dataLoaded', { detail: data }));
    // Hide loading screen once data is rendered (with min visible time to avoid flash)
    var loadedAt = Date.now();
    var minVisible = 400;
    setTimeout(function() {
        var elapsed = Date.now() - loadedAt;
        var wait = Math.max(0, minVisible - elapsed);
        setTimeout(function() {
            var ls = document.getElementById('loadingScreen');
            if (ls) {
                ls.classList.add('is-hidden');
                setTimeout(function() { if (ls.parentNode) ls.parentNode.removeChild(ls); }, 600);
            }
        }, wait);
    }, 50);
});

/* ============================================
   V5 ADDITIONS — 100% TCG Card Store features
   ============================================ */

// ----- Mobile menu toggle -----
(function () {
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');
    if (!toggle || !links) return;
    function close() {
        links.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
        document.body.classList.remove('nav-open');
    }
    function open() {
        links.classList.add('is-open');
        toggle.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Close menu');
        document.body.classList.add('nav-open');
    }
    toggle.addEventListener('click', function () {
        if (links.classList.contains('is-open')) close();
        else open();
    });
    // Close on link click (mobile)
    links.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { if (window.innerWidth < 1024) close(); });
    });
    // Close on Escape
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    // Reset on resize to desktop
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024) close(); });
})();

// ----- Cookie consent (UK GDPR) -----
(function () {
    var KEY = 'salonpoke.cookies.v1';
    var banner = document.getElementById('cookieBanner');
    if (!banner) return;
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (!saved) {
        // Show after 1.5s delay so it doesn't fight the loading screen
        setTimeout(function () { banner.hidden = false; banner.classList.add('is-visible'); }, 1500);
    }
    function dismiss(value) {
        try { localStorage.setItem(KEY, value); } catch (e) {}
        banner.classList.remove('is-visible');
        setTimeout(function () { banner.hidden = true; }, 400);
    }
    var accept = document.getElementById('cookieAccept');
    var reject = document.getElementById('cookieReject');
    if (accept) accept.addEventListener('click', function () { dismiss('accepted'); });
    if (reject) reject.addEventListener('click', function () { dismiss('necessary'); });
})();

// ----- Booking form: real handler (writes to localStorage, no WhatsApp) -----
// TODO: Replace with Supabase insert once project is ready.
var KEY_CUSTOMERS_LS = 'salonPokeCustomers';
var KEY_BOOKINGS_LS = 'salonPokeBookings';
var KEY_CUSTOMER_PASSES_LS = 'salonPokeCustomerPasses';

function lsGetLs(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v === null ? fallback : v; }
    catch (e) { return fallback; }
}
function lsSetLs(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

function findOrCreateCustomerLs(email, name, phone) {
    email = (email || '').trim().toLowerCase();
    name = (name || '').trim();
    phone = (phone || '').trim();
    if (!email) return null;
    var customers = lsGetLs(KEY_CUSTOMERS_LS, []);
    var existing = customers.find(function (c) { return c.email === email; });
    if (existing) {
        if (name && existing.name !== name) existing.name = name;
        if (phone && !existing.phone) existing.phone = phone;
        existing.updatedAt = new Date().toISOString();
        lsSetLs(KEY_CUSTOMERS_LS, customers);
        return existing;
    }
    var c = {
        id: 'cust_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        email: email, name: name || email.split('@')[0], phone: phone || '',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    customers.push(c);
    lsSetLs(KEY_CUSTOMERS_LS, customers);
    return c;
}

function handleBookingReal(e) {
    if (e && e.preventDefault) e.preventDefault();
    var form = (e && e.target) || document.querySelector('.book-form');
    if (!form) return;
    var data = {};
    try { data = Object.fromEntries(new FormData(form).entries()); } catch (err) { return; }

    // Validate
    if (!data.name || !data.email || !data.day || !data.date) {
        spToast('Please fill in your name, email, preferred night and date.', 'error');
        return false;
    }

    // Check blocked dates
    var blocked = lsGetLs('salonPokeBlockedDates', []);
    var blockedEntry = blocked.find(function (b) { return b.date === data.date; });
    if (blockedEntry) {
        var reason = blockedEntry.reason ? ' (' + blockedEntry.reason + ')' : '';
        spConfirm('That date is currently blocked' + reason + '. Submit anyway and the team will review?', function () {
            doSubmitBooking(form, data, data.usePass && data.usePass !== 'none' ? data.usePass : null);
        });
        return false;
    }

    doSubmitBooking(form, data, data.usePass && data.usePass !== 'none' ? data.usePass : null);
    return false;
}

function doSubmitBooking(form, data, customerPassId) {
    var btn = form.querySelector('button[type="submit"]');
    var orig = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }
    var successEl = form.querySelector('.form-success');
    if (!successEl) {
        successEl = document.createElement('div');
        successEl.className = 'form-success';
        form.appendChild(successEl);
    }

    // Supabase: upsert customer, then create booking
    var sb2 = window.salonPokeData2;
    sb2.upsertCustomer({ email: data.email, name: data.name, phone: data.phone })
      .then(function (customer) {
        var booking = {
          customerId: customer.id,
          customerPassId: customerPassId,
          night: data.day,
          bookingDate: data.date,
          partySize: parseInt(data.party, 10) || 1,
          plan: data.plan || 'bundle',
          notes: data.notes || '',
          status: 'pending',
          source: 'web'
        };
        return sb2.createBooking(booking);
      })
      .then(function (newBooking) {
        if (btn) { btn.textContent = 'Booking saved ✓'; btn.style.background = 'linear-gradient(135deg, #4ddb8e, #2eb872)'; }
        var passNote = customerPassId
            ? '<br><span class="link-accent">🎟️ 1 visit will be deducted when you attend.</span>'
            : '';
        successEl.innerHTML = '✓ Booking received for <b>' + escapeHtmlLs(data.name || 'you') + '</b> — ' +
            escapeHtmlLs((data.day || '').toUpperCase()) + ' ' + escapeHtmlLs(data.date || '') + '. ' +
            'The team will confirm within 24h. ' +
            '<a href="#book">Book another night</a> or ' +
            '<a href="#" onclick="document.getElementById(\'openMemberCenterBtn\').click(); return false;">view your account</a>.' +
            passNote;
        successEl.classList.add('show');
        spToast('Booking confirmed! Check your email.', 'success');

        setTimeout(function () {
            if (btn) { btn.textContent = orig; btn.disabled = false; btn.style.background = ''; }
            form.reset();
            var di = form.querySelector('input[type="date"][name="date"]');
            if (di) {
              var t = new Date();
              di.value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
            }
            var rb = form.querySelector('input[name="plan"][value="bundle"]');
            if (rb) rb.checked = true;
            if (typeof updateUsePassOptionsLs === 'function') updateUsePassOptionsLs();
        }, 5000);
      })
      .catch(function (err) {
        if (btn) { btn.textContent = orig; btn.disabled = false; }
        successEl.innerHTML = '';
        successEl.classList.remove('show');
        spToast('Could not save booking: ' + (err.message || err), 'error');
        console.error('[Booking] Error:', err);
      });
}

// ----- Update "Use a Visit Pass" radios based on email typed in form -----
function updateUsePassOptionsLs() {
    var emailEl = document.querySelector('#bookingForm input[name="email"]');
    var row = document.getElementById('usePassRow');
    var radios = document.getElementById('usePassRadios');
    var hint = document.getElementById('usePassHint');
    if (!emailEl || !row || !radios) return;
    var email = (emailEl.value || '').trim().toLowerCase();
    if (!email || email.indexOf('@') < 1) {
        row.style.display = 'none';
        return;
    }
    var customers = lsGetLs(KEY_CUSTOMERS_LS, []);
    var cust = customers.find(function (c) { return c.email === email; });
    if (!cust) {
        row.style.display = 'none';
        return;
    }
    var passes = lsGetLs(KEY_CUSTOMER_PASSES_LS, []).filter(function (p) {
        return p.customerId === cust.id && p.status === 'active' && p.visitsRemaining > 0;
    });
    if (passes.length === 0) {
        row.style.display = 'none';
        return;
    }
    var templates = (window.salonPokeData && window.salonPokeData.passTemplates) || [];
    var tMap = {};
    templates.forEach(function (t) { tMap[t.id] = t; });
    var html = '<label class="form-radio"><input type="radio" name="usePass" value="none" checked> Pay normally (no pass)</label>';
    passes.forEach(function (p) {
        var t = tMap[p.passTemplateId] || { name: 'Pass' };
        html += '<label class="form-radio"><input type="radio" name="usePass" value="' + p.id + '"> 🎟️ ' + t.name + ' (' + p.visitsRemaining + ' left)</label>';
    });
    radios.innerHTML = html;
    if (hint) hint.innerHTML = 'Your active pass will redeem 1 visit when you attend. Cancel ≥24h before to keep the visit.';
    row.style.display = '';
}

// ----- Buy pass: open modal with template context -----
function openBuyPassModal(templateId) {
    var modal = document.getElementById('buyPassModal');
    if (!modal) return;
    var templates = (window.salonPokeData && window.salonPokeData.passTemplates) || [];
    var t = templates.find(function (x) { return x.id === templateId; });
    if (!t) return;
    document.getElementById('buyPassKicker').textContent = (t.badge || 'VISIT PASS') + ' · ' + t.visitsTotal + ' VISITS';
    document.getElementById('buyPassTitle').textContent = 'Buy the ' + t.name;
    document.getElementById('buyPassDesc').innerHTML =
        '<b>£' + t.priceGbp + '</b> · ' + t.description +
        (t.validityDays ? '<br><span style="color:#888;font-size:12px;">Valid for ' + t.validityDays + ' days from purchase.</span>' : '');
    document.getElementById('buyPassTemplateId').value = t.id;
    // Reset form
    var f = document.getElementById('buyPassForm');
    if (f) { f.reset(); f.style.display = ''; }
    var s = document.getElementById('buyPassSuccess');
    if (s) s.style.display = 'none';
    modal.style.display = 'flex';
}

function handleBuyPassSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    var form = e.target;
    var data = Object.fromEntries(new FormData(form).entries());
    var templateId = data.passTemplateId;
    var templates = (window.salonPokeData && window.salonPokeData.passTemplates) || [];
    var t = templates.find(function (x) { return x.id === templateId; });
    if (!t) { spToast('Pass template not found', 'error'); return false; }
    if (!data.name || !data.email) { spToast('Name and email are required', 'error'); return false; }

    var now = new Date();
    var expires = null;
    if (t.validityDays && t.validityDays > 0) {
        expires = new Date(now.getTime() + t.validityDays * 86400000).toISOString();
    }

    var sb2 = window.salonPokeData2;
    sb2.upsertCustomer({ email: data.email, name: data.name, phone: data.phone })
      .then(function (customer) {
        return sb2.createCustomerPass({
          customerId: customer.id,
          passTemplateId: t.id,
          visitsTotal: t.visitsTotal,
          visitsRemaining: t.visitsTotal,
          visitsUsed: 0,
          purchasedAt: now.toISOString(),
          expiresAt: expires,
          status: 'active',
          paymentStatus: 'pending',
          priceGbp: t.priceGbp
        });
      })
      .then(function () {
        form.style.display = 'none';
        var s = document.getElementById('buyPassSuccess');
        if (s) {
            s.innerHTML =
                '<div class="sp-success-icon">✓</div>' +
                '<h3>Pass reserved for ' + escapeHtmlLs(data.name) + '</h3>' +
                '<p>Your <b>' + escapeHtmlLs(t.name) + '</b> is logged in our system. Visit count: <b>' + t.visitsTotal + ' / ' + t.visitsTotal + '</b>.</p>' +
                '<p>We\'ll confirm payment within 24h. In the meantime you can already book a night and tick "Use my pass".</p>' +
                '<div class="sp-success-actions">' +
                    '<button class="btn btn-primary" onclick="document.getElementById(\'buyPassModal\').style.display=\'none\';">Done</button>' +
                    '<a href="#book" class="btn btn-ghost" onclick="document.getElementById(\'buyPassModal\').style.display=\'none\';">Book a night →</a>' +
                '</div>';
            s.style.display = '';
        }
      })
      .catch(function (err) {
        spToast('Error: ' + (err.message || err), 'error');
        console.error('[Buy Pass] Error:', err);
      });
    return false;
}

function escapeHtmlLs(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

// ============================================
// EMAIL / NOTIFICATION TEMPLATES
// ============================================
function nl2br(s) { return String(s || '').replace(/\n/g, '<br>'); }
function formatDateHuman(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function emailBookingConfirmation(booking) {
    var data = (window.salonPokeData || {});
    var sm = data.siteMeta || {};
    var schedule = data.schedule || [];
    var dayMap = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
    var night = dayMap[booking.night] || booking.night;
    var dayCfg = schedule.find(function (d) { return d.day && d.day.toLowerCase().slice(0,3) === booking.night; });
    var time = (dayCfg && dayCfg.startTime) ? dayCfg.startTime + ' – ' + (dayCfg.endTime || '') : '';
    var planLabels = { single: 'Single Pack (£8)', bundle: '3-Pack Bundle (£24)', box: 'Full Box', byo: 'BYO (£15)' };
    var plan = planLabels[booking.plan] || booking.plan;
    var customers = lsGetLs('salonPokeCustomers', []);
    var customer = customers.find(function (c) { return c.id === booking.customerId; });
    var name = customer ? customer.name : 'there';
    var passNote = booking.customerPassId ? '\n\n🎟️ You\'re using a Visit Pass — we\'ll deduct 1 visit when you attend.' : '';
    return 'Subject: Booking confirmed — ' + night + ' ' + booking.bookingDate + '\n\n' +
        'Hi ' + name + ',\n\n' +
        'Thanks for booking a seat at Salon Poke!\n\n' +
        '  Night:    ' + night + ' (' + booking.bookingDate + ')\n' +
        (time ? '  Time:     ' + time + '\n' : '') +
        '  Plan:     ' + plan + '\n' +
        '  Party:    ' + (booking.partySize || 1) + (booking.notes ? '\n  Notes:    ' + booking.notes : '') + '\n\n' +
        'Address: ' + (sm.address || '60A Park Row') + ', ' + (sm.city || 'Bristol') + ' ' + (sm.postcode || 'BS1 5LE') + '\n' +
        'Phone:   ' + (sm.phoneDisplay || '+44 117 555 0182') + '\n\n' +
        'Free cancellation up to 24h before. We\'ll send a reminder the day before.' +
        passNote + '\n\n' +
        'See you at the counter 🎴\n' +
        'Salon Poke';
}

function emailBookingReminder(booking) {
    var data = (window.salonPokeData || {});
    var sm = data.siteMeta || {};
    var customers = lsGetLs('salonPokeCustomers', []);
    var customer = customers.find(function (c) { return c.id === booking.customerId; });
    var name = customer ? customer.name.split(' ')[0] : 'there';
    var dayMap = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
    return 'Subject: Reminder — your seat is reserved for tomorrow\n\n' +
        'Hi ' + name + ',\n\n' +
        'Just a quick reminder — your seat at Salon Poke is reserved for:\n\n' +
        '  ' + (dayMap[booking.night] || booking.night) + ' ' + booking.bookingDate + '\n\n' +
        'Address: ' + (sm.address || '60A Park Row') + ', ' + (sm.city || 'Bristol') + ' ' + (sm.postcode || 'BS1 5LE') + '\n' +
        'Doors: see Schedule page for this night\'s start time.\n\n' +
        'Need to cancel? Reply to this email at least 24h ahead.\n\n' +
        'See you tomorrow 🎴\n' +
        'Salon Poke';
}

function emailPassPurchase(pass, customer) {
    var data = (window.salonPokeData || {});
    var templates = data.passTemplates || [];
    var t = templates.find(function (x) { return x.id === pass.passTemplateId; });
    var tName = t ? t.name : 'Visit Pass';
    var exp = pass.expiresAt ? 'Valid until: ' + pass.expiresAt.slice(0, 10) : 'No expiry';
    return 'Subject: Welcome to Salon Poke — your ' + tName + '\n\n' +
        'Hi ' + (customer ? customer.name.split(' ')[0] : 'there') + ',\n\n' +
        'Your ' + tName + ' is active!\n\n' +
        '  Visits:    ' + pass.visitsTotal + ' (use any time on any themed night)\n' +
        '  ' + exp + '\n\n' +
        'Book any night on our site, tick "Use my Visit Pass", and we deduct 1 visit when you attend.\n\n' +
        'View your account anytime via the Member Center on our site.\n\n' +
        'See you at the counter 🎴\n' +
        'Salon Poke';
}

function emailPreorderConfirmation(reservation) {
    var data = (window.salonPokeData || {});
    var sm = data.siteMeta || {};
    var customers = lsGetLs('salonPokeCustomers', []);
    var customer = customers.find(function (c) { return c.id === reservation.customerId; });
    var name = customer ? customer.name.split(' ')[0] : 'there';
    return 'Subject: Pre-order reserved — ' + reservation.itemName + '\n\n' +
        'Hi ' + name + ',\n\n' +
        'Your pre-order is locked in:\n\n' +
        '  Item:      ' + reservation.itemName + (reservation.itemCode ? ' (' + reservation.itemCode + ')' : '') + '\n' +
        '  Quantity:  ' + (reservation.quantity || 1) + '\n' +
        '  Deposit:   £' + reservation.depositPaid + '\n' +
        '  Pay rest:  on pickup day\n\n' +
        'We\'ll email you again when the box lands. Cancel up to 7 days before release for a full refund.\n\n' +
        'Salon Poke';
}

function emailPassExpiryWarning(pass, customer) {
    var data = (window.salonPokeData || {});
    var templates = data.passTemplates || [];
    var t = templates.find(function (x) { return x.id === pass.passTemplateId; });
    var tName = t ? t.name : 'Visit Pass';
    return 'Subject: Heads up — your ' + tName + ' expires soon\n\n' +
        'Hi ' + (customer ? customer.name.split(' ')[0] : 'there') + ',\n\n' +
        'You\'ve got ' + pass.visitsRemaining + ' visit' + (pass.visitsRemaining === 1 ? '' : 's') + ' left on your ' + tName + ',\n' +
        'and it expires on ' + (pass.expiresAt ? pass.expiresAt.slice(0, 10) : 'soon') + '.\n\n' +
        'Book a night soon to use them up: ' + window.location.origin + '#passes\n\n' +
        'Cheers,\nSalon Poke';
}

// Open mailto with pre-filled email
function sendEmail(to, subject, body) {
    var mailto = 'mailto:' + encodeURIComponent(to) +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
    window.open(mailto, '_blank', 'noopener');
}

// WhatsApp message
function sendWhatsApp(phoneRaw, message) {
    var url = 'https://wa.me/' + phoneRaw + '?text=' + encodeURIComponent(message);
    window.open(url, '_blank', 'noopener');
}

// ============================================
// STYLED TOAST + CONFIRM (replaces alert/confirm)
// ============================================
function spToast(message, kind) {
    kind = kind || 'info'; // info / success / error
    var existing = document.getElementById('spToast');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.id = 'spToast';
    el.className = 'sp-toast sp-toast-' + kind;
    el.textContent = message;
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
    setTimeout(function () {
        el.classList.add('sp-toast-out');
        setTimeout(function () { el.remove(); }, 300);
    }, 3000);
}

function spConfirm(message, onYes, onNo) {
    var existing = document.getElementById('spConfirm');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.id = 'spConfirm';
    el.className = 'sp-confirm';
    el.setAttribute('role', 'alertdialog');
    el.innerHTML =
        '<div class="sp-confirm-backdrop" data-confirm-no="1"></div>' +
        '<div class="sp-confirm-box">' +
            '<p>' + escapeHtmlLs(message) + '</p>' +
            '<div class="sp-confirm-actions">' +
                '<button class="btn btn-ghost btn-sm" data-confirm-no="1">Cancel</button>' +
                '<button class="btn btn-primary btn-sm" data-confirm-yes="1">OK</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(el);
    function done(result) {
        el.remove();
        if (result && onYes) onYes();
        if (!result && onNo) onNo();
    }
    el.querySelector('[data-confirm-yes]').addEventListener('click', function () { done(true); });
    el.querySelector('[data-confirm-no]').addEventListener('click', function () { done(false); });
    el.querySelector('.sp-confirm-backdrop').addEventListener('click', function () { done(false); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') done(false); if (e.key === 'Enter') done(true); });
    setTimeout(function () { el.querySelector('[data-confirm-yes]').focus(); }, 50);
}

function spPrompt(message, defaultValue, onOk) {
    var existing = document.getElementById('spPrompt');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.id = 'spPrompt';
    el.className = 'sp-confirm';
    el.setAttribute('role', 'alertdialog');
    el.innerHTML =
        '<div class="sp-confirm-backdrop" data-prompt-no="1"></div>' +
        '<div class="sp-confirm-box">' +
            '<p>' + escapeHtmlLs(message) + '</p>' +
            '<input type="text" class="form-input" id="spPromptInput" value="' + escapeHtmlLs(defaultValue || '') + '">' +
            '<div class="sp-confirm-actions">' +
                '<button class="btn btn-ghost btn-sm" data-prompt-no="1">Cancel</button>' +
                '<button class="btn btn-primary btn-sm" data-prompt-yes="1">OK</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(el);
    function done(result) {
        if (result) {
            var v = document.getElementById('spPromptInput').value;
            el.remove();
            if (onOk) onOk(v);
        } else {
            el.remove();
        }
    }
    el.querySelector('[data-prompt-yes]').addEventListener('click', function () { done(true); });
    el.querySelector('[data-prompt-no]').addEventListener('click', function () { done(false); });
    el.querySelector('.sp-confirm-backdrop').addEventListener('click', function () { done(false); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') done(false); if (e.key === 'Enter') done(true); });
    setTimeout(function () { document.getElementById('spPromptInput').focus(); document.getElementById('spPromptInput').select(); }, 50);
}

// ============================================
// CUSTOMER SELF-SERVICE PORTAL
// (used by Member Center on public site)
// ============================================
var customerPortal = {
    findByEmail: function (email) {
        // Use Supabase data layer if available
        if (window.salonPokeData2 && window.salonPokeData2.customerPortal) {
            return window.salonPokeData2.customerPortal.findByEmail(email);
        }
        email = (email || '').trim().toLowerCase();
        if (!email) return null;
        var customers = lsGetLs(KEY_CUSTOMERS_LS, []);
        var c = customers.find(function (x) { return x.email === email; });
        if (!c) return null;
        return {
            customer: c,
            bookings: lsGetLs(KEY_BOOKINGS_LS, []).filter(function (b) { return b.customerId === c.id; }),
            passes: lsGetLs(KEY_CUSTOMER_PASSES_LS, []).filter(function (p) { return p.customerId === c.id; }),
            preorders: lsGetLs('salonPokePreorderReservations', []).filter(function (r) { return r.customerId === c.id; })
        };
    },
    cancelBooking: function (bookingId, email) {
        if (window.salonPokeData2 && window.salonPokeData2.customerPortal) {
            return window.salonPokeData2.customerPortal.cancelBooking(bookingId, email);
        }
        email = (email || '').trim().toLowerCase();
        var bookings = lsGetLs(KEY_BOOKINGS_LS, []);
        var b = bookings.find(function (x) { return x.id === bookingId; });
        if (!b) return { ok: false, error: 'Booking not found' };
        var customers = lsGetLs(KEY_CUSTOMERS_LS, []);
        var c = customers.find(function (x) { return x.id === b.customerId; });
        if (!c || c.email !== email) return { ok: false, error: 'Email does not match this booking' };
        if (b.status === 'cancelled') return { ok: false, error: 'Booking is already cancelled' };
        if (b.status === 'attended') return { ok: false, error: 'Cannot cancel — you already attended this night' };
        if (b.status === 'no_show') return { ok: false, error: 'Cannot cancel a no-show record' };
        b.status = 'cancelled';
        b.cancelledAt = new Date().toISOString();
        b.cancelledBy = 'customer';
        lsSetLs(KEY_BOOKINGS_LS, bookings);
        return { ok: true };
    },
    rescheduleBooking: function (bookingId, email, newDate, newNight) {
        if (window.salonPokeData2 && window.salonPokeData2.customerPortal) {
            return window.salonPokeData2.customerPortal.rescheduleBooking(bookingId, email, newDate, newNight);
        }
        email = (email || '').trim().toLowerCase();
        var bookings = lsGetLs(KEY_BOOKINGS_LS, []);
        var b = bookings.find(function (x) { return x.id === bookingId; });
        if (!b) return { ok: false, error: 'Booking not found' };
        var customers = lsGetLs(KEY_CUSTOMERS_LS, []);
        var c = customers.find(function (x) { return x.id === b.customerId; });
        if (!c || c.email !== email) return { ok: false, error: 'Email does not match this booking' };
        if (b.status !== 'pending' && b.status !== 'confirmed') {
            return { ok: false, error: 'Cannot reschedule a ' + b.status + ' booking' };
        }
        if (!newDate) return { ok: false, error: 'New date required' };
        var blocked = lsGetLs('salonPokeBlockedDates', []).find(function (x) { return x.date === newDate; });
        if (blocked) return { ok: false, error: 'New date is blocked' };
        b.bookingDate = newDate;
        b.night = newNight || b.night;
        b.rescheduledAt = new Date().toISOString();
        b.rescheduledBy = 'customer';
        lsSetLs(KEY_BOOKINGS_LS, bookings);
        return { ok: true };
    },
    cancelPreorder: function (resId, email) {
        if (window.salonPokeData2 && window.salonPokeData2.customerPortal) {
            return window.salonPokeData2.customerPortal.cancelPreorder(resId, email);
        }
        email = (email || '').trim().toLowerCase();
        var list = lsGetLs('salonPokePreorderReservations', []);
        var r = list.find(function (x) { return x.id === resId; });
        if (!r) return { ok: false, error: 'Pre-order not found' };
        var customers = lsGetLs(KEY_CUSTOMERS_LS, []);
        var c = customers.find(function (x) { return x.id === r.customerId; });
        if (!c || c.email !== email) return { ok: false, error: 'Email does not match this reservation' };
        if (r.status !== 'reserved') return { ok: false, error: 'Pre-order is ' + r.status };
        r.status = 'cancelled';
        r.cancelledAt = new Date().toISOString();
        r.cancelledBy = 'customer';
        lsSetLs('salonPokePreorderReservations', list);
        return { ok: true };
    },
    downloadBookingIcs: function (bookingId, email) {
        email = (email || '').trim().toLowerCase();
        var bookings = lsGetLs(KEY_BOOKINGS_LS, []);
        var b = bookings.find(function (x) { return x.id === bookingId; });
        if (!b) return;
        var customers = lsGetLs(KEY_CUSTOMERS_LS, []);
        var c = customers.find(function (x) { return x.id === b.customerId; });
        if (!c || c.email !== email) return;
        var data = window.salonPokeData || {};
        var sm = data.siteMeta || {};
        var schedule = data.schedule || [];
        var dayCfg = schedule.find(function (d) { return d.day && d.day.toLowerCase().slice(0, 3) === b.night; });
        var startTime = (dayCfg && dayCfg.startTime) || '19:00';
        var endTime = (dayCfg && dayCfg.endTime) || '22:00';
        var dateStr = b.bookingDate.replace(/-/g, '');
        var ics = [
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
        var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'salonpoke-' + b.bookingDate + '.ics';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
window.salonPokeCustomerPortal = customerPortal;

// ----- Member center: lookup by email -----
function openMemberCenter() {
    var modal = document.getElementById('memberCenterModal');
    if (!modal) return;
    var f = document.getElementById('memberLookupForm');
    if (f) f.style.display = '';
    var r = document.getElementById('memberCenterResult');
    if (r) r.style.display = 'none';
    modal.style.display = 'flex';
    setTimeout(function () {
        var e = document.getElementById('memberEmail');
        if (e) e.focus();
    }, 100);
}

function handleMemberLookup(e) {
    if (e && e.preventDefault) e.preventDefault();
    var form = e.target;
    var email = (form.email.value || '').trim().toLowerCase();
    if (!email || email.indexOf('@') < 1) { alert('Please enter a valid email'); return false; }

    var customers = lsGetLs(KEY_CUSTOMERS_LS, []);
    var customer = customers.find(function (c) { return c.email === email; });
    if (!customer) {
        var r = document.getElementById('memberCenterResult');
        r.innerHTML = '<div class="sp-empty"><p>No account found for <b>' + escapeHtmlLs(email) + '</b>.</p>' +
            '<p>Buy a pass or make a booking first — accounts are created automatically.</p>' +
            '<a href="#passes" class="btn btn-primary" onclick="document.getElementById(\'memberCenterModal\').style.display=\'none\';">Buy a pass →</a></div>';
        r.style.display = '';
        form.style.display = 'none';
        return false;
    }

    var passes = lsGetLs(KEY_CUSTOMER_PASSES_LS, []).filter(function (p) { return p.customerId === customer.id; });
    var bookings = lsGetLs(KEY_BOOKINGS_LS, []).filter(function (b) { return b.customerId === customer.id; });
    var reservations = lsGetLs('salonPokePreorderReservations', []).filter(function (r) { return r.customerId === customer.id; });
    var templates = (window.salonPokeData && window.salonPokeData.passTemplates) || [];
    var tMap = {};
    templates.forEach(function (t) { tMap[t.id] = t; });
    var dayNames = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

    var html = '<div class="mc-account-head">' +
        '<div class="mc-name">' + escapeHtmlLs(customer.name) + '</div>' +
        '<div class="mc-email">' + escapeHtmlLs(customer.email) + '</div>' +
    '</div>';

    html += '<h4>Your Passes (' + passes.length + ')</h4>';
    if (passes.length === 0) {
        html += '<p class="sp-empty-inline">No passes yet. <a href="#passes" onclick="document.getElementById(\'memberCenterModal\').style.display=\'none\';">Buy one →</a></p>';
    } else {
        html += passes.map(function (p) {
            var t = tMap[p.passTemplateId] || { name: '(deleted)' };
            var exp = p.expiresAt ? ' · expires ' + p.expiresAt.slice(0, 10) : '';
            return '<div class="mc-pass mc-pass-' + p.status + '">' +
                '<div class="mc-pass-name"><b>' + escapeHtmlLs(t.name) + '</b></div>' +
                '<div class="mc-pass-progress">' + p.visitsRemaining + ' / ' + p.visitsTotal + ' visits left</div>' +
                '<div class="mc-pass-meta">' + p.status + exp + '</div>' +
            '</div>';
        }).join('');
    }

    // Pre-orders section
    if (preservations.length > 0) {
        html += '<h4>Your Pre-Orders (' + reservations.length + ')</h4>';
        html += '<div class="mc-pres">' + reservations.map(function (r) {
            var actions = r.status === 'reserved'
                ? '<button class="mc-bk-btn mc-bk-btn-danger" data-mc-cancel-pre="' + r.id + '">✕ Cancel reservation</button>'
                : '';
            return '<div class="mc-pre mc-pre-' + r.status + '">' +
                '<div><b>' + escapeHtmlLs(r.itemName) + '</b> ' + (r.itemCode ? '· ' + escapeHtmlLs(r.itemCode) : '') + '</div>' +
                '<div class="mc-bk-meta">' + (r.quantity || 1) + ' box' + ((r.quantity || 1) > 1 ? 'es' : '') + ' · £' + r.depositPaid + ' deposit · <span class="mc-bk-status">' + r.status + '</span></div>' +
                (actions ? '<div class="mc-bk-actions">' + actions + '</div>' : '') +
            '</div>';
        }).join('') + '</div>';
    }

    html += '<h4>Your Bookings (' + bookings.length + ')</h4>';
    if (bookings.length === 0) {
        html += '<p class="sp-empty-inline">No bookings yet.</p>';
    } else {
        // Sort: future/upcoming first, then past
        var todayStr = new Date().toISOString().slice(0, 10);
        bookings.sort(function (a, b) {
            var aActive = (a.status === 'pending' || a.status === 'confirmed') && a.bookingDate >= todayStr;
            var bActive = (b.status === 'pending' || b.status === 'confirmed') && b.bookingDate >= todayStr;
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;
            if (aActive && bActive) return a.bookingDate.localeCompare(b.bookingDate);
            return b.bookingDate.localeCompare(a.bookingDate);
        });
        html += '<div class="mc-bookings">' + bookings.map(function (b) {
            var isUpcoming = (b.status === 'pending' || b.status === 'confirmed') && b.bookingDate >= todayStr;
            var canReschedule = b.status === 'pending' || b.status === 'confirmed';
            var canCancel = b.status === 'pending' || b.status === 'confirmed';
            var canIcs = b.status === 'confirmed';
            var actions = '';
            if (canReschedule) actions += '<button class="mc-bk-btn" data-mc-reschedule="' + b.id + '">↻ Reschedule</button>';
            if (canIcs) actions += '<button class="mc-bk-btn" data-mc-ics="' + b.id + '">📅 Add to Calendar</button>';
            if (canCancel) actions += '<button class="mc-bk-btn mc-bk-btn-danger" data-mc-cancel="' + b.id + '">✕ Cancel</button>';
            return '<div class="mc-bk mc-bk-' + b.status + (isUpcoming ? ' mc-bk-upcoming' : '') + '">' +
                '<div><b>' + (dayNames[b.night] || b.night) + '</b> ' + b.bookingDate + '</div>' +
                '<div class="mc-bk-meta">' + b.plan + ' · party of ' + (b.partySize || 1) + ' · <span class="mc-bk-status">' + b.status + '</span>' + (b.customerPassId ? ' · 🎟️' : '') + '</div>' +
                (actions ? '<div class="mc-bk-actions">' + actions + '</div>' : '') +
            '</div>';
        }).join('') + '</div>';
    }

    var r = document.getElementById('memberCenterResult');
    r.innerHTML = html;
    r.style.display = '';
    form.style.display = 'none';

    // Wire up self-service buttons
    r.querySelectorAll('[data-mc-cancel]').forEach(function (b) {
        b.addEventListener('click', function () {
            if (!confirm('Cancel this booking?')) return;
            Promise.resolve(customerPortal.cancelBooking(b.getAttribute('data-mc-cancel'), email))
              .then(function (res) {
                if (!res.ok) { alert(res.error); return; }
                alert('✓ Booking cancelled. Your seat is released.');
                handleMemberLookup({ preventDefault: function(){}, target: { email: { value: email } } });
              });
        });
    });
    r.querySelectorAll('[data-mc-reschedule]').forEach(function (b) {
        b.addEventListener('click', function () {
            var newDate = prompt('New date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
            if (!newDate) return;
            Promise.resolve(customerPortal.rescheduleBooking(b.getAttribute('data-mc-reschedule'), email, newDate))
              .then(function (res) {
                if (!res.ok) { alert(res.error); return; }
                alert('✓ Rescheduled to ' + newDate);
                handleMemberLookup({ preventDefault: function(){}, target: { email: { value: email } } });
              });
        });
    });
    r.querySelectorAll('[data-mc-ics]').forEach(function (b) {
        b.addEventListener('click', function () {
            customerPortal.downloadBookingIcs(b.getAttribute('data-mc-ics'), email);
        });
    });
    r.querySelectorAll('[data-mc-cancel-pre]').forEach(function (b) {
        b.addEventListener('click', function () {
            if (!confirm('Cancel this pre-order? Refund terms depend on release date — please contact us for the refund.')) return;
            Promise.resolve(customerPortal.cancelPreorder(b.getAttribute('data-mc-cancel-pre'), email))
              .then(function (res) {
                if (!res.ok) { alert(res.error); return; }
                alert('✓ Pre-order cancelled.');
                handleMemberLookup({ preventDefault: function(){}, target: { email: { value: email } } });
              });
        });
    });

    return false;
}

// ----- Newsletter: real handler (mailto to admin + localStorage) -----
function handleNewsletterReal(e) {
    if (e && e.preventDefault) e.preventDefault();
    var form = (e && e.target) || document.querySelector('.newsletter-form');
    if (!form) return;
    var input = form.querySelector('input[type="email"]');
    var btn = form.querySelector('button[type="submit"]');
    var email = (input && input.value || '').trim();
    if (!email || email.indexOf('@') < 1) {
        if (input) input.focus();
        return false;
    }
    var orig = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Subscribing…'; btn.disabled = true; }

    // Save subscriber locally
    try {
        var subs = JSON.parse(localStorage.getItem('salonpoke.subscribers') || '[]');
        if (subs.indexOf(email) < 0) { subs.push(email); localStorage.setItem('salonpoke.subscribers', JSON.stringify(subs)); }
    } catch (err) {}

    // Email notify admin
var mailto = 'mailto:hello@salonpoke.co.uk?subject=' + encodeURIComponent('Newsletter signup: ' + email) + '&body=' + encodeURIComponent('New newsletter subscriber:\n' + email + '\n\nTimestamp: ' + new Date().toISOString());
    setTimeout(function () {
        if (btn) { btn.textContent = 'Subscribed ✓'; btn.style.background = 'linear-gradient(135deg, #4ddb8e, #2eb872)'; }
        if (input) input.value = '';
        setTimeout(function () {
            if (btn) { btn.textContent = orig; btn.disabled = false; btn.style.background = ''; }
        }, 3000);
        // Optionally open email (comment out to be less intrusive)
        // window.location.href = mailto;
    }, 600);
    return false;
}

// Replace the simulated handlers with real ones
if (window.salonPoke) {
    window.salonPoke.handleBooking = handleBookingReal;
    window.salonPoke.handleNewsletter = handleNewsletterReal;
    window.salonPoke.openBuyPassModal = openBuyPassModal;
    window.salonPoke.openMemberCenter = openMemberCenter;
    window.salonPoke.updateUsePassOptions = updateUsePassOptionsLs;
}
// Also rebind via attribute (in case onsubmit fired before this script ran)
document.querySelectorAll('form.book-form, form.newsletter-form').forEach(function (f) {
    f.onsubmit = null;
});
// Rebind buy pass + member lookup + preorder forms
document.querySelectorAll('form#buyPassForm, form#memberLookupForm, form#preorderForm').forEach(function (f) {
    f.onsubmit = null;
    if (f.id === 'buyPassForm') f.addEventListener('submit', handleBuyPassSubmit);
    if (f.id === 'memberLookupForm') f.addEventListener('submit', handleMemberLookup);
    if (f.id === 'preorderForm') f.addEventListener('submit', handlePreorderReservation);
});

// Wire booking form's email field to update pass options as user types
var bookingEmailEl = document.querySelector('#bookingForm input[name="email"]');
if (bookingEmailEl) {
    bookingEmailEl.addEventListener('input', updateUsePassOptionsLs);
    bookingEmailEl.addEventListener('blur', updateUsePassOptionsLs);
}

// Wire up "Open Member Center" buttons (multiple entry points: passes section, nav, footer)
document.querySelectorAll('#openMemberCenterBtn, #openMemberCenterNavBtn, #openMemberCenterNavBtnMobile, #openMemberCenterFooterBtn, [data-open-member-center]').forEach(function (b) {
    b.addEventListener('click', function (e) {
        e.preventDefault();
        openMemberCenter();
        // Close mobile menu if open
        var links = document.getElementById('navLinks');
        if (links && links.classList.contains('is-open')) {
            links.classList.remove('is-open');
        }
    });
});

// Wire up modal close buttons
document.querySelectorAll('[data-sp-modal-close]').forEach(function (el) {
    el.addEventListener('click', function () {
        var m = el.closest('.sp-modal');
        if (m) m.style.display = 'none';
    });
});

// Close sp-modal on Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.sp-modal').forEach(function (m) { m.style.display = 'none'; });
    }
});

// ----- Pre-order countdown timer -----
function renderPreorderCountdowns(data) {
    if (!data || !data.preorder) return;
    var now = new Date();
    data.preorder.forEach(function (p) {
        var card = document.querySelector('[data-preorder-id="' + p.id + '"]');
        if (!card) return;
        var counterEl = card.querySelector('[data-preorder-countdown]');
        if (!counterEl) return;
        // Try to parse releaseDate
        var parts = (p.releaseDate || '').split(' ');
        var day = parseInt(parts[0], 10);
        var monthMap = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
        var mon = parts[1] ? monthMap[parts[1]] : null;
        var yr = parts[2] ? parseInt(parts[2], 10) : now.getFullYear();
        if (isNaN(day) || mon === null || isNaN(yr)) return;
        var release = new Date(yr, mon, day, 9, 0, 0);
        var diff = release - now;
        function tick() {
            var d = release - new Date();
            if (d <= 0) { counterEl.textContent = 'Released!'; counterEl.classList.add('is-released'); return; }
            var days = Math.floor(d / 86400000);
            var hours = Math.floor((d % 86400000) / 3600000);
            var mins = Math.floor((d % 3600000) / 60000);
            counterEl.textContent = 'Drops in ' + days + 'd ' + hours + 'h ' + mins + 'm';
        }
        tick();
        if (!card._preorderTimer) card._preorderTimer = setInterval(tick, 60000);
    });
}

// Update active nav indicator to use class instead of inline style
(function () {
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.nav-links a');
    if (!sections.length || !navLinks.length) return;
    function update() {
        var scrollPos = window.pageYOffset + 200;
        var current = '';
        sections.forEach(function (s) { if (scrollPos >= s.offsetTop) current = s.id; });
        navLinks.forEach(function (link) {
            if (link.getAttribute('href') === '#' + current) link.classList.add('is-active');
            else link.classList.remove('is-active');
        });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
})();

// Update renderPreorder to add data-preorder-id and countdown element
(function () {
    var orig = window.renderPreorder;
    window.renderPreorder = function (items, deposit) {
        if (orig) orig(items, deposit);
        // After render, attach data-preorder-id and inject countdown slot
        var grid = document.getElementById('preorderGrid');
        if (!grid) return;
        var cards = grid.querySelectorAll('.preorder-card');
        for (var i = 0; i < cards.length && i < items.length; i++) {
            cards[i].setAttribute('data-preorder-id', items[i].id);
            if (!cards[i].querySelector('[data-preorder-countdown]')) {
                var cd = document.createElement('div');
                cd.className = 'preorder-countdown';
                cd.setAttribute('data-preorder-countdown', '');
                cards[i].appendChild(cd);
            }
        }
        if (typeof renderPreorderCountdowns === 'function') renderPreorderCountdowns({ preorder: items });
    };
})();
