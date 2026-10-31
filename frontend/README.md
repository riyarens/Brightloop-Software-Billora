# BILLORA frontend

## Local development

Install dependencies from the repository root with `npm ci`, then copy
`frontend/.env.example` to `frontend/.env.local` and set `VITE_API_URL` to the
backend API base URL (default: `http://localhost:5000/api`).

Start the backend and frontend in separate terminals:

```powershell
npm run dev:backend
npm run dev:frontend
```

The frontend is served at `http://localhost:5173`. Authentication uses a
bearer token kept in the browser's session storage and attaches it to
authenticated API requests.
