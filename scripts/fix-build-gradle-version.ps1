$p = 'C:\xampp\htdocs\Tawbah-Ai-master\artifacts\tawbah-web\android\app\build.gradle'

# Read as UTF-8 (strip BOM if present)
$bytes = [System.IO.File]::ReadAllBytes($p)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
  $newBytes = New-Object byte[] ($bytes.Length - 3)
  [System.Array]::Copy($bytes, 3, $newBytes, 0, $bytes.Length - 3)
  $bytes = $newBytes
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
$c = $utf8.GetString($bytes)

# Fix escaped quotes in versionName (e.g. versionName \"1.0.3\")
$c = [regex]::Replace($c, 'versionName\s+\\"([^\\"]+)\\"', 'versionName "$1"')

# Also guard against any stray backslashes around normal versionName
$c = [regex]::Replace($c, 'versionName\s+\\"([^"]+)"', 'versionName "$1"')

# Write back WITHOUT BOM
[System.IO.File]::WriteAllBytes($p, $utf8.GetBytes($c))

Write-Host 'Sanitized versionName line:'
Select-String -Path $p -Pattern 'versionCode|versionName' | Select-Object -First 10 | ForEach-Object { $_.Line }
