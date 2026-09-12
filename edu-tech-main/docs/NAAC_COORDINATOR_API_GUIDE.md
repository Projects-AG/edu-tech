# NAAC Coordinator — Backend Flow & API Testing

Base URL: `http://127.0.0.1:8000`  
API prefix: `/api/v1`  
Swagger UI: http://127.0.0.1:8000/docs

## Demo login (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `ChangeMe123!` |
| NAAC / IQAC Coordinator | `iqac@example.com` | `ChangeMe123!` |

```bash
# from edu-tech-main/
alembic upgrade head
python scripts/seed_admin.py
python scripts/seed_naac_cycle.py
uvicorn app.main:app --reload
```

Seed scripts: [`scripts/seed_admin.py`](../scripts/seed_admin.py), [`scripts/seed_naac_cycle.py`](../scripts/seed_naac_cycle.py).

---

## Coordinator backend flow (end-to-end)

```text
1. Login (IQAC_COORDINATOR)
       │
       ▼
2. Dashboard aggregates
   GET /coordinator/dashboard
   GET /coordinator/departments
       │
       ▼
3. Criteria monitor
   GET /criteria  →  GET /criteria/{id}
       │
       ▼
4. Departments upload evidence
   POST /files/upload  →  POST /evidence
       │
       ▼
5. Coordinator verifies / sends back
   PATCH /evidence/{id}/status
   (VERIFIED | NEEDS_CORRECTION | PENDING_REVIEW)
       │
       ▼
6. Department / criterion creates submission pack
   POST /submissions  (DRAFT)
   POST /submissions/{id}/submit  (→ SUBMITTED)
       │
       ▼
7. Review & Approval queue
   GET /reviews/queue
   POST /reviews/{id}/start          (→ UNDER_REVIEW)
   POST /submissions/{id}/request-correction  (→ NEEDS_CORRECTION)
   POST /submissions/{id}/approve             (→ APPROVED)
       │
       ▼
8. Progress recalculated on dashboard / criteria / departments
   (derived from evidence + submission statuses — not stored separately)
```

### Role gate

Almost all coordinator screens require JWT + role `IQAC_COORDINATOR` (or `ADMIN`).

Header on every protected call:

```http
Authorization: Bearer <access_token>
```

---

## Postman setup (once)

1. Import [`postman/NAAC_Coordinator_API.postman_collection.json`](postman/NAAC_Coordinator_API.postman_collection.json)
2. Collection variables:
   - `baseUrl` = `http://127.0.0.1:8000`
   - `access_token` — filled by **1. Login** test script
3. Demo bodies also in [`postman/demo_payloads.json`](postman/demo_payloads.json)

**Test order:** run requests **top to bottom**. After GETs, copy IDs from responses into collection variables (`cycle_id`, `department_id`, `criterion_id`, `metric_id`, `file_upload_id`, `evidence_id`, `submission_id`, `institution_id`).

---

## APIs one-by-one (with demo data)

### 0. Health

`GET {{baseUrl}}/health`

No auth. Expect `{ "status": "ok" }`.

---

### 1. Login (start here)

`POST {{baseUrl}}/api/v1/auth/login`  
Body (JSON):

```json
{
  "email": "iqac@example.com",
  "password": "ChangeMe123!"
}
```

Save `access_token` and `refresh_token`. Also note `user.institution_id`.

---

### 2. Me

`GET {{baseUrl}}/api/v1/auth/me`  
Auth: Bearer

Confirms roles include `IQAC_COORDINATOR`.

---

### 3. Coordinator dashboard

`GET {{baseUrl}}/api/v1/coordinator/dashboard`  
Optional: `?cycle_id={{cycle_id}}`

Returns institution banner, SSR %, criteria progress, attention items, recent submissions.

---

### 4. Coordinator departments board

`GET {{baseUrl}}/api/v1/coordinator/departments`  
Optional: `?cycle_id={{cycle_id}}`

Save a `department_id` from `departments[].id`.

---

### 5. Department criteria breakdown

`GET {{baseUrl}}/api/v1/coordinator/departments/{{department_id}}/criteria-breakdown`  
Optional: `?cycle_id={{cycle_id}}`

---

### 6. Criteria list (monitor cards)

`GET {{baseUrl}}/api/v1/criteria`  
Optional: `?cycle_id={{cycle_id}}`

Save `criterion_id` from `items[].id`.

---

### 7. Criterion detail

`GET {{baseUrl}}/api/v1/criteria/{{criterion_id}}`

Save `metric_id` from nested `key_indicators[].metrics[].id` (or equivalent nested metric id in response).

---

### 8. List departments (foundation)

`GET {{baseUrl}}/api/v1/departments/institution/{{institution_id}}`

---

### 9. Create department (optional)

`POST {{baseUrl}}/api/v1/departments`

```json
{
  "institution_id": "{{institution_id}}",
  "name": "Electronics & Telecommunication",
  "code": "EXTC"
}
```

---

### 10. Upload file

