import React from "react";
import PageHeader from "../../components/common/PageHeader";
import { ALL_ROLES } from "../../config/roles";
import { ROLE_FALLBACK_PERMISSIONS } from "../../config/permissions";

export const RolePermissions = () => {
  return (
    <div>
      <PageHeader
        eyebrow="SECURITY & ACCESS CONTROL"
        title="Role & Permission Matrix"
        description="Inspect active permission mappings for the 7 institutional roles."
      />
      <div className="panel">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Role Name</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Total Permissions</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Access Privileges</th>
              </tr>
            </thead>
            <tbody>
              {ALL_ROLES.map((role) => {
                const perms = ROLE_FALLBACK_PERMISSIONS[role] || [];
                return (
                  <tr key={role} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px", fontWeight: "700", color: "#1e293b" }}>{role}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ padding: "3px 8px", background: "#eff6ff", color: "#2563eb", borderRadius: "10px", fontSize: "11px", fontWeight: "700" }}>
                        {role === "Admin" ? "Full Access (ALL)" : `${perms.length} Permissions`}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: "#475569", fontSize: "11px" }}>
                      {role === "Admin" ? "Full administrative authority across all modules & settings." : perms.join(", ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RolePermissions;
