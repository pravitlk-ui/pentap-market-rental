$ErrorActionPreference = 'Stop'

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Pentap Market Rental - Full Deploy" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/5] Checking git status..." -ForegroundColor Yellow
git status --short --branch

Write-Host ""
Write-Host "[2/5] Adding files to git..." -ForegroundColor Yellow
git add .

$commitMessage = "Ready for deploy"
Write-Host "Commit message: $commitMessage" -ForegroundColor Gray
git commit -m $commitMessage

Write-Host ""
Write-Host "[3/5] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "[4/5] Building production bundle..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "[5/5] Deployment checklist for Vercel + Supabase" -ForegroundColor Yellow
Write-Host "" 
Write-Host "Open Vercel and do this:" -ForegroundColor Green
Write-Host "  1. Import the GitHub repo: pravitlk-ui/pentap-market-rental" -ForegroundColor Green
Write-Host "  2. Framework Preset: Vite" -ForegroundColor Green
Write-Host "  3. Build Command: npm run build" -ForegroundColor Green
Write-Host "  4. Output Directory: dist" -ForegroundColor Green
Write-Host "  5. Deploy" -ForegroundColor Green
Write-Host "" 
Write-Host "Then add env variables in Vercel:" -ForegroundColor Green
Write-Host "  VITE_SUPABASE_URL=https://your-project.supabase.co" -ForegroundColor Green
Write-Host "  VITE_SUPABASE_ANON_KEY=your-anon-key" -ForegroundColor Green
Write-Host ""
Write-Host "Then in Supabase SQL Editor, run:" -ForegroundColor Green
Write-Host "  create table units (" -ForegroundColor Green
Write-Host "    id text primary key," -ForegroundColor Green
Write-Host "    zone text," -ForegroundColor Green
Write-Host "    code text," -ForegroundColor Green
Write-Host "    size text," -ForegroundColor Green
Write-Host "    status text," -ForegroundColor Green
Write-Host "    tenant_name text," -ForegroundColor Green
Write-Host "    tenant_phone text," -ForegroundColor Green
Write-Host "    rent text," -ForegroundColor Green
Write-Host "    rent_type text," -ForegroundColor Green
Write-Host "    payments jsonb default '[]'::jsonb," -ForegroundColor Green
Write-Host "    seed boolean default false" -ForegroundColor Green
Write-Host "  );" -ForegroundColor Green
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Done. Follow the Vercel and Supabase steps above." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
