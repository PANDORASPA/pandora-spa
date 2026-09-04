# Salon Poke — Weekly Backup Script
# Run this weekly. Saves JSON snapshots of all data tables to ./backups/

param(
    [string]$Token = $env:SUPABASE_ACCESS_TOKEN
)

if (-not $Token) {
    Write-Host "ERROR: Set SUPABASE_ACCESS_TOKEN env var or pass -Token parameter" -ForegroundColor Red
    Write-Host "Get a token at: https://supabase.com/dashboard/account/tokens" -ForegroundColor Yellow
    exit 1
}

$projectRef = "ekyjvgkdagpolrosqogd"
$apiBase = "https://api.supabase.com/v1/projects/$projectRef/database/query"
$dateStr = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = ".\backups\$dateStr"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$tables = @(
    @{ name = "customers"; table = "customers" },
    @{ name = "bookings"; table = "bookings" },
    @{ name = "customer_passes"; table = "customer_passes" },
    @{ name = "preorder_reservations"; table = "preorder_reservations" },
    @{ name = "blocked_dates"; table = "blocked_dates" },
    @{ name = "newsletter_subscribers"; table = "newsletter_subscribers" }
)

Write-Host "=== Salon Poke Weekly Backup ===" -ForegroundColor Cyan
Write-Host "Date: $dateStr"
Write-Host "Output: $backupDir"
Write-Host ""

$totalRows = 0
foreach ($t in $tables) {
    $body = '{"query":"select * from ' + $t.table + ' order by created_at desc limit 10000"}'
    try {
        $r = Invoke-WebRequest -Uri $apiBase -Method Post -ContentType "application/json" -Headers @{"Authorization" = "Bearer $Token"} -Body $body
        $data = $r.Content
        $count = ($data | ConvertFrom-Json).Count
        $totalRows += $count
        $data | Out-File "$backupDir\$($t.name).json" -Encoding UTF8
        Write-Host "  $($t.name): $count rows" -ForegroundColor Green
    } catch {
        Write-Host "  $($t.name): FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Total: $totalRows rows backed up" -ForegroundColor Green
Write-Host "Done. Backups are in: $backupDir" -ForegroundColor Cyan
