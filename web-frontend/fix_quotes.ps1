$content = Get-Content "app/projects/new/page.tsx"
$content = $content -replace [regex]::Escape("\\\"MANAGER\\\""), "`"MANAGER`""
$content = $content -replace [regex]::Escape("\\\"ADMIN\\\""), "`"ADMIN`""
Set-Content "app/projects/new/page.tsx" $content
