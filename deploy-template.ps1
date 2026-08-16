$ErrorActionPreference = 'Stop'

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Pentap Market Rental - Deploy Template" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 1) Check repo state
Write-Host "[1/5] Checking git status..." -ForegroundColor Yellow
git status --short --branch

# 2) Add and commit changes
Write-Host ""
Write-Host "[2/5] Staging files..." -ForegroundColor Yellow
git add .

$commitMessage = Read-Host "Enter commit message (default: Ready for deploy)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Ready for deploy"
}

git commit -m $commitMessage

# 3) Push to GitHub
Write-Host ""
Write-Host "[3/5] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

# 4) Build production assets
Write-Host ""
Write-Host "[4/5] Building production bundle..." -ForegroundColor Yellow
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
