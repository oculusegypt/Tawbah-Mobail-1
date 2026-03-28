$p = 'C:\xampp\htdocs\Tawbah-Ai-master\artifacts\tawbah-web\android\app\build.gradle'

$bytes = [System.IO.File]::ReadAllBytes($p)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
  $newBytes = New-Object byte[] ($bytes.Length - 3)
  [System.Array]::Copy($bytes, 3, $newBytes, 0, $bytes.Length - 3)
  [System.IO.File]::WriteAllBytes($p, $newBytes)
  Write-Host 'BOM removed from build.gradle'
} else {
  Write-Host 'No BOM detected in build.gradle'
}
