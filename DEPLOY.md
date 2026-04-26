# Deploy Guide

## 1) Railway MySQL

- Use this value for backend `DATABASE_URL`:

`mysql://root:BVYCEqjQVtDWLGRkcRNtXZPrwVfxQIRQ@shuttle.proxy.rlwy.net:48436/social_app`

## 2) Backend (Render)

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `DATABASE_URL=mysql://root:BVYCEqjQVtDWLGRkcRNtXZPrwVfxQIRQ@shuttle.proxy.rlwy.net:48436/social_app`
  - `PORT=5000` (Render can override automatically)
  - `CORS_ORIGIN=https://<your-my-social>.vercel.app,https://<your-admin>.vercel.app`

## 3) Frontend user app (Vercel)

- Root directory: `my_social`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable:
  - `VITE_API_BASE_URL=https://<your-render-backend>.onrender.com`

## 4) Frontend admin app (Vercel)

- Root directory: `admin`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable:
  - `VITE_API_BASE_URL=https://<your-render-backend>.onrender.com`
