off
powershell
-Command
 = Get-Content 'app/projects/new/page.tsx';  =  -replace 'u\.role\.toUpperCase\(\) === \"MANAGER\"', 'u.role.toUpperCase() === \"MANAGER\" || u.role.toUpperCase() === \"ADMIN\"' ; Set-Content 'app/projects/new/page.tsx' 
