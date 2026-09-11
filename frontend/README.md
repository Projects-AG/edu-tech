# NAAC Platform Frontend

React + Material UI client for role-based authentication against the Foundation API.

## Location

```
f:\03-09-2026\frontend   ← this app (outside edu-tech-main)
f:\03-09-2026\edu-tech-main  ← FastAPI backend
```

## Setup

```bash
cd f:\03-09-2026\frontend
npm install
npm run dev
```

App: http://localhost:5173  
API: http://localhost:8000 (must be running)

Configure API base URL in `.env`:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Auth flows

| Action | Endpoint |
|--------|----------|
| Login | `POST /api/v1/auth/login` |
| Register (Faculty / Department Contributor only) | `POST /api/v1/auth/register` |
| Current user | `GET /api/v1/auth/me` |
| Logout | `POST /api/v1/auth/logout` |
| Refresh | `POST /api/v1/auth/refresh` |

After login, the app routes to a role-specific dashboard based on JWT/user roles.

### Seed admin

- email: `admin@example.com`
- password: `ChangeMe123!`
