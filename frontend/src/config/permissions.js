import { ROLES } from "./roles";

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",

  // Institution
  INSTITUTION_VIEW: "institution.view",
  INSTITUTION_MANAGE: "institution.manage",

  // Departments
  DEPARTMENTS_VIEW: "departments.view",
  DEPARTMENTS_MANAGE: "departments.manage",

  // Criteria
  CRITERIA_VIEW: "criteria.view",
  CRITERIA_MANAGE: "criteria.manage",

  // Documents
  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_UPLOAD: "documents.upload",
  DOCUMENTS_MANAGE: "documents.manage",

  // Submissions
  SUBMISSIONS_VIEW: "submissions.view",
  SUBMISSIONS_CREATE: "submissions.create",
  SUBMISSIONS_SUBMIT: "submissions.submit",
  SUBMISSIONS_MANAGE: "submissions.manage",

  // Reviews
  REVIEWS_VIEW: "reviews.view",
  REVIEWS_ASSIGN: "reviews.assign",
  REVIEWS_APPROVE: "reviews.approve",
  REVIEWS_REJECT: "reviews.reject",
  REVIEWS_REQUEST_CHANGES: "reviews.request_changes",

  // Reports
  REPORTS_VIEW: "reports.view",
  REPORTS_GENERATE: "reports.generate",

  // Users
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",

  // Roles & System
  ROLES_VIEW: "roles.view",
  ROLES_MANAGE: "roles.manage",
  SETTINGS_MANAGE: "settings.manage",

  // Notifications
  NOTIFICATIONS_VIEW: "notifications.view",
  NOTIFICATIONS_MANAGE: "notifications.manage",
};


// ==========================================================
// FALLBACK PERMISSIONS
// ==========================================================

export const ROLE_FALLBACK_PERMISSIONS = {

  // ========================================================
  // ADMIN
  // ========================================================

  [ROLES.ADMIN]: Object.values(PERMISSIONS),


  // ========================================================
  // NAAC COORDINATOR
  // ========================================================

  [ROLES.NAAC_COORDINATOR]: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.DEPARTMENTS_VIEW,

    // Criteria management
    PERMISSIONS.CRITERIA_VIEW,
    PERMISSIONS.CRITERIA_MANAGE,

    // Documents
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.DOCUMENTS_MANAGE,

    // Submissions
    PERMISSIONS.SUBMISSIONS_VIEW,
    PERMISSIONS.SUBMISSIONS_CREATE,
    PERMISSIONS.SUBMISSIONS_SUBMIT,
    PERMISSIONS.SUBMISSIONS_MANAGE,

    // Reviews
    PERMISSIONS.REVIEWS_VIEW,
    PERMISSIONS.REVIEWS_APPROVE,

    // Reports
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,

    // Notifications
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_MANAGE,
  ],


  // ========================================================
  // COMMITTEE MEMBER
  // ========================================================

  [ROLES.COMMITTEE_MEMBER]: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.CRITERIA_VIEW,

    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,

    PERMISSIONS.SUBMISSIONS_VIEW,
    PERMISSIONS.SUBMISSIONS_CREATE,

    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],


  // ========================================================
  // DEPARTMENT COORDINATOR
  // ========================================================

  [ROLES.DEPT_COORDINATOR]: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.DEPARTMENTS_VIEW,

    // Can view criteria but cannot manage them
    PERMISSIONS.CRITERIA_VIEW,

    // Evidence
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,

    // Submissions
    PERMISSIONS.SUBMISSIONS_VIEW,
    PERMISSIONS.SUBMISSIONS_CREATE,
    PERMISSIONS.SUBMISSIONS_SUBMIT,

    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],


  // ========================================================
  // REVIEWER
  // ========================================================

  [ROLES.REVIEWER]: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.SUBMISSIONS_VIEW,

    PERMISSIONS.DOCUMENTS_VIEW,

    PERMISSIONS.REVIEWS_VIEW,
    PERMISSIONS.REVIEWS_APPROVE,
    PERMISSIONS.REVIEWS_REJECT,
    PERMISSIONS.REVIEWS_REQUEST_CHANGES,

    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],


  // ========================================================
  // DATA APPROVER
  // ========================================================

  [ROLES.DATA_APPROVER]: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.SUBMISSIONS_VIEW,

    PERMISSIONS.DOCUMENTS_VIEW,

    PERMISSIONS.REVIEWS_VIEW,
    PERMISSIONS.REVIEWS_APPROVE,
    PERMISSIONS.REVIEWS_REJECT,

    PERMISSIONS.REPORTS_VIEW,

    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],


  // ========================================================
  // PRINCIPAL / DIRECTOR
  // ========================================================

  [ROLES.PRINCIPAL_DIRECTOR]: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.INSTITUTION_VIEW,

    PERMISSIONS.DEPARTMENTS_VIEW,

    PERMISSIONS.CRITERIA_VIEW,

    PERMISSIONS.SUBMISSIONS_VIEW,

    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,

    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],
};