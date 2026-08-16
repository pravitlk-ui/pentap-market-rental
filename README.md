# Pentap Market Rental

A React + Vite rental management dashboard for market space inventory and payment tracking.

## Features

- Manage rental space units by zone
- Add, edit, delete units
- Track rent status and overdue states
- Payment log for daily/monthly rental records
- LocalStorage fallback for offline/dev use
- Supabase-ready backend integration

## Tech Stack

- React
- Vite
- Lucide React
- Supabase
- Vercel

## Local Development

```bash
npm install
npm run dev
```

Open the app in the browser at:

```text
http://localhost:5173
```

## Production Build

```bash
npm run build
```

The build output is generated in the `dist` folder.

## Deploy to Vercel

1. Push this project to GitHub.
2. Open Vercel.
3. Click Add New Project.
4. Import the repository.
5. Use these settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Click Deploy.

## Connect to Supabase

### 1) Create a Supabase project

Create a new project in Supabase.

### 2) Create the table

Run this SQL in the Supabase SQL Editor:

```sql
create table units (
  id text primary key,
  zone text,
  code text,
  size text,
  status text,
  tenant_name text,
  tenant_phone text,
  rent text,
  rent_type text,
  payments jsonb default '[]'::jsonb,
  seed boolean default false
);

create index if not exists idx_units_zone
  on units (zone);

create index if not exists idx_units_code
  on units (code);
```

### 3) Add environment variables in Vercel

In Vercel project settings, add these environment variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4) App behavior

The app automatically does the following:

- If Supabase env vars are present and the table exists, it reads/writes from Supabase.
- If not, it falls back to browser localStorage.

This makes local development easy while remaining deploy-ready for production.

## GitHub Push Example

```bash
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/pentap-market-rental.git
git push -u origin main
```

## Notes

This project is designed to be a deploy-ready frontend for a market rental dashboard. It includes storage abstraction so it can work without a backend during development and switch to Supabase when configured.
