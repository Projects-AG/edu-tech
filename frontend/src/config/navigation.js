import {
  LayoutDashboard,
  Building2,
  Building,
  Award,
  FileText,
  UploadCloud,
  CheckSquare,
  BarChart3,
  Bell,
  Users,
  ShieldCheck,
  Settings,
  UserCheck,
  ClipboardList,
} from "lucide-react";

import {
  ROLES,
  normalizeRole,
} from "./roles";

// ============================================================
// NAVIGATION CONFIGURATION
// ============================================================

export const NAVIGATION_CONFIG = {

  // ==========================================================
  // NAAC COORDINATOR
  // ==========================================================

  [ROLES.NAAC_COORDINATOR]: [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },

    {
      label: "Departments",
      path: "/departments",
      icon: Building2,
    },

    {
      label: "NAAC Criteria",
      path: "/criteria",
      icon: Award,
    },

    {
      label: "Documents & Evidence",
      path: "/documents",
      icon: UploadCloud,
    },

    {
      label: "Submissions",
      path: "/submissions",
      icon: FileText,
    },

    {
      label: "Review & Approval",
      path: "/review",
      icon: CheckSquare,
    },

    {
      label: "Registration Approvals",
      path: "/admin/registration-requests",
      icon: UserCheck,
    },

    {
      label: "Reports",
      path: "/reports",
      icon: BarChart3,
    },

    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],

  // ==========================================================
  // COMMITTEE MEMBER
  // ==========================================================

  [ROLES.COMMITTEE_MEMBER]: [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },

    {
      label: "NAAC Criteria",
      path: "/criteria",
      icon: Award,
    },

    {
      label: "Documents & Evidence",
      path: "/documents",
      icon: UploadCloud,
    },

    {
      label: "Submissions",
      path: "/submissions",
      icon: FileText,
    },

    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],

  // ==========================================================
  // DEPARTMENT COORDINATOR
  //
  // Department Coordinator gets:
  // Dashboard
  // Department
  // NAAC Criteria
  // Documents & Evidence
  // Submissions
  // Notifications
  //
  // They DO NOT get:
  // Review & Approval
  // Reports
  // NAAC structural administration
  // ==========================================================

  [ROLES.DEPT_COORDINATOR]: [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },

    {
      label: "Department",
      path: "/departments",
      icon: Building2,
    },

    {
      label: "NAAC Criteria",
      path: "/criteria",
      icon: Award,
    },

    {
      label: "Documents & Evidence",
      path: "/documents",
      icon: UploadCloud,
    },

    {
      label: "Submissions",
      path: "/submissions",
      icon: FileText,
    },

    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],

  // ==========================================================
  // REVIEWER
  // ==========================================================

  [ROLES.REVIEWER]: [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },

    {
      label: "Submissions",
      path: "/submissions",
      icon: FileText,
    },

    {
      label: "Documents & Evidence",
      path: "/documents",
      icon: UploadCloud,
    },

    {
      label: "Review & Approval",
      path: "/reviewer/queue",
      icon: CheckSquare,
    },

    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],

  // ==========================================================
  // DATA APPROVER
  // ==========================================================

  [ROLES.DATA_APPROVER]: [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },

    {
      label: "Submissions",
      path: "/submissions",
      icon: FileText,
    },

    {
      label: "Documents & Evidence",
      path: "/documents",
      icon: UploadCloud,
    },

    {
      label: "Review & Approval",
      path: "/review",
      icon: CheckSquare,
    },

    {
      label: "Reports",
      path: "/reports",
      icon: BarChart3,
    },

    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],

  // ==========================================================
  // PRINCIPAL / DIRECTOR
  // ==========================================================

  [ROLES.PRINCIPAL_DIRECTOR]: [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },

    {
      label: "Institution",
      path: "/institution",
      icon: Building,
    },

    {
      label: "Departments",
      path: "/departments",
      icon: Building2,
    },

    {
      label: "NAAC Criteria",
      path: "/criteria",
      icon: Award,
    },

    {
      label: "Submissions",
      path: "/submissions",
      icon: FileText,
    },

    {
      label: "Registration Approvals",
      path: "/admin/registration-requests",
      icon: UserCheck,
    },

    {
      label: "Reports",
      path: "/reports",
      icon: BarChart3,
    },

    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],

  // ==========================================================
  // INSTITUTION ADMIN
  //
  // Institution Admin manages ONLY their own institution.
  //
  // Allowed:
  // Dashboard
  // Institution
  // Departments
  // User Management
  // Notifications
  //
  // Not allowed:
  // NAAC Criteria
  // Documents & Evidence
  // Submissions
  // Review & Approval
  // Reports
  // Registration Requests
  // Role & Permissions
  // System Settings
  // Platform Institution Management
  // ==========================================================

  [ROLES.INSTITUTION_ADMIN]: [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },

    {
      label: "Institution",
      path: "/institution",
      icon: Building,
    },

    {
      label: "Departments",
      path: "/departments",
      icon: Building2,
    },

    {
      label: "User Management",
      path: "/admin/users",
      icon: Users,
    },

    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],

  // ==========================================================
  // PLATFORM ADMIN
  // ==========================================================

  [ROLES.ADMIN]: [
    {
      label: "Dashboard",
      path: "/admin-dashboard",
      icon: LayoutDashboard,
    },

    {
      label: "Institution Management",
      path: "/admin/institutions",
      icon: Building,
    },

    {
      label: "Institution Requests",
      path: "/admin/institution-requests",
      icon: ClipboardList,
    },

    {
      label: "Institution Requests",
      path: "/admin/institution-requests",
      icon: ClipboardList,
    },
    {
      label: "User Management",
      path: "/admin/users",
      icon: Users,
    },

    {
      label: "Role & Permissions",
      path: "/admin/roles",
      icon: ShieldCheck,
    },

    {
      label: "Departments",
      path: "/departments",
      icon: Building2,
    },

    {
      label: "System Settings",
      path: "/admin/settings",
      icon: Settings,
    },

    {
      label: "Reports",
      path: "/reports",
      icon: BarChart3,
    },

    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],
};

// ============================================================
// GET NAVIGATION FOR ROLE
// ============================================================

export const getNavigationForRole = (roleStr) => {
  const normalizedRole = normalizeRole(roleStr);

  return (
    NAVIGATION_CONFIG[normalizedRole] ||
    NAVIGATION_CONFIG[ROLES.NAAC_COORDINATOR]
  );
};



