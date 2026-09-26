import React, { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import committeeService from "../../services/committeeService";

const CommitteeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    chairperson: "",
    status: "Active",
  });

  const [loading, setLoading] = useState(
    isEditMode
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const loadCommittee = async () => {
      try {
        setLoading(true);
        setError("");

        const committee =
          await committeeService.getCommittee(
            id
          );

        if (!committee) {
          setError(
            "Committee not found."
          );
          return;
        }

        setFormData({
          name: committee.name || "",
          description:
            committee.description || "",
          chairperson:
            committee.chairperson || "",
          status:
            committee.status || "Active",
        });
      } catch (error) {
        console.error(
          "Failed to load committee:",
          error
        );

        setError(
          "Unable to load committee."
        );
      } finally {
        setLoading(false);
      }
    };

    loadCommittee();
  }, [id, isEditMode]);

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError(
        "Committee name is required."
      );
      return;
    }

    try {
      setSaving(true);

      if (isEditMode) {
        await committeeService.updateCommittee(
          id,
          formData
        );

        setSuccess(
          "Committee updated successfully."
        );
      } else {
        await committeeService.createCommittee(
          formData
        );

        setSuccess(
          "Committee created successfully."
        );
      }

      setTimeout(() => {
        navigate("/committees");
      }, 700);
    } catch (error) {
      console.error(
        "Failed to save committee:",
        error
      );

      setError(
        error?.message ||
          "Unable to save committee."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "30px",
          color: "#64748b",
        }}
      >
        Loading committee...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        color: "#1e293b",
        maxWidth: "900px",
      }}
    >
      {/* BACK */}
      <button
        type="button"
        onClick={() =>
          navigate("/committees")
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          border: "none",
          background: "transparent",
          color: "#2563eb",
          cursor: "pointer",
          fontWeight: "600",
          padding: 0,
          marginBottom: "18px",
        }}
      >
        <ArrowLeft size={17} />
        Back to Committees
      </button>

      {/* HEADER */}
      <div
        style={{
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: "#64748b",
            letterSpacing: "0.08em",
            marginBottom: "6px",
          }}
        >
          COMMITTEE MANAGEMENT
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            color: "#0f172a",
          }}
        >
          {isEditMode
            ? "Edit Committee"
            : "Create Committee"}
        </h1>

        <p
          style={{
            margin:
              "7px 0 0",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          {isEditMode
            ? "Update committee information and status."
            : "Create a committee for institutional NAAC activities."}
        </p>
      </div>

      {/* FORM CARD */}
      <div
        style={{
          background: "#ffffff",
          border:
            "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        {error && (
          <div
            style={{
              marginBottom: "18px",
              padding:
                "11px 13px",
              background: "#fef2f2",
              border:
                "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: "7px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              marginBottom: "18px",
              padding:
                "11px 13px",
              background: "#f0fdf4",
              border:
                "1px solid #bbf7d0",
              color: "#166534",
              borderRadius: "7px",
              fontSize: "14px",
            }}
          >
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >
          {/* NAME */}
          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <label
              style={labelStyle}
            >
              Committee Name
              <span
                style={{
                  color: "#dc2626",
                }}
              >
                {" "}
                *
              </span>
            </label>

            <input
              type="text"
              name="name"
              value={
                formData.name
              }
              onChange={
                handleChange
              }
              placeholder="Enter committee name"
              style={
                inputStyle
              }
            />
          </div>

          {/* DESCRIPTION */}
          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <label
              style={labelStyle}
            >
              Description
            </label>

            <textarea
              name="description"
              value={
                formData.description
              }
              onChange={
                handleChange
              }
              placeholder="Describe the purpose and responsibilities of this committee"
              rows={5}
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </div>

          {/* CHAIRPERSON */}
          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <label
              style={labelStyle}
            >
              Chairperson
            </label>

            <input
              type="text"
              name="chairperson"
              value={
                formData.chairperson
              }
              onChange={
                handleChange
              }
              placeholder="Enter chairperson name"
              style={
                inputStyle
              }
            />
          </div>

          {/* STATUS */}
          <div
            style={{
              marginBottom: "24px",
            }}
          >
            <label
              style={labelStyle}
            >
              Status
            </label>

            <select
              name="status"
              value={
                formData.status
              }
              onChange={
                handleChange
              }
              style={
                inputStyle
              }
            >
              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>
          </div>

          {/* ACTIONS */}
          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              gap: "10px",
              paddingTop:
                "18px",
              borderTop:
                "1px solid #e2e8f0",
            }}
          >
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/committees"
                )
              }
              disabled={saving}
              style={{
                padding:
                  "10px 17px",
                background:
                  "#ffffff",
                border:
                  "1px solid #cbd5e1",
                borderRadius:
                  "7px",
                color:
                  "#334155",
                cursor:
                  saving
                    ? "not-allowed"
                    : "pointer",
                fontWeight:
                  "600",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "7px",
                padding:
                  "10px 17px",
                background:
                  saving
                    ? "#94a3b8"
                    : "#2563eb",
                color:
                  "#ffffff",
                border:
                  "none",
                borderRadius:
                  "7px",
                cursor:
                  saving
                    ? "not-allowed"
                    : "pointer",
                fontWeight:
                  "600",
              }}
            >
              <Save size={17} />

              {saving
                ? "Saving..."
                : isEditMode
                ? "Update Committee"
                : "Create Committee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontSize: "13px",
  fontWeight: "700",
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border:
    "1px solid #cbd5e1",
  borderRadius: "7px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  outline: "none",
};

export default CommitteeForm;