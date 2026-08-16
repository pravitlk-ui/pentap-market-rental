@echo off
cls

echo ==================================================
echo Pentap Market Rental - One Click Deploy
echo ==================================================

echo.
echo [1/5] Checking git status...
git status --short --branch

echo.
echo [2/5] Adding files to git...
git add .

echo Commit message: Ready for deploy
git commit -m "Ready for deploy"

echo.
echo [3/5] Pushing to GitHub...
git push origin main

echo.
echo [4/5] Building production bundle...
npm run build

echo.
echo ==================================================
echo Next steps in Vercel and Supabase:
echo 1. Open Vercel and import the GitHub repo.
echo 2. Framework Preset: Vite
echo 3. Build Command: npm run build
echo 4. Output Directory: dist
echo 5. Add env vars in Vercel:
echo    VITE_SUPABASE_URL=https://your-project.supabase.co
echo    VITE_SUPABASE_ANON_KEY=your-anon-key
echo 6. In Supabase SQL Editor, run:
echo    create table units (
echo      id text primary key,
echo      zone text,
echo      code text,
echo      size text,
echo      status text,
echo      tenant_name text,
echo      tenant_phone text,
echo      rent text,
echo      rent_type text,
echo      payments jsonb default '[]'::jsonb,
echo      seed boolean default false
echo    );
echo ==================================================
pause
