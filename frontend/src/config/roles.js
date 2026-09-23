// Constants for the 7 Supported System Roles

export const ROLES = {
  COORDINATOR: "Coordinator",
  NAAC_COORDINATOR: "NAAC Coordinator",
  COMMITTEE_MEMBER: "Committee Member",
  DEPT_COORDINATOR: "Dept. Coordinator",
  REVIEWER: "Reviewer",
  DATA_APPROVER: "Data Approver",
  PRINCIPAL_DIRECTOR: "Principal / Director",
  ADMIN: "Admin",
};

export const ALL_ROLES = [
  ROLES.ADMIN,
  ROLES.NAAC_COORDINATOR,
  ROLES.COMMITTEE_MEMBER,
  ROLES.DEPT_COORDINATOR,
  ROLES.REVIEWER,
  ROLES.DATA_APPROVER,
  ROLES.PRINCIPAL_DIRECTOR,
];

// Helper to normalize role names from various backend or UI strings
export const normalizeRole = (roleStr) => {
  if (!roleStr) return ROLES.NAAC_COORDINATOR;

  const cleaned = roleStr.trim();

  if (
    cleaned.includes("Admin") ||
    cleaned.includes("Platform Administrator")
  ) {
    return ROLES.ADMIN;
  }

  // IMPORTANT: Check NAAC Coordinator BEFORE generic Coordinator
  if (
    cleaned === "NAAC Coordinator" ||
    cleaned.toLowerCase() === "naac coordinator"
  ) {
    return ROLES.NAAC_COORDINATOR;
  }

  if (
    cleaned.includes("Dept") ||
    cleaned.includes("Department Coordinator")
  ) {
    return ROLES.DEPT_COORDINATOR;
  }

  if (cleaned.includes("Committee")) {
    return ROLES.COMMITTEE_MEMBER;
  }

  if (cleaned.includes("Reviewer")) {
    return ROLES.REVIEWER;
  }

  if (cleaned.includes("Approver")) {
    return ROLES.DATA_APPROVER;
  }

  if (
    cleaned.includes("Principal") ||
    cleaned.includes("Director")
  ) {
    return ROLES.PRINCIPAL_DIRECTOR;
  }

  if (cleaned === "Coordinator") {
    return ROLES.COORDINATOR;
  }

  return cleaned;
};