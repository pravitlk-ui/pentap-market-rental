$ErrorActionPreference = 'Stop'

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Pentap Market Rental - Fast Deploy" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Checking git status..." -ForegroundColor Yellow
git status --short --branch

Write-Host ""
Write-Host "[2/4] Staging files..." -ForegroundColor Yellow
git add .

$commitMessage = "Ready for deploy"
Write-Host "Commit message: $commitMessage" -ForegroundColor Gray
git commit -m $commitMessage

Write-Host ""
Write-Host "[3/4] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "[4/4] Building production bundle..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Next steps in Vercel and Supabase:" -ForegroundColor Green
Write-Host "1. Open Vercel and import the GitHub repo." -ForegroundColor Green
Write-Host "2. Framework: Vite" -ForegroundColor Green
Write-Host "3. Build command: npm run build" -ForegroundColor Green
Write-Host "4. Output directory: dist" -ForegroundColor Green
Write-Host "5. Add env vars in Vercel:" -ForegroundColor Green
Write-Host "   VITE_SUPABASE_URL=https://your-project.supabase.co" -ForegroundColor Green
Write-Host "   VITE_SUPABASE_ANON_KEY=your-anon-key" -ForegroundColor Green
Write-Host "6. In Supabase SQL Editor, run:" -ForegroundColor Green
Write-Host "   create table units (" -ForegroundColor Green
Write-Host "     id text primary key," -ForegroundColor Green
Write-Host "     zone text," -ForegroundColor Green
Write-Host "     code text," -ForegroundColor Green
Write-Host "     size text," -ForegroundColor Green
Write-Host "     status text," -ForegroundColor Green
Write-Host "     tenant_name text," -ForegroundColor Green
Write-Host "     tenant_phone text," -ForegroundColor Green
Write-Host "     rent text," -ForegroundColor Green
Write-Host "     rent_type text," -ForegroundColor Green
Write-Host "     payments jsonb default '[]'::jsonb," -ForegroundColor Green
Write-Host "     seed boolean default false" -ForegroundColor Green
Write-Host "   );" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
