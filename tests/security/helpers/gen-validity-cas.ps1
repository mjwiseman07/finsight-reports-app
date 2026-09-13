param(
  [Parameter(Mandatory = $true)][string]$OutDir
)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Export-CertPem([System.Security.Cryptography.X509Certificates.X509Certificate2]$cert, [string]$path) {
  $b64 = [Convert]::ToBase64String($cert.RawData)
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("-----BEGIN CERTIFICATE-----")
  for ($i = 0; $i -lt $b64.Length; $i += 64) {
    $len = [Math]::Min(64, $b64.Length - $i)
    [void]$sb.AppendLine($b64.Substring($i, $len))
  }
  [void]$sb.AppendLine("-----END CERTIFICATE-----")
  [IO.File]::WriteAllText($path, $sb.ToString())
}

$expired = New-SelfSignedCertificate -Subject "CN=ExpiredCA" -KeyExportPolicy Exportable `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -NotBefore (Get-Date).AddDays(-30) -NotAfter (Get-Date).AddDays(-1) `
  -KeyLength 2048 -HashAlgorithm SHA256 -KeyUsage CertSign `
  -TextExtension @("2.5.29.19={critical}{text}ca=true")

$future = New-SelfSignedCertificate -Subject "CN=FutureCA" -KeyExportPolicy Exportable `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -NotBefore (Get-Date).AddDays(5) -NotAfter (Get-Date).AddDays(30) `
  -KeyLength 2048 -HashAlgorithm SHA256 -KeyUsage CertSign `
  -TextExtension @("2.5.29.19={critical}{text}ca=true")

Export-CertPem $expired (Join-Path $OutDir "expired-ca.crt")
Export-CertPem $future (Join-Path $OutDir "future-ca.crt")
Write-Output "OK"
