# Frontend (React + Vite)

This frontend app mirrors the Django templates using React components and Tailwind (via CDN).

## Prerequisites
- Node.js 16+ (18+ recommended)
- npm (bundled with Node)

## Install dependencies
Run from the repository root or inside the `frontend` folder:

```bash
cd frontend
npm install
```

## Run development server (hot reload)

```bash
cd frontend
npm run dev
# open the Local URL printed by Vite (e.g. http://localhost:5173 or 5174)
```

## Build for production

```bash
cd frontend
npm run build
# output goes to `frontend/dist`
```

## Preview production build locally

```bash
cd frontend
npm run preview
```

## Option: Serve built frontend from Django

1. Build the frontend:

```bash
cd frontend
npm run build
```

2. Copy `frontend/dist` into Django static files (example Windows PowerShell):

```powershell
# adjust destination path as needed
mkdir -Force ..\backend\static\frontend
cp -Recurse dist\* ..\backend\static\frontend\
```

3. Run Django `collectstatic` and serve as usual:

```bash
cd backend\optionsAndProperty
python manage.py collectstatic
```

## Notes
- Tailwind is included via CDN in `frontend/index.html`, so no Tailwind install/build is required.
- If `npm run dev` reports a port in use, Vite will try another port — use the printed URL.
- To fix dependency issues: remove `node_modules` and `package-lock.json`, then `npm install`.
- `frontend/package.json` lists the exact JS dependencies used (React, react-dom, react-router-dom, vite, etc.).

## Troubleshooting
- If `npm` complains about permissions, consider using a Node version manager (nvm) or run with appropriate privileges.
- If you want CI steps or automated build/deploy, tell me which provider to target and I can add scripts.
