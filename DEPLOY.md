# Deploy Guide

## 1) Database - Railway (MySQL)

Set in backend service environment:

- `DATABASE_URL=mysql://root:BVYCEqjQVtDWLGRkcRNtXZPrwVfxQIRQ@shuttle.proxy.rlwy.net:48436/social_app`

## 2) Backend - Render

Deploy folder `backend` as a Web Service.

- Build command: `npm install`
- Start command: `npm start`

Required env vars on Render:

- `PORT=5000` (Render can override automatically)
- `DATABASE_URL` (Railway MySQL URL above)
- `CORS_ORIGINS=https://<your-vercel-domain>`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## 3) Frontend - Vercel

Deploy folder `my_social` as Vite app.

Required env var on Vercel:

- `VITE_API_ORIGIN=https://<your-render-backend>.onrender.com`

The project already includes `vercel.json` rewrite for SPA routing.
