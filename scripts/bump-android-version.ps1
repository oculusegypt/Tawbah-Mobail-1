$p = 'C:\xampp\htdocs\Tawbah-Ai-master\artifacts\tawbah-web\android\app\build.gradle'

$c = Get-Content $p -Raw

# versionCode
$c = [regex]::Replace($c, 'versionCode\s+\d+', 'versionCode 3')

# versionName
$c = [regex]::Replace($c, 'versionName\s+\"[^\"]+\"', 'versionName \"1.0.3\"')

Set-Content -Path $p -Value $c -Encoding utf8

Write-Host 'Updated version values:'
Select-String -Path $p -Pattern 'versionCode|versionName' | Select-Object -First 10 | ForEach-Object { $_.Line }
