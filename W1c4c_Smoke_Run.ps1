# W1c.4c Smoke Runner
$Token = @'
PASTE-MWISEMAN-JWT-HERE
'@
$PreviewUrl       = "https://advisacor-6lg8xquym-advisacor.vercel.app"
$QboConnectionId  = "0858b9a0-9c7f-4899-bf4d-2e02f0b2063a"
$XeroConnectionId = "5550d2f4-a4c0-430e-a956-419cf20fb331"
$OutFile          = ".\W1c4c_smoke_results.json"

if ([string]::IsNullOrWhiteSpace($Token) -or $Token.Length -lt 100) {
    Write-Host "ERROR: Token missing or too short (length=$($Token.Length))." -ForegroundColor Red
    exit 1
}
Write-Host "Token accepted (length=$($Token.Length))." -ForegroundColor Green

$Headers = @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" }
$Results = @{
    preview_url = $PreviewUrl
    ran_at_utc  = (Get-Date).ToUniversalTime().ToString("o")
    calls       = @()
}

function Invoke-SmokeCall {
    param([string]$Label, [string]$Method, [string]$Url, [string]$Body)
    Write-Host ""
    Write-Host "==== $Label ====" -ForegroundColor Cyan
    Write-Host "$Method $Url"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $result = @{ label = $Label; method = $Method; url = $Url; request_body = $Body }
    try {
        if ($Method -eq "POST") {
            $resp = Invoke-WebRequest -Uri $Url -Method POST -Body $Body -Headers $Headers -UseBasicParsing -ErrorAction Stop
        } else {
            $resp = Invoke-WebRequest -Uri $Url -Method GET -Headers $Headers -UseBasicParsing -ErrorAction Stop
        }
        $sw.Stop()
        $result.status_code = [int]$resp.StatusCode
        $result.elapsed_ms = $sw.ElapsedMilliseconds
        $result.response_body = $resp.Content
        Write-Host "OK  status=$($resp.StatusCode)  elapsed=$($sw.ElapsedMilliseconds)ms" -ForegroundColor Green
        Write-Host $resp.Content
    } catch {
        $sw.Stop()
        $result.elapsed_ms = $sw.ElapsedMilliseconds
        $result.error = $_.Exception.Message
        if ($_.Exception.Response) {
            $result.status_code = [int]$_.Exception.Response.StatusCode
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $errBody = $reader.ReadToEnd()
                $result.response_body = $errBody
                Write-Host "FAIL status=$($result.status_code)  elapsed=$($sw.ElapsedMilliseconds)ms" -ForegroundColor Yellow
                Write-Host $errBody
            } catch {
                Write-Host "FAIL (could not read error body): $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "FAIL (no response): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    return $result
}

$qboBody = (@{ connection_id = $QboConnectionId; provider = "quickbooks" } | ConvertTo-Json -Compress)
$Results.calls += Invoke-SmokeCall -Label "1. QBO refresh POST" -Method "POST" -Url "$PreviewUrl/api/admin/write-boundary/refresh-accounts-cache" -Body $qboBody

$xeroBody = (@{ connection_id = $XeroConnectionId; provider = "xero" } | ConvertTo-Json -Compress)
$Results.calls += Invoke-SmokeCall -Label "2. Xero refresh POST" -Method "POST" -Url "$PreviewUrl/api/admin/write-boundary/refresh-accounts-cache" -Body $xeroBody

$Results.calls += Invoke-SmokeCall -Label "3. QBO history GET" -Method "GET" -Url "$PreviewUrl/api/admin/write-boundary/refresh-accounts-cache/history?connection_id=$QboConnectionId" -Body ""

$json = $Results | ConvertTo-Json -Depth 10
$json | Out-File -FilePath $OutFile -Encoding utf8

Write-Host ""
Write-Host "SUMMARY" -ForegroundColor Cyan
foreach ($c in $Results.calls) {
    $status = if ($c.status_code) { $c.status_code } else { "ERR" }
    Write-Host ("  [{0}] {1}  ({2}ms)" -f $status, $c.label, $c.elapsed_ms)
}
Write-Host "Full results written to: $OutFile" -ForegroundColor Green