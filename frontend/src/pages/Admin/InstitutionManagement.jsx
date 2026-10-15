import React, { useState, useEffect } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import api from "../../services/api";
import frameworkService from "../../services/frameworkService";
import { institutionFrameworkLabel } from "../../services/frameworkReadiness";
import {
  applyInstitutionRequestChange,
  categorySpecificPayload,
  validateOfficialCategory,
} from "../../services/institutionRequestProfile";
import DataTable from "../../components/common/DataTable";
import PageHeader from "../../components/common/PageHeader";

const EMPTY_INSTITUTION_FORM = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  institution_type: "",
  official_category: "",
  affiliated_university: "",
  autonomous_status: "",
  parent_institution_name: "",
  is_constituent_unit: false,
  programme_level: "",
  established_year: "",
  website: "",
};

export const InstitutionManagement = () => {
  // =========================================
  // STATE
  // =========================================

  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add / Edit Institution Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [categories, setCategories] = useState([]);

  // Form Data
  const [formData, setFormData] = useState(EMPTY_INSTITUTION_FORM);

  // =========================================
  // LOAD INSTITUTIONS
  // GET /institutions
  // =========================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("=================================");
      console.log("LOADING INSTITUTIONS...");
      console.log("API REQUEST: GET /institutions");

      const response = await api.get("/institutions");

      // IMPORTANT:
      // This lets us see exactly what backend returns.
      console.log(
        "INSTITUTIONS API RESPONSE:",
        response.data
      );

      // =========================================
      // HANDLE BACKEND RESPONSE
      // =========================================

      let data = [];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (
        Array.isArray(response.data?.data)
      ) {
        data = response.data.data;
      } else if (
        Array.isArray(response.data?.institutions)
      ) {
        data = response.data.institutions;
      }

      console.log(
        "INSTITUTIONS PARSED DATA:",
        data
      );

      console.log(
        "TOTAL INSTITUTIONS:",
        data.length
      );

      // =========================================
      // FORMAT DATA FOR TABLE
      // =========================================

      const formattedData = data.map(
        (institution) => ({
          ...institution,

          // Backend currently does not return status.
          // Since an institution exists in the
          // institutions table, show ACTIVE.
          status:
            institution.status || "ACTIVE",
        })
      );

      console.log(
        "FORMATTED INSTITUTIONS:",
        formattedData
      );

      setInstitutions(formattedData);

      console.log("INSTITUTIONS TABLE UPDATED");
      console.log("=================================");
    } catch (err) {
      console.error(
        "LOAD INSTITUTIONS ERROR:",
        err
      );

      const detail =
        err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item.msg)
            .join(", ")
        );
      } else {
        setError(
          detail ||
            "Failed to load institutions"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // LOAD DATA WHEN PAGE OPENS
  // =========================================

  useEffect(() => {
    loadData();
    frameworkService
      .getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // =========================================
  // OPEN ADD INSTITUTION MODAL
  // =========================================

  const handleCreate = () => {
    setFormData(EMPTY_INSTITUTION_FORM);

    setEditingId(null);
    setFormError("");
    setShowModal(true);
  };

  const handleEdit = (institution) => {
    setFormData({
      name: institution.name || "",
      code: institution.code || "",
      address: institution.address || "",
      city: institution.city || "",
      state: institution.state || "",
      pincode: institution.pincode || "",
      institution_type: institution.institution_type || "",
      official_category: institution.official_category || "",
      affiliated_university: institution.affiliated_university || "",
      autonomous_status: institution.autonomous_status || "",
      parent_institution_name: institution.parent_institution_name || "",
      is_constituent_unit: Boolean(institution.is_constituent_unit),
      programme_level: institution.programme_level || "",
      established_year: institution.established_year || "",
      website: institution.website || "",
    });

    setEditingId(institution.id);
    setFormError("");
    setShowModal(true);
  };

  const handleDelete = async (institution) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${institution.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await api.delete(`/institutions/${institution.id}`);
      await loadData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail.map((item) => item.msg).join(", ")
          : detail || "Failed to delete institution."
      );
    }
  };

  // =========================================
  // HANDLE FORM INPUT
  // =========================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) =>
      applyInstitutionRequestChange(
        prev,
        name,
        type === "checkbox" ? checked : value
      )
    );
  };

  // =========================================
  // SUBMIT INSTITUTION
  // POST /institutions or PUT /institutions/{id}
  // =========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFormError("");

    // =========================================
    // VALIDATION
    // =========================================

    if (!formData.name.trim()) {
      setFormError(
        "Institution name is required."
      );
      return;
    }

    if (!formData.code.trim()) {
      setFormError(
        "Institution code is required."
      );
      return;
    }

    if (!formData.city.trim()) {
      setFormError(
        "City is required."
      );
      return;
    }

    if (!formData.state.trim()) {
      setFormError(
        "State is required."
      );
      return;
    }

    if (
      !formData.institution_type.trim()
    ) {
      setFormError(
        "Institution type is required."
      );
      return;
    }

    const categoryError = validateOfficialCategory(
      formData.official_category,
      categories
    );
    if (categoryError) {
      setFormError(categoryError);
      return;
    }

    try {
      setSaving(true);

      // =========================================
      // CREATE PAYLOAD
      // =========================================

      const payload = {
        name: formData.name.trim(),

        code: formData.code
          .trim()
          .toUpperCase(),

        address:
          formData.address.trim() ||
          null,

        city: formData.city.trim(),

        state: formData.state.trim(),

        pincode:
          formData.pincode.trim() ||
          null,

        institution_type:
          formData.institution_type.trim(),

        official_category: formData.official_category,

        ...categorySpecificPayload(formData),

        established_year:
          formData.established_year
            ? Number(
                formData.established_year
              )
            : null,

        website:
          formData.website.trim() ||
          null,
      };

      console.log(
        "================================="
      );

      console.log(
        editingId
          ? "UPDATE INSTITUTION REQUEST:"
          : "CREATE INSTITUTION REQUEST:",
        payload
      );

      const response = editingId
        ? await api.put(
            `/institutions/${editingId}`,
            payload
          )
        : await api.post(
            "/institutions",
            payload
          );

      console.log(
        editingId
          ? "UPDATE INSTITUTION RESPONSE:"
          : "CREATE INSTITUTION RESPONSE:",
        response.data
      );

      console.log(
        "================================="
      );

      // =========================================
      // CLOSE MODAL
      // =========================================

      setShowModal(false);
      setEditingId(null);

      // =========================================
      // RELOAD INSTITUTIONS
      // =========================================

      await loadData();
    } catch (err) {
      console.error(
        "CREATE INSTITUTION ERROR:",
        err
      );

      const detail =
        err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setFormError(
          detail
            .map((item) => item.msg)
            .join(", ")
        );
      } else {
        setFormError(
          detail ||
            (editingId
              ? "Failed to update institution."
              : "Failed to create institution.")
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================
  // TABLE COLUMNS
  // =========================================

  const columns = [
    {
      title: "Institution Name",
      dataIndex: "name",
    },
    {
      title: "Code",
      dataIndex: "code",
    },
    {
      title: "City",
      dataIndex: "city",
    },
    {
      title: "State",
      dataIndex: "state",
    },
    {
      title: "Type",
      dataIndex: "institution_type",
    },
    {
      title: "NAAC Category",
      dataIndex: "official_category",
      render: (value) =>
        categories.find((item) => item.code === value)?.label ||
        value ||
        "Not set",
    },
    {
      title: "Framework",
      dataIndex: "confirmed_framework_id",
      render: (_value, institution) => (
        <span title={institution.eligible_cycle_framework_reason || ""}>
          {institutionFrameworkLabel(institution)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      isStatus: true,
    },
    {
      title: "Actions",
      dataIndex: "id",
      render: (_value, institution) => (
        <div
          style={{
            display: "flex",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => handleEdit(institution)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
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
            <Pencil size={12} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDelete(institution)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
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
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      ),
    },
  ];

  // =========================================
  // RETURN UI
  // =========================================

  return (
    <div>
      {/* =========================================
          PAGE HEADER
      ========================================= */}

      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Institution Management"
        description="Manage registered institutions, campus codes, and statutory accreditation parameters."
        primaryAction={{
          label: "Add Institution",
          icon: Plus,
          onClick: handleCreate,
        }}
      />

      {/* =========================================
          ERROR MESSAGE
      ========================================= */}

      {error && (
        <div
          style={{
            padding: "12px 14px",
            background: "#fef2f2",
            border:
              "1px solid #fecaca",
            color: "#dc2626",
            borderRadius: "8px",
            marginBottom: "15px",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {/* =========================================
          INSTITUTION TABLE
      ========================================= */}

      <div className="panel">
        <DataTable
          columns={columns}
          data={institutions}
          keyField="id"
          loading={loading}
          emptyMessage="No institutions registered."
        />
      </div>

      {/* =========================================
          ADD INSTITUTION MODAL
      ========================================= */}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.55)",
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
              maxWidth: "720px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "16px",
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.20)",
            }}
          >
            {/* =========================================
                MODAL HEADER
            ========================================= */}

            <div
              style={{
                padding:
                  "22px 26px",
                borderBottom:
                  "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing:
                      "1px",
                    color: "#64748b",
                    marginBottom:
                      "5px",
                  }}
                >
                  ADMINISTRATION
                </div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    color: "#172554",
                  }}
                >
                  {editingId
                    ? "Edit Institution"
                    : "Add Institution"}
                </h2>

                <p
                  style={{
                    margin:
                      "6px 0 0 0",
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  {editingId
                    ? "Update the registered institution details."
                    : "Register a new institution in EduVerse NAAC."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  !saving &&
                  setShowModal(false)
                }
                disabled={saving}
                style={{
                  border: "none",
                  background:
                    "#f1f5f9",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* =========================================
                FORM
            ========================================= */}

            <form
              onSubmit={handleSubmit}
              style={{
                padding: "26px",
              }}
            >
              {/* FORM ERROR */}

              {formError && (
                <div
                  style={{
                    padding:
                      "12px 14px",
                    marginBottom:
                      "20px",
                    background:
                      "#fef2f2",
                    border:
                      "1px solid #fecaca",
                    color: "#b91c1c",
                    borderRadius:
                      "8px",
                    fontSize: "13px",
                  }}
                >
                  {formError}
                </div>
              )}

              {/* =========================================
                  NAME + CODE
              ========================================= */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "18px",
                  marginBottom:
                    "18px",
                }}
              >
                <FormField
                  label="Institution Name"
                  name="name"
                  value={
                    formData.name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Smt. Kashibai Navale College of Engineering"
                  required
                />

                <FormField
                  label="Institution Code"
                  name="code"
                  value={
                    formData.code
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. SKNCOE"
                  required
                />
              </div>

              {/* =========================================
                  ADDRESS
              ========================================= */}

              <div
                style={{
                  marginBottom:
                    "18px",
                }}
              >
                <FormField
                  label="Address"
                  name="address"
                  value={
                    formData.address
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Full institution address"
                />
              </div>

              {/* =========================================
                  CITY + STATE
              ========================================= */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "18px",
                  marginBottom:
                    "18px",
                }}
              >
                <FormField
                  label="City"
                  name="city"
                  value={
                    formData.city
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Pune"
                  required
                />

                <FormField
                  label="State"
                  name="state"
                  value={
                    formData.state
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Maharashtra"
                  required
                />
              </div>

              {/* =========================================
                  PINCODE + TYPE
              ========================================= */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "18px",
                  marginBottom:
                    "18px",
                }}
              >
                <FormField
                  label="Pincode"
                  name="pincode"
                  value={
                    formData.pincode
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. 411041"
                />

                <FormField
                  label="Institution Type"
                  name="institution_type"
                  value={
                    formData.institution_type
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Engineering College"
                  required
                />
              </div>

              {/* =========================================
                  OFFICIAL NAAC CATEGORY
              ========================================= */}

              <div style={{ marginBottom: "18px" }}>
                <label style={LABEL_STYLE}>
                  Official NAAC Category
                  <span style={{ color: "#dc2626", marginLeft: "3px" }}>
                    *
                  </span>
                </label>
                <select
                  name="official_category"
                  value={formData.official_category}
                  onChange={handleChange}
                  required
                  style={INPUT_STYLE}
                >
                  <option value="">Select the official HEI category</option>
                  {categories.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <small style={{ fontSize: "12px", color: "#64748b" }}>
                  The NAAC framework and version are loaded from this
                  category. The free-text institution type is not used.
                </small>
              </div>

              {formData.official_category === "AFFILIATED_COLLEGE" ||
              formData.official_category === "CONSTITUENT_COLLEGE" ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "18px",
                    marginBottom: "18px",
                  }}
                >
                  <FormField
                    label={
                      formData.official_category === "CONSTITUENT_COLLEGE"
                        ? "Parent University"
                        : "Affiliating University"
                    }
                    name={
                      formData.official_category === "CONSTITUENT_COLLEGE"
                        ? "parent_institution_name"
                        : "affiliated_university"
                    }
                    value={
                      formData.official_category === "CONSTITUENT_COLLEGE"
                        ? formData.parent_institution_name
                        : formData.affiliated_university
                    }
                    onChange={handleChange}
                    placeholder="Required to load the framework"
                  />
                  <div>
                    <label style={LABEL_STYLE}>Programme Level</label>
                    <select
                      name="programme_level"
                      value={formData.programme_level}
                      onChange={handleChange}
                      style={INPUT_STYLE}
                    >
                      <option value="">Not specified</option>
                      <option value="UG">Undergraduate</option>
                      <option value="PG">Postgraduate</option>
                      <option value="BOTH">UG and PG</option>
                    </select>
                  </div>
                </div>
              ) : null}

              {formData.official_category === "AFFILIATED_COLLEGE" ? (
                <div style={{ marginBottom: "18px" }}>
                  <label style={LABEL_STYLE}>Autonomous Status</label>
                  <select
                    name="autonomous_status"
                    value={formData.autonomous_status}
                    onChange={handleChange}
                    style={INPUT_STYLE}
                  >
                    <option value="">Not autonomous</option>
                    <option value="autonomous">Granted autonomy</option>
                  </select>
                </div>
              ) : null}

              {formData.official_category === "CONSTITUENT_COLLEGE" ? (
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ ...LABEL_STYLE, fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      name="is_constituent_unit"
                      checked={Boolean(formData.is_constituent_unit)}
                      onChange={handleChange}
                      style={{ marginRight: "8px" }}
                    />
                    Constituent unit of the parent university
                  </label>
                </div>
              ) : null}

              {/* =========================================
                  YEAR + WEBSITE
              ========================================= */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "18px",
                  marginBottom:
                    "25px",
                }}
              >
                <FormField
                  label="Established Year"
                  name="established_year"
                  type="number"
                  value={
                    formData.established_year
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. 2002"
                />

                <FormField
                  label="Website"
                  name="website"
                  value={
                    formData.website
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="https://example.com"
                />
              </div>

              {/* =========================================
                  ACTION BUTTONS
              ========================================= */}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: "12px",
                  borderTop:
                    "1px solid #e5e7eb",
                  paddingTop: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={saving}
                  style={{
                    padding:
                      "11px 20px",
                    border:
                      "1px solid #d1d5db",
                    background:
                      "#ffffff",
                    borderRadius:
                      "8px",
                    cursor: saving
                      ? "not-allowed"
                      : "pointer",
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
                    padding:
                      "11px 22px",
                    border: "none",
                    background:
                      "#2563eb",
                    color:
                      "#ffffff",
                    borderRadius:
                      "8px",
                    cursor: saving
                      ? "not-allowed"
                      : "pointer",
                    fontWeight: 600,
                    minWidth:
                      "150px",
                  }}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Institution"
                    : "Create Institution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================
// REUSABLE FORM FIELD
// =========================================

const LABEL_STYLE = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#334155",
  marginBottom: "7px",
};

const INPUT_STYLE = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 13px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  outline: "none",
  fontSize: "13px",
  color: "#1e293b",
  background: "#ffffff",
};

const FormField = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) => {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 600,
          color: "#334155",
          marginBottom: "7px",
        }}
      >
        {label}

        {required && (
          <span
            style={{
              color: "#dc2626",
              marginLeft: "3px",
            }}
          >
            *
          </span>
        )}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "11px 13px",
          border:
            "1px solid #d1d5db",
          borderRadius: "8px",
          outline: "none",
          fontSize: "13px",
          color: "#1e293b",
          background: "#ffffff",
        }}
      />
    </div>
  );
};

export default InstitutionManagement;