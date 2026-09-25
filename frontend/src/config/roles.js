// frontend/src/config/roles.js

export const ROLES = {
  ADMIN: "Admin",
  INSTITUTION_ADMIN: "Institution Admin",

  NAAC_COORDINATOR: "NAAC Coordinator",
  COMMITTEE_MEMBER: "Committee Member",
  DEPT_COORDINATOR: "Dept. Coordinator",
  REVIEWER: "Reviewer",
  DATA_APPROVER: "Data Approver",
  PRINCIPAL_DIRECTOR: "Principal / Director",

  // Kept for backward compatibility if used anywhere
  COORDINATOR: "Coordinator",
};

export const ALL_ROLES = [
  ROLES.ADMIN,
  ROLES.INSTITUTION_ADMIN,
  ROLES.NAAC_COORDINATOR,
  ROLES.COMMITTEE_MEMBER,
  ROLES.DEPT_COORDINATOR,
  ROLES.REVIEWER,
  ROLES.DATA_APPROVER,
  ROLES.PRINCIPAL_DIRECTOR,
];

/**
 * Normalize role names received from the backend.
 */
export const normalizeRole = (roleStr) => {
  if (!roleStr) {
    return ROLES.NAAC_COORDINATOR;
  }

  const cleaned = String(roleStr).trim();
  const lower = cleaned.toLowerCase();

  // IMPORTANT:
  // Check Institution Admin BEFORE generic Admin.
  if (
    lower === "institution admin" ||
    lower === "institutionadministrator" ||
    lower === "institution administrator"
  ) {
    return ROLES.INSTITUTION_ADMIN;
  }

  // Platform Admin only
  if (
    lower === "admin" ||
    lower === "platform admin" ||
    lower === "platformadministrator" ||
    lower === "platform administrator"
  ) {
    return ROLES.ADMIN;
  }

  if (
    lower === "naac coordinator" ||
    lower === "naac coordinator/admin"
  ) {
    return ROLES.NAAC_COORDINATOR;
  }

  if (
    lower === "committee member" ||
    lower === "committee"
  ) {
    return ROLES.COMMITTEE_MEMBER;
  }

  if (
    lower === "dept. coordinator" ||
    lower === "dept coordinator" ||
    lower === "department coordinator"
  ) {
    return ROLES.DEPT_COORDINATOR;
  }

  if (lower === "reviewer") {
    return ROLES.REVIEWER;
  }

  if (
    lower === "data approver" ||
    lower === "dataapproval"
  ) {
    return ROLES.DATA_APPROVER;
  }

  if (
    lower === "principal / director" ||
    lower === "principal/director" ||
    lower === "principal" ||
    lower === "director"
  ) {
    return ROLES.PRINCIPAL_DIRECTOR;
  }

  if (lower === "coordinator") {
    return ROLES.COORDINATOR;
  }

  // Preserve unknown roles instead of silently
  // converting them to Admin.
  return cleaned;
};

export default ROLES;