# ReachEmpireBot Deployment Guide

## Correct deployment folder

Upload the contents of this folder as the root of the GitHub repository. `index.html`, `vercel.json`, and the `assets` folder must be visible at the repository root.

## Architecture

- Frontend: Vercel and the public ReachEmpireBot domain
- Backend/API: `https://admin.reachempirebot.com`
- Paid EA files: private backend storage or private object storage
- Payment: backend creates and captures PayPal orders
- Download: backend returns a short-lived signed URL only after verified payment

## GitHub

1. Create a new empty GitHub repository.
2. Push this folder to the `main` branch.
3. Do not add paid EA binaries or project ZIP archives. `.gitignore` blocks them.
4. Git LFS can store large development assets, but paid bot files should remain outside the public frontend repository.

## Vercel

1. Import the GitHub repository into Vercel.
2. Framework Preset: `Other`.
3. Root Directory: repository root.
4. Build Command: leave empty.
5. Output Directory: leave empty.
6. Deploy, then connect the public website domain.

## Backend requirements

The backend must allow CORS requests from the production website domain and Vercel preview domains.

Required endpoints currently used by the frontend include:

- `GET /api/quotes`
- `GET /api/bot-marketplace/listings`
- `POST /api/client-signup/submit`
- `GET /api/signup-status`
- `POST /api/mobile/login`
- `POST /api/mobile/logout`
- `GET /api/mobile/me`
- `GET /api/mobile/signals/latest`
- `GET /api/mobile/signals/history`
- `GET /api/mobile/client/report`
- `POST /api/paypal/create-checkout`
- `POST /api/paypal/capture-order`
- `GET /api/downloads/reachempirebot`

For a completed payment, `/api/paypal/capture-order` should return:

```json
{
  "status": "COMPLETED",
  "download_url": "SHORT_LIVED_SIGNED_URL"
}
```

Never expose PayPal secrets or permanent private file URLs in frontend code.

`GET /api/downloads/reachempirebot` should stream the public setup ZIP or redirect to a temporary object-storage URL. Store the 98 MB ZIP in backend/object storage instead of this frontend Git repository. The original file remains at `D:\ReachEmpireBot_Website\assets\download\ReachEmpireBot.zip` for backend upload.
