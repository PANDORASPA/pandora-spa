# Direct HTTP body approach to avoid JSON serialization issues
param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$SqlFile
)

$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) {
    Write-Host "ERROR: Set SUPABASE_ACCESS_TOKEN env var first" -ForegroundColor Red
    exit 1
}
$apiBase = "https://api.supabase.com/v1/projects/ekyjvgkdagpolrosqogd/database/query"

$sql = Get-Content $SqlFile -Raw -Encoding UTF8
# Escape for JSON: backslashes, double quotes, control chars
$sqlEscaped = $sql -replace '\\', '\\' -replace '"', '\"' -replace "`r", '' -replace "`n", '\n' -replace "`t", '\t'
$body = '{"query":"' + $sqlEscaped + '"}'

Write-Host "=== $Name ===" -ForegroundColor Cyan
Write-Host "SQL size: $($sql.Length) bytes, Body size: $($body.Length) bytes"

try {
    $response = Invoke-WebRequest -Uri $apiBase -Method Post -ContentType "application/json" -Headers @{
        "Authorization" = "Bearer $token"
    } -Body $body
    Write-Host "  OK (HTTP $($response.StatusCode))" -ForegroundColor Green
    return $true
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    $resp = $_.Exception.Response
    if ($resp) {
        $stream = $resp.GetResponseStream()
        $reader = [System.IO.StreamReader]::new($stream)
        $body2 = $reader.ReadToEnd()
        Write-Host "  Response: $body2" -ForegroundColor Yellow
    }
    return $false
}
