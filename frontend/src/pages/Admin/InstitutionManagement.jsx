import React, { useState, useEffect } from "react";
import { Plus, X, RefreshCw } from "lucide-react";
import api from "../../services/api";
import DataTable from "../../components/common/DataTable";
import PageHeader from "../../components/common/PageHeader";

export const InstitutionManagement = () => {
  // =========================================
  // STATE
  // =========================================

  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add Institution Modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Form Data
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    institution_type: "",
    established_year: "",
    website: "",
  });

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
  }, []);

  // =========================================
  // OPEN ADD INSTITUTION MODAL
  // =========================================

  const handleCreate = () => {
    setFormData({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      institution_type: "",
      established_year: "",
      website: "",
    });

    setFormError("");
    setShowModal(true);
  };

  // =========================================
  // HANDLE FORM INPUT
  // =========================================

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================
  // SUBMIT NEW INSTITUTION
  // POST /institutions
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
        "CREATE INSTITUTION REQUEST:",
        payload
      );

      // =========================================
      // POST /institutions
      // =========================================

      const response =
        await api.post(
          "/institutions",
          payload
        );

      console.log(
        "CREATE INSTITUTION RESPONSE:",
        response.data
      );

      console.log(
        "================================="
      );

      // =========================================
      // CLOSE MODAL
      // =========================================

      setShowModal(false);

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
            "Failed to create institution."
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
      title: "Status",
      dataIndex: "status",
      isStatus: true,
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
                  Add Institution
                </h2>

                <p
                  style={{
                    margin:
                      "6px 0 0 0",
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  Register a new institution
                  in EduVerse NAAC.
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
                    ? "Creating..."
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