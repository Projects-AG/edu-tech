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

export const NAVIGATION_CONFIG = {
  [ROLES.COORDINATOR]: [
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
      label: "Registration Approvals",
      path: "/admin/registration-requests",
      icon: UserCheck,
    },
    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],

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
      path: "/review",
      icon: CheckSquare,
    },
    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],

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

export const getNavigationForRole = (
  roleStr
) => {
  const normalized =
    normalizeRole(roleStr);

  return (
    NAVIGATION_CONFIG[
      normalized
    ] ||
    NAVIGATION_CONFIG[
      ROLES.COORDINATOR
    ]
  );
};



