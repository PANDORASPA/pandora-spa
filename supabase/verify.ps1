$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) {
    Write-Host "ERROR: Set SUPABASE_ACCESS_TOKEN env var first" -ForegroundColor Red
    exit 1
}
$apiBase = "https://api.supabase.com/v1/projects/ekyjvgkdagpolrosqogd/database/query"

function Sql {
    param([string]$Query)
    $body = '{"query":"' + ($Query -replace '\\', '\\' -replace '"', '\"' -replace "`r", '' -replace "`n", ' ') + '"}'
    try {
        $r = Invoke-WebRequest -Uri $apiBase -Method Post -ContentType "application/json" -Headers @{"Authorization" = "Bearer $token"} -Body $body
        $data = $r.Content | ConvertFrom-Json
        return $data
    } catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $stream = $resp.GetResponseStream()
            $reader = [System.IO.StreamReader]::new($stream)
            return "ERR: " + $reader.ReadToEnd()
        }
        return "ERR: " + $_.Exception.Message
    }
}

Write-Host "=== Schema verification ===" -ForegroundColor Cyan

$ptpl = Sql "select id, name, price_gbp::text from pass_templates order by sort_order"
Write-Host "`nPass templates: $($ptpl.Count) rows"
foreach ($p in $ptpl) { Write-Host "  $($p.id): $($p.name) - GBP $($p.price_gbp)" -ForegroundColor Green }

$prd = Sql "select id, name, price::text from products order by price desc"
Write-Host "`nProducts: $($prd.Count) rows"
foreach ($p in $prd) { Write-Host "  $($p.id): $($p.name) - GBP $($p.price)" -ForegroundColor Green }

$sch = Sql "select day, theme from schedule_days order by day_num"
Write-Host "`nSchedule: $($sch.Count) rows"
foreach ($s in $sch) { Write-Host "  $($s.day): $($s.theme)" -ForegroundColor Green }

$po = Sql "select id, name from preorder_items"
Write-Host "`nPre-order items: $($po.Count) rows"
foreach ($p in $po) { Write-Host "  $($p.id): $($p.name)" -ForegroundColor Green }

$ss = Sql "select id, admin_config::text from site_settings"
Write-Host "`nSite settings: $($ss.Count) rows"
foreach ($s in $ss) {
    Write-Host "  id: $($s.id)"
    Write-Host "  admin_config: $($s.admin_config)" -ForegroundColor Green
}

$cnt = Sql "select (select count(*) from customers)::int as customers, (select count(*) from bookings)::int as bookings, (select count(*) from customer_passes)::int as passes, (select count(*) from preorder_reservations)::int as pres"
Write-Host "`nRow counts:"
foreach ($c in $cnt) {
    Write-Host "  customers: $($c.customers)" -ForegroundColor Green
    Write-Host "  bookings: $($c.bookings)" -ForegroundColor Green
    Write-Host "  customer_passes: $($c.passes)" -ForegroundColor Green
    Write-Host "  preorder_reservations: $($c.pres)" -ForegroundColor Green
}

# Test function
Write-Host "`nFunction test (expect 'Booking not found' error):" -ForegroundColor Cyan
$fnTest = Sql "select mark_attended('00000000-0000-0000-0000-000000000000'::uuid, true)"
Write-Host "  Result: $fnTest"
