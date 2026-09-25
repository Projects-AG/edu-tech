import React, { useState, useEffect } from "react";
import departmentService from "../services/departmentService";
import DataTable from "../components/common/DataTable";
import PageHeader from "../components/common/PageHeader";
import PermissionGuard from "../components/common/PermissionGuard";
import { PERMISSIONS } from "../config/permissions";

export const Departments = () => {
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    departmentService.getDepartments().then((data) => {
      if (Array.isArray(data)) {
        const formatted = data.map((dept) => ({
          id: dept.id,
          code: dept.code || `DEPT-${dept.id}`,
          name: dept.name || "Academic Department",
          head: dept.head || "Department Head",
          facultyCount: dept.facultyCount || dept.faculty_count || 12,
          completion: dept.completion || dept.completion_percentage || 78,
        }));
        setDepartments(formatted);
      } else {
        setDepartments([]);
      }
    }).catch(() => setDepartments([]));
  }, []);

  const columns = [
    { title: "Code", dataIndex: "code" },
    { title: "Department Name", dataIndex: "name" },
    { title: "Department Head", dataIndex: "head" },
    { title: "Faculty Count", dataIndex: "facultyCount" },
    {
      title: "Completion",
      dataIndex: "completion",
      render: (val) => {
        const pct = val ?? 0;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="criterion-bar" style={{ width: "100px" }}>
              <div className="criterion-fill" style={{ width: `${pct}%` }} />
            </div>
            <strong style={{ color: "#0f172a" }}>{pct}%</strong>
          </div>
        );
      },
    },
    {
      title: "Actions",
      dataIndex: "id",
      render: () => (
        <PermissionGuard permission={PERMISSIONS.DEPARTMENTS_MANAGE}>
          <button style={{ padding: "4px 8px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: "4px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
            Manage
          </button>
        </PermissionGuard>
      ),
    },
  ];

  return (
    <div style={{ color: "#1e293b" }}>
      <PageHeader eyebrow="ACADEMIC UNITS" title="Department Management" description="Monitor departmental criteria progress, faculty allocations, and document collection." />
      <div className="panel" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
        <DataTable columns={columns} data={departments} keyField="id" emptyMessage="No department records available." />
      </div>
    </div>
  );
};

export default Departments;
