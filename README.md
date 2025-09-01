# TFF Portal v2 (React + Vite + Tailwind)

## Quick start
```bash
npm install
npm run dev
```

## Deploy to Vercel
- Framework: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`

## Env (for Supabase later)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Data
- Edit fixtures/results in `src/data`. Set the current week in `src/data/meta.json`.
- OCR upload writes to browser only (trial). We can flip to Supabase for shared storage.
- Roll of Honour lives in `src/data/rollofhonour.json`.
