# Pentap Market Rental

A React + Vite rental management app for market spaces.

## Run locally

```bash
npm install
npm run dev
```

The app uses localStorage by default, so it works without Supabase.

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the repo into Vercel.
3. Set the framework to Vite.
4. Deploy.

## Connect to Supabase

1. Create a Supabase project.
2. Create a table named `units` with columns like:
   - `id` text
   - `zone` text
   - `code` text
   - `size` text
   - `status` text
   - `tenant_name` text
   - `tenant_phone` text
   - `rent` text
   - `rent_type` text
   - `payments` jsonb
   - `seed` boolean
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel env variables.
4. Replace the localStorage logic in `src/App.jsx` with Supabase fetch/save calls.

## Notes

This project is based on the previous market rental dashboard and has been converted into a runnable Vite app.
