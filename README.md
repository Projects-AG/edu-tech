# EduVerse - NAAC Accreditation Management System

EduVerse is a web-based NAAC Accreditation Management System designed to streamline the collection, submission, review, verification, and approval of accreditation data and supporting evidence.

## Project Overview

The system provides role-based workflows for different users involved in the NAAC accreditation process.

## Technology Stack

### Frontend

- React.js
- Vite
- JavaScript
- HTML5
- CSS3
- Axios

### Backend

- Python
- FastAPI
- SQLAlchemy
- Alembic
- JWT Authentication

### Database

- PostgreSQL

## User Roles

- Admin
- Institution Admin
- NAAC Coordinator
- Committee Member
- Dept. Coordinator
- Reviewer
- Data Approver
- Principal / Director

## NAAC Submission Workflow

```text
Draft
   ↓
Submitted
   ↓
Under Review
   ↓
Approved / Changes Requested / Rejected
   ↓
Data Approved
   ↓
Final Approval
   ↓
Final Submitted