`POST {{baseUrl}}/api/v1/files/upload`  
Body: `form-data` key `upload` = any PDF/DOCX file

Save returned `id` → `file_upload_id`.

---

### 11. Create evidence (link file to metric + department)

`POST {{baseUrl}}/api/v1/evidence`

```json
{
  "cycle_id": "{{cycle_id}}",
  "metric_id": "{{metric_id}}",
  "department_id": "{{department_id}}",
  "file_upload_id": "{{file_upload_id}}",
  "title": "Academic Calendar 2025-26",
  "unit": "Academics",
  "notes": "Signed copy for Criterion 1"
}
```

Save `id` → `evidence_id`.

---

### 12. List evidence / stats

`GET {{baseUrl}}/api/v1/evidence?cycle_id={{cycle_id}}`  
`GET {{baseUrl}}/api/v1/evidence/stats?cycle_id={{cycle_id}}`  
Filters: `status`, `criterion_id`, `department_id`, `q`

---

### 13. Update evidence status (coordinator action)

`PATCH {{baseUrl}}/api/v1/evidence/{{evidence_id}}/status`

Verify:

```json
{
  "status": "VERIFIED",
  "notes": "Checked against BoS minutes"
}
```

Or send back:

```json
{
  "status": "NEEDS_CORRECTION",
  "notes": "Missing signed attendance sheet"
}
```

Allowed: `PENDING_REVIEW` | `VERIFIED` | `NEEDS_CORRECTION`

---

### 14. Create submission (draft pack)

`POST {{baseUrl}}/api/v1/submissions`

```json
{
  "cycle_id": "{{cycle_id}}",
  "criterion_id": "{{criterion_id}}",
  "department_id": "{{department_id}}",
  "title": "Criterion 1 Evidence Submission — Computer Engineering",
  "evidence_ids": ["{{evidence_id}}"],
  "assigned_to_id": null
}
```

Save `id` → `submission_id`.

---

### 15. Submit for review

`POST {{baseUrl}}/api/v1/submissions/{{submission_id}}/submit`  
No body. Status → `SUBMITTED`.

---

### 16. List submissions / stats

`GET {{baseUrl}}/api/v1/submissions?cycle_id={{cycle_id}}`  
`GET {{baseUrl}}/api/v1/submissions/stats?cycle_id={{cycle_id}}`

---

### 17. Review queue

`GET {{baseUrl}}/api/v1/reviews/queue?cycle_id={{cycle_id}}`  
`GET {{baseUrl}}/api/v1/reviews/stats?cycle_id={{cycle_id}}`

---

### 18. Start review

`POST {{baseUrl}}/api/v1/reviews/{{submission_id}}/start`  
No body. Status → `UNDER_REVIEW`.

---

### 19. Request correction (IQAC)

`POST {{baseUrl}}/api/v1/submissions/{{submission_id}}/request-correction`

```json
{
  "note": "Incomplete student progression data. Attach semester-wise sheets for 2024-25."
}
```

Status → `NEEDS_CORRECTION`.

---

### 20. Approve submission (IQAC)

`POST {{baseUrl}}/api/v1/submissions/{{submission_id}}/approve`  
No body. Status → `APPROVED`.

---

### 21. Create contributor user (IQAC can provision)

`POST {{baseUrl}}/api/v1/auth/users`

```json
{
  "institution_id": "{{institution_id}}",
  "department_id": "{{department_id}}",
  "name": "Prof. A. Deshmukh",
  "email": "deshmukh.ce@example.com",
  "password": "ChangeMe123!",
  "role": "DEPARTMENT_CONTRIBUTOR",
  "scope_type": "DEPARTMENT"
}
```

IQAC may assign: `CRITERION_INCHARGE`, `REVIEWER`, `DEPARTMENT_CONTRIBUTOR`, `FACULTY`.

---

### 22. List users / audit / foundation dashboard

- `GET /api/v1/auth/users`
- `GET /api/v1/audit-logs/institution/{{institution_id}}`
- `GET /api/v1/dashboard/summary`

---

### 23. Refresh / logout

`POST /api/v1/auth/refresh`

```json
{ "refresh_token": "{{refresh_token}}" }
```

`POST /api/v1/auth/logout`

```json
{ "refresh_token": "{{refresh_token}}" }
```

---

## Status cheat-sheet

**Evidence:** `PENDING_REVIEW` → `VERIFIED` or `NEEDS_CORRECTION`  
**Submission:** `DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` or `NEEDS_CORRECTION`

## Files in this folder

| File | Purpose |
|------|---------|
| `NAAC_COORDINATOR_API_GUIDE.md` | This guide |
| [`postman/NAAC_Coordinator_API.postman_collection.json`](postman/NAAC_Coordinator_API.postman_collection.json) | Import into Postman |
| [`postman/demo_payloads.json`](postman/demo_payloads.json) | Copy-paste request bodies |
| [`../scripts/generate_postman_collection.py`](../scripts/generate_postman_collection.py) | Regenerates the Postman JSON |
