$xmlContent = @"
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">cdn.islamic.network</domain>
        <domain includeSubdomains="true">everyayah.com</domain>
        <domain includeSubdomains="true">api.alquran.cloud</domain>
        <domain includeSubdomains="true">api.aladhan.com</domain>
    </domain-config>
</network-security-config>
"@

$xmlContent | Out-File -FilePath "C:\xampp\htdocs\Tawbah-Ai-master\artifacts\tawbah-web\android\app\src\main\res\xml\network_security_config.xml" -Encoding utf8 -NoNewline

Write-Host "network_security_config.xml fixed"
