$dist = 'C:\xampp\htdocs\Tawbah-Ai-master\artifacts\tawbah-web\dist\public'
$assets = 'C:\xampp\htdocs\Tawbah-Ai-master\artifacts\tawbah-web\android\app\src\main\assets\public'

function ScanPath([string]$path) {
  Write-Host "PATH=$path"
  if (!(Test-Path $path)) {
    Write-Host "MISSING"
    return
  }

  $files = Get-ChildItem -Path $path -Recurse -File -Include *.js,*.css,*.html
  Write-Host ("FILES=" + $files.Count)

  $push = ($files | Select-String -SimpleMatch -Pattern 'push_last_error' -ErrorAction SilentlyContinue | Measure-Object).Count
  $setAudio = ($files | Select-String -SimpleMatch -Pattern 'setAudioSrc' -ErrorAction SilentlyContinue | Measure-Object).Count

  Write-Host ("push_last_error=" + $push)
  Write-Host ("setAudioSrc=" + $setAudio)
}

ScanPath $dist
Write-Host "---"
ScanPath $assets
