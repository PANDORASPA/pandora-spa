# Salon Poke — Deployment Guide

## 1. Pre-Deployment Checklist

### Supabase
- [x] Project created (id: `ekyjvgkdagpolrosqogd`, region: us-west-2)
- [x] Schema migrated (12 tables, 3 RPC functions, RLS enabled, indexes)
- [x] Seed data loaded (3 pass templates, 6 products, 7 schedule days, 3 pre-order items, site settings)

### Security
- [ ] **CHANGE ADMIN PASSWORD** — go to https://salon-poke.vercel.app/admin.html → Settings → change password (must be ≥6 chars)
- [ ] Verify Supabase RLS is enabled on all tables (default)
- [ ] Confirm no service_role key in client code (use anon only)

### Environment
- [ ] Update `supabase-config.js` with production URL + anon key (if different from staging)
- [ ] Update `data.json` `siteMeta` with real address, phone, social URLs

### Testing
- [ ] Run all E2E tests in browser:
  1. Buy a pass
  2. Book a night using the pass
  3. Login to admin → Mark Attended → verify pass decremented
  4. Cancel a booking → verify pass refunded
  5. Pre-order a box
  6. Add a blocked date
  7. Try to book a blocked date → confirm dialog appears
  8. GDPR export + delete a customer
- [ ] Test on mobile (iOS + Android)
- [ ] Test in private/incognito (no localStorage)

## 2. Deploy to Vercel

```bash
cd "C:\Users\Administrator\.minimax-agent-cn\projects\salon_poke_website\dist"
vercel --prod
```

Or drag-and-drop the `dist/` folder to https://vercel.com/new

### Custom domain (optional)
- Vercel dashboard → Project → Settings → Domains → add `salonpoke.co.uk`
- DNS: CNAME `salonpoke.co.uk` → `cname.vercel-dns.com`

## 3. Post-Deployment Verification

Within 1 hour of going live:
- [ ] Open the live URL
- [ ] Verify it loads (no 404 / no errors in console)
- [ ] Make a test booking
- [ ] Login to admin → check it shows the test booking
- [ ] Sign up for newsletter
- [ ] Open Member Center → check it shows correctly
- [ ] View on mobile (https://search.google.com/test/mobile-friendly)

## 4. Google Search Console

1. Go to https://search.google.com/search-console
2. Add property (URL prefix)
3. Verify ownership (DNS TXT record or HTML file)
4. Submit sitemap: `https://salon-poke.vercel.app/sitemap.xml`

## 5. Monitoring

### Quick health check
```bash
curl -I https://salon-poke.vercel.app/
curl -I https://salon-poke.vercel.app/admin.html
curl https://salon-poke.vercel.app/data.json | head
```

### Supabase health check
1. https://supabase.com/dashboard/project/ekyjvgkdagpolrosqogd/database/tables
2. Verify all tables are present and have correct row counts
3. Check "API Logs" for errors

## 6. Backups

### Automated (Supabase)
- Supabase automatically backs up Pro plans daily
- Free plan: use manual exports (see below)

### Manual backup (run weekly)
```powershell
# Requires: a Supabase access token in env
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
$projectRef = "ekyjvgkdagpolrosqogd"
$apiBase = "https://api.supabase.com/v1/projects/$projectRef/database/query"

# Export each table to JSON
$tables = @("customers", "bookings", "customer_passes", "preorder_reservations", "blocked_dates", "newsletter_subscribers")
foreach ($table in $tables) {
    $body = '{"query":"select * from ' + $table + '"}'
    $r = Invoke-WebRequest -Uri $apiBase -Method Post -ContentType "application/json" -Headers @{"Authorization" = "Bearer $env:SUPABASE_ACCESS_TOKEN"} -Body $body
    $r.Content | Out-File "backup_$table.json"
}
```

## 7. Post-Launch Tasks (Week 1)

- [ ] Monitor for booking errors daily
- [ ] Check Supabase API logs for any 4xx/5xx
- [ ] Reply to first customer emails
- [ ] Test booking flow on real mobile devices
- [ ] Add Google Analytics / Plausible (optional)
- [ ] Set up email forwarding (hello@salonpoke.co.uk → real inbox)
- [ ] Update Google Business profile URL
- [ ] Add live link to Instagram bio

## 8. Emergency Rollback

If something breaks in production:
1. Vercel dashboard → Deployments → find last working deployment → "Promote to Production"
2. Rollback takes ~30 seconds
3. Notify any affected customers via WhatsApp broadcast

## 9. Common Issues

**Issue: "Failed to load data" on site**
- Check Supabase project is not paused (free tier pauses after 1 week inactivity)
- Check browser console for specific error
- Verify `supabase-config.js` has correct URL + key

**Issue: Admin can't login**
- Check `site_settings` table → `admin_config.password` field
- Or check localStorage `salonPokePassword` (per-browser override)

**Issue: Bookings not showing in admin**
- Refresh the page (loads from Supabase)
- Check Supabase `bookings` table directly

## 10. Scaling Notes

Current setup handles:
- ~10,000 monthly bookings (Supabase free tier)
- ~50,000 monthly visitors (Vercel free tier)
- ~500MB data (Supabase free tier)

To scale:
- Supabase Pro ($25/mo): 8GB DB, daily backups
- Vercel Pro ($20/mo): 1TB bandwidth, better analytics
