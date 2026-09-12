"""Generate Postman Collection v2.1 for NAAC Coordinator APIs."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "docs" / "postman" / "NAAC_Coordinator_API.postman_collection.json"

BASE = "{{baseUrl}}"


def url(path: str, query: list[dict] | None = None) -> dict:
    raw = f"{BASE}{path}"
    parts = path.strip("/").split("/") if path.strip("/") else []
    return {
        "raw": raw + (("?" + "&".join(f"{q['key']}={{{{q['value']}}}}" if False else f"{q['key']}={{{{" + q['value'].strip('{}') + "}}}" if q.get("value", "").startswith("{{") else f"{q['key']}={q['value']}") for q in (query or []) if q.get("value") is not None) if query else ""),
        "host": ["{{baseUrl}}"],
        "path": parts,
        "query": query or [],
    }


def fix_url(path: str, query: list[dict] | None = None) -> dict:
    q = query or []
    qs = "&".join(
        f"{item['key']}={item['value']}"
        for item in q
        if item.get("value") not in (None, "")
    )
    raw = f"{BASE}{path}" + (f"?{qs}" if qs else "")
    return {
        "raw": raw,
        "host": ["{{baseUrl}}"],
        "path": [p for p in path.split("/") if p],
        "query": [
            {
                "key": item["key"],
                "value": item["value"],
                "disabled": item.get("disabled", False),
            }
            for item in q
        ],
    }


def bearer() -> list[dict]:
    return [
        {
            "key": "Authorization",
            "value": "Bearer {{access_token}}",
            "type": "text",
        }
    ]


def json_body(obj) -> dict:
    return {
        "mode": "raw",
        "raw": json.dumps(obj, indent=2),
        "options": {"raw": {"language": "json"}},
    }


def req(name: str, method: str, path: str, *, auth=True, body=None, query=None, form=None, description="") -> dict:
    headers = [{"key": "Content-Type", "value": "application/json", "type": "text"}] if body is not None and form is None else []
    if auth:
        headers = bearer() + headers
    item: dict = {
        "name": name,
        "request": {
            "method": method,
            "header": headers,
            "url": fix_url(path, query),
            "description": description,
        },
    }
    if form is not None:
        item["request"]["body"] = {
            "mode": "formdata",
            "formdata": form,
        }
        item["request"]["header"] = bearer() if auth else []
    elif body is not None:
        item["request"]["body"] = json_body(body)
    return item


login_tests = """
pm.test('Login OK', function () {
  pm.response.to.have.status(200);
});
const data = pm.response.json();
if (data.access_token) {
  pm.collectionVariables.set('access_token', data.access_token);
}
if (data.refresh_token) {
  pm.collectionVariables.set('refresh_token', data.refresh_token);
}
if (data.user && data.user.institution_id) {
  pm.collectionVariables.set('institution_id', data.user.institution_id);
}
if (data.user && data.user.id) {
  pm.collectionVariables.set('user_id', data.user.id);
}
"""

collection = {
    "info": {
        "name": "NAAC Coordinator API",
        "description": "Postman collection for IQAC / NAAC Coordinator APIs.\\n\\n1) Seed DB: python scripts/seed_admin.py && python scripts/seed_naac_cycle.py\\n2) Run uvicorn\\n3) Execute requests top-to-bottom\\n4) Copy IDs from GET responses into collection variables.\\n\\nDemo login: iqac@example.com / ChangeMe123!",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "baseUrl", "value": "http://127.0.0.1:8000"},
        {"key": "access_token", "value": ""},
        {"key": "refresh_token", "value": ""},
        {"key": "institution_id", "value": ""},
        {"key": "user_id", "value": ""},
        {"key": "cycle_id", "value": ""},
        {"key": "department_id", "value": ""},
        {"key": "criterion_id", "value": ""},
        {"key": "metric_id", "value": ""},
        {"key": "file_upload_id", "value": ""},
        {"key": "evidence_id", "value": ""},
        {"key": "submission_id", "value": ""},
    ],
    "item": [
        {
            "name": "0. Health",
            "item": [
                req("Health check", "GET", "/health", auth=False, description="No auth"),
            ],
        },
        {
            "name": "1. Auth",
            "item": [
                {
                    **req(
                        "Login as IQAC Coordinator",
                        "POST",
                        "/api/v1/auth/login",
                        auth=False,
                        body={"email": "iqac@example.com", "password": "ChangeMe123!"},
                        description="Saves access_token / refresh_token / institution_id",
                    ),
                    "event": [
                        {
                            "listen": "test",
                            "script": {"type": "text/javascript", "exec": login_tests.strip().splitlines()},
                        }
                    ],
                },
                req("Get me", "GET", "/api/v1/auth/me"),
                req(
                    "Refresh token",
                    "POST",
                    "/api/v1/auth/refresh",
                    auth=False,
                    body={"refresh_token": "{{refresh_token}}"},
                ),
                req(
                    "Logout",
                    "POST",
                    "/api/v1/auth/logout",
                    body={"refresh_token": "{{refresh_token}}"},
                ),
                req(
                    "Create department contributor",
                    "POST",
                    "/api/v1/auth/users",
                    body={
                        "institution_id": "{{institution_id}}",
                        "department_id": "{{department_id}}",
                        "name": "Prof. A. Deshmukh",
                        "email": "deshmukh.ce@example.com",
                        "password": "ChangeMe123!",
                        "role": "DEPARTMENT_CONTRIBUTOR",
                        "scope_type": "DEPARTMENT",
                    },
                ),
                req("List users", "GET", "/api/v1/auth/users"),
                req(
                    "Assign role to user",
                    "POST",
                    "/api/v1/auth/users/{{user_id}}/roles",
                    body={
                        "role": "FACULTY",
                        "scope_type": "DEPARTMENT",
                        "department_id": "{{department_id}}",
                        "criterion_id": None,
                    },
                ),
            ],
        },
        {
            "name": "2. Coordinator dashboard",
            "item": [
                req(
                    "Dashboard",
                    "GET",
                    "/api/v1/coordinator/dashboard",
                    query=[
                        {"key": "cycle_id", "value": "{{cycle_id}}", "disabled": True},
                    ],
                    description="Omit cycle_id to use active cycle. Copy cycle_id from response if present.",
                ),
                req(
                    "Departments board",
                    "GET",
                    "/api/v1/coordinator/departments",
                    query=[{"key": "cycle_id", "value": "{{cycle_id}}", "disabled": True}],
                ),
                req(
                    "Department criteria breakdown",
                    "GET",
                    "/api/v1/coordinator/departments/{{department_id}}/criteria-breakdown",
                    query=[{"key": "cycle_id", "value": "{{cycle_id}}", "disabled": True}],
                ),
            ],
        },
        {
            "name": "3. Criteria",
            "item": [
                req(
                    "List criteria",
                    "GET",
                    "/api/v1/criteria",
                    query=[{"key": "cycle_id", "value": "{{cycle_id}}", "disabled": True}],
                ),
                req("Criterion detail", "GET", "/api/v1/criteria/{{criterion_id}}"),
            ],
        },
        {
            "name": "4. Departments (foundation)",
            "item": [
                req(
                    "List departments",
                    "GET",
                    "/api/v1/departments/institution/{{institution_id}}",
                ),
                req(
                    "Create department",
                    "POST",
                    "/api/v1/departments",
                    body={
                        "institution_id": "{{institution_id}}",
                        "name": "Electronics & Telecommunication",
                        "code": "EXTC",
                    },
                ),
            ],
        },
        {
            "name": "5. Files & Evidence",
            "item": [
                req(
                    "Upload file",
                    "POST",
                    "/api/v1/files/upload",
                    form=[
                        {
                            "key": "upload",
                            "type": "file",
                            "src": [],
                            "description": "Select any PDF/DOCX in Postman",
                        }
                    ],
                    description="Copy returned id → file_upload_id",
                ),
                req(
                    "Create evidence",
                    "POST",
                    "/api/v1/evidence",
                    body={
                        "cycle_id": "{{cycle_id}}",
                        "metric_id": "{{metric_id}}",
                        "department_id": "{{department_id}}",
                        "file_upload_id": "{{file_upload_id}}",
                        "title": "Academic Calendar 2025-26",
                        "unit": "Academics",
                        "notes": "Signed copy for Criterion 1",
                    },
                ),
                req(
                    "List evidence",
                    "GET",
                    "/api/v1/evidence",
                    query=[
                        {"key": "cycle_id", "value": "{{cycle_id}}", "disabled": True},
                        {"key": "department_id", "value": "{{department_id}}", "disabled": True},
                        {"key": "status", "value": "PENDING_REVIEW", "disabled": True},
                        {"key": "q", "value": "Calendar", "disabled": True},
                    ],
                ),
                req(
                    "Evidence stats",
                    "GET",
                    "/api/v1/evidence/stats",
                    query=[{"key": "cycle_id", "value": "{{cycle_id}}", "disabled": True}],
                ),
                req(
                    "Verify evidence",
                    "PATCH",
                    "/api/v1/evidence/{{evidence_id}}/status",
                    body={"status": "VERIFIED", "notes": "Checked against BoS minutes"},
                ),
                req(
                    "Request evidence correction",
                    "PATCH",
                    "/api/v1/evidence/{{evidence_id}}/status",
                    body={
                        "status": "NEEDS_CORRECTION",
                        "notes": "Missing signed attendance sheet",
                    },
                ),
            ],
        },
        {
            "name": "6. Submissions",
            "item": [
                req(
                    "Create draft submission",
                    "POST",
                    "/api/v1/submissions",
                    body={
                        "cycle_id": "{{cycle_id}}",
                        "criterion_id": "{{criterion_id}}",
                        "department_id": "{{department_id}}",
                        "title": "Criterion 1 Evidence Submission — Computer Engineering",
                        "evidence_ids": ["{{evidence_id}}"],
                        "assigned_to_id": None,
                    },
                ),
                req("Submit for review", "POST", "/api/v1/submissions/{{submission_id}}/submit", body=None),
                req(
                    "List submissions",
                    "GET",
                    "/api/v1/submissions",
                    query=[{"key": "cycle_id", "value": "{{cycle_id}}", "disabled": True}],
                ),
                req(
                    "Submission stats",
                    "GET",
                    "/api/v1/submissions/stats",
                    query=[{"key": "cycle_id", "value": "{{cycle_id}}", "disabled": True}],
                ),
                req("Get submission", "GET", "/api/v1/submissions/{{submission_id}}"),
                req(
                    "Request correction",
                    "POST",
                    "/api/v1/submissions/{{submission_id}}/request-correction",
                    body={
                        "note": "Incomplete student progression data. Attach semester-wise sheets for 2024-25."
                    },
                ),
                req("Approve submission", "POST", "/api/v1/submissions/{{submission_id}}/approve", body=None),
            ],
        },
        {
            "name": "7. Reviews",
            "item": [
                req(
                    "Review queue",
                    "GET",
                    "/api/v1/reviews/queue",
                    query=[{"key": "cycle_id", "value": "{{cycle_id}}", "disabled": True}],
                ),
                req(
                    "Review stats",
                    "GET",
                    "/api/v1/reviews/stats",
                    query=[{"key": "cycle_id", "value": "{{cycle_id}}", "disabled": True}],
                ),
                req("Review detail", "GET", "/api/v1/reviews/{{submission_id}}"),
                req("Start review", "POST", "/api/v1/reviews/{{submission_id}}/start", body=None),
            ],
        },
        {
            "name": "8. Misc",
            "item": [
                req("Foundation dashboard summary", "GET", "/api/v1/dashboard/summary"),
                req(
                    "Audit logs",
                    "GET",
                    "/api/v1/audit-logs/institution/{{institution_id}}",
                ),
            ],
        },
    ],
}

# Fix items that passed body=None — remove empty body for GET-like POSTs without body
def scrub(items):
    for it in items:
        if "item" in it:
            scrub(it["item"])
            continue
        req_obj = it.get("request", {})
        body = req_obj.get("body")
        if body and body.get("mode") == "raw" and body.get("raw") in ("null", "None"):
            del req_obj["body"]
            req_obj["header"] = [h for h in req_obj.get("header", []) if h.get("key") != "Content-Type"]


scrub(collection["item"])

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(collection, indent=2), encoding="utf-8")
print(f"Wrote {OUT}")
