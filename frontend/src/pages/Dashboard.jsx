import React from "react";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../config/roles";
import CoordinatorView from "./RoleDashboards/CoordinatorView";
import CommitteeMemberView from "./RoleDashboards/CommitteeMemberView";
import DeptCoordinatorView from "./RoleDashboards/DeptCoordinatorView";
import ReviewerView from "./RoleDashboards/ReviewerView";
import DataApproverView from "./RoleDashboards/DataApproverView";
import PrincipalDirectorView from "./RoleDashboards/PrincipalDirectorView";
import AdminView from "./RoleDashboards/AdminView";

function Dashboard() {
  const { activeRole } = useAuth();

  switch (activeRole) {
    case ROLES.ADMIN:
      return <AdminView />;
    case ROLES.COMMITTEE_MEMBER:
      return <CommitteeMemberView />;
    case ROLES.DEPT_COORDINATOR:
      return <DeptCoordinatorView />;
    case ROLES.REVIEWER:
      return <ReviewerView />;
    case ROLES.DATA_APPROVER:
      return <DataApproverView />;
    case ROLES.PRINCIPAL_DIRECTOR:
      return <PrincipalDirectorView />;
    case ROLES.COORDINATOR:
    default:
      return <CoordinatorView />;
  }
}

export default Dashboard;