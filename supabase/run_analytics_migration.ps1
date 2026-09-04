param([Parameter(Mandatory)][string]$Name,[Parameter(Mandatory)][string]$SqlFile)
$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) {
    Write-Host "ERROR: Set SUPABASE_ACCESS_TOKEN env var first" -ForegroundColor Red
    exit 1
}
$apiBase = "https://api.supabase.com/v1/projects/ekyjvgkdagpolrosqogd/database/query"
$sql = Get-Content $SqlFile -Raw -Encoding UTF8
$body = '{"query":"' + ($sql -replace '\\', '\\' -replace '"', '\"' -replace "`r", '' -replace "`n", ' ') + '"}'
Write-Host "=== $Name ===" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri $apiBase -Method Post -ContentType "application/json" -Headers @{"Authorization" = "Bearer $token"} -Body $body
    Write-Host "  OK (HTTP $($r.StatusCode))" -ForegroundColor Green
} catch {
    $resp = $_.Exception.Response
    if ($resp) { $reader = [System.IO.StreamReader]::new($resp.GetResponseStream()); Write-Host "  ERROR: $($reader.ReadToEnd())" -ForegroundColor Red }
}
