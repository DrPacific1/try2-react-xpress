# Deployment Guide

Deploy the frontend on **Vercel** and the backend on **Render** (free tier).

---

## Step 1: Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign up / log in
2. Click **New → Web Service**
3. Connect your GitHub repo (`try2-react-xpress`)
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
5. Add **Environment Variables** (under "Environment" tab):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `AUTH0_DOMAIN` | `b2b-dreams-work.us.auth0.com` |
| `AUTH0_CLIENT_ID` | `3wNsX9PlI56X2miFABdoNjOoFvilNudG` |
| `AUTH0_CLIENT_SECRET` | _(copy from backend/.env)_ |
| `SESSION_SECRET` | _(copy from backend/.env)_ |
| `AUTH0_AUDIENCE` | `https://b2b-dreams-work.us.auth0.com/me/` |
| `AUTH0_SS_PROFILE_ID_XERO` | `ssp_oKJZXmAsvSDRmp4utJJHgR` |
| `AUTH0_SS_PROFILE_ID_MYOB` | `ssp_55NdDVQDQEH62ZRmkB45aV` |
| `AUTH0_CALLBACK_URL` | `https://YOUR_VERCEL_URL.vercel.app/callback` |
| `FRONTEND_URL` | `https://YOUR_VERCEL_URL.vercel.app` |

6. Click **Create Web Service**
7. Wait for deploy — note your Render URL (e.g., `https://b2b-dreams-backend.onrender.com`)

---

## Step 2: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up / log in
2. Click **Add New → Project**
3. Import your GitHub repo (`try2-react-xpress`)
4. Vercel auto-detects settings from `vercel.json` — no config needed
5. Click **Deploy**
6. Note your Vercel URL (e.g., `https://try2-react-xpress.vercel.app`)

---

## Step 3: Connect Frontend ↔ Backend

1. **Update `vercel.json`** — replace `YOUR_RENDER_URL` with your actual Render URL:
   ```json
   { "source": "/api/:path*", "destination": "https://b2b-dreams-backend.onrender.com/api/:path*" },
   { "source": "/callback", "destination": "https://b2b-dreams-backend.onrender.com/callback" }
   ```
2. Push the change — Vercel auto-redeploys

3. **Update Render env vars** — set your actual Vercel URL:
   - `AUTH0_CALLBACK_URL` = `https://your-app.vercel.app/callback`
   - `FRONTEND_URL` = `https://your-app.vercel.app`

---

## Step 4: Update Auth0 Dashboard

Go to **Auth0 Dashboard → Applications → Your App → Settings**:

| Setting | Add |
|---------|-----|
| **Allowed Callback URLs** | `https://your-app.vercel.app/callback` |
| **Allowed Logout URLs** | `https://your-app.vercel.app` |
| **Allowed Web Origins** | `https://your-app.vercel.app` |

You can keep the `https://localhost:3000` entries for local dev — just add the new URLs comma-separated.

---

## Step 5: Verify

1. Visit your Vercel URL
2. Click Log In → enter `joan@atko.email`
3. Should redirect to Auth0 with MYOB branding
4. After login, dashboard loads with org context

---

## Notes

- **Free tier cold starts**: Render's free tier spins down after 15 min of inactivity. First request after sleep takes ~30s. Upgrade to paid ($7/mo) to keep it warm.
- **Sessions**: In-memory sessions reset when Render restarts the service. For persistent sessions, add Redis (Render offers a free Redis instance).
- **Local dev still works**: The backend detects `NODE_ENV` and uses HTTPS with self-signed certs locally, HTTP in production.
- **Keep localhost entries in Auth0**: Don't remove `https://localhost:3000` from Auth0 settings — you still need it for local development.
