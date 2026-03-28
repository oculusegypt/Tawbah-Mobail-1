$env:JAVA_HOME = "C:\Program Files\Android\Android Studio3\jbr"
$env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH
java -version
Write-Host "---"
$webDir = "C:\xampp\htdocs\Tawbah-Ai-master\artifacts\tawbah-web"

Write-Host "Building web assets..."
Push-Location $webDir
pnpm -s build
Write-Host "Syncing Capacitor Android..."
npx cap sync android
Pop-Location

Write-Host "---"
Push-Location "$webDir\android"
.\gradlew.bat assembleDebug
Pop-Location
