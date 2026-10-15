import React, { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import departmentService from "../services/departmentService";
import DataTable from "../components/common/DataTable";
import PageHeader from "../components/common/PageHeader";
import PermissionGuard from "../components/common/PermissionGuard";
import { PERMISSIONS } from "../config/permissions";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  name: "",
  code: "",
  head_name: "",
};

const DEPARTMENT_CREATE_PERMISSION = "INSTITUTION_MANAGEMENT:Create";
const DEPARTMENT_DELETE_PERMISSION = "INSTITUTION_MANAGEMENT:Delete";

export const Departments = () => {
  const { user, hasPermission } = useAuth();
  const canCreateDepartment = hasPermission(DEPARTMENT_CREATE_PERMISSION);

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await departmentService.getDepartments(
        user?.institution_id
      );

      const formatted = (Array.isArray(data) ? data : []).map((dept) => ({
        id: dept.id,
        code: dept.code || "-",
        name: dept.name || "-",
        head: dept.head_name || "-",
        institution_id: dept.institution_id,
        head_name: dept.head_name || "",
      }));

      setDepartments(formatted);
    } catch (err) {
      console.error("Failed to load departments:", err);
      setDepartments([]);
      setError(err.message || "Unable to load departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.institution_id]);

  const handleCreate = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setFormError("");
    setShowModal(true);
  };

  const handleEdit = (department) => {
    setFormData({
      name: department.name || "",
      code: department.code || "",
      head_name: department.head_name || "",
    });
    setEditingId(department.id);
    setFormError("");
    setShowModal(true);
  };

  const handleDelete = async (department) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${department.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await departmentService.deleteDepartment(department.id);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete department.");
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Department name is required.");
      return;
    }

    if (!formData.code.trim()) {
      setFormError("Department code is required.");
      return;
    }

    if (!editingId && !user?.institution_id) {
      setFormError("Your account is not assigned to an institution.");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await departmentService.updateDepartment(editingId, {
          name: formData.name.trim(),
          code: formData.code.trim(),
          head_name: formData.head_name.trim() || null,
        });
      } else {
        await departmentService.createDepartment({
          name: formData.name.trim(),
          code: formData.code.trim(),
          head_name: formData.head_name.trim() || null,
          institution_id: Number(user.institution_id),
        });
      }

      setShowModal(false);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setFormError(err.message || "Failed to save department.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "Code", dataIndex: "code" },
    { title: "Department Name", dataIndex: "name" },
    { title: "Department Head", dataIndex: "head" },
    {
      title: "Actions",
      dataIndex: "id",
      render: (_value, department) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <PermissionGuard permission={PERMISSIONS.DEPARTMENTS_MANAGE}>
            <button
              type="button"
              onClick={() => handleEdit(department)}
              style={{
                padding: "4px 8px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#2563eb",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Manage
            </button>
          </PermissionGuard>
          <PermissionGuard permission={DEPARTMENT_DELETE_PERMISSION}>
            <button
              type="button"
              onClick={() => handleDelete(department)}
              style={{
                padding: "4px 8px",
                background: "#fffafa",
                border: "1px solid #fecaca",
                color: "#dc2626",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div style={{ color: "#1e293b" }}>
      <PageHeader
        eyebrow="ACADEMIC UNITS"
        title="Department Management"
        description="Monitor departmental criteria progress, faculty allocations, and document collection."
        primaryAction={
          canCreateDepartment
            ? {
                label: "Add Department",
                icon: Plus,
                onClick: handleCreate,
              }
            : undefined
        }
      />

      {error && (
        <div
          style={{
            padding: "12px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            borderRadius: "8px",
            marginBottom: "15px",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div className="panel" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
        {loading ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
            Loading departments...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={departments}
            keyField="id"
            emptyMessage="No department records available."
          />
        )}
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.20)",
            }}
          >
            <div
              style={{
                padding: "22px 26px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "20px", color: "#172554" }}>
                {editingId ? "Edit Department" : "Add Department"}
              </h2>
              <button
                type="button"
                onClick={() => !saving && setShowModal(false)}
                disabled={saving}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "26px" }}>
              {formError && (
                <div
                  style={{
                    padding: "12px 14px",
                    marginBottom: "20px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                >
                  {formError}
                </div>
              )}

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "7px" }}>
                  Department Name <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science & Engineering"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 13px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    outline: "none",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "7px" }}>
                  Code <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. CSE"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 13px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    outline: "none",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "7px" }}>
                  Department Head
                </label>
                <input
                  name="head_name"
                  value={formData.head_name}
                  onChange={handleChange}
                  placeholder="e.g. Dr. R. Verma"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 13px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    outline: "none",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  style={{
                    padding: "11px 20px",
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    borderRadius: "8px",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    color: "#475569",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "11px 22px",
                    border: "none",
                    background: "#2563eb",
                    color: "#ffffff",
                    borderRadius: "8px",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: 600,
                  }}
                >
                  {saving ? "Saving..." : editingId ? "Update Department" : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
