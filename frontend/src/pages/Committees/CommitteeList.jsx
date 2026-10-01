import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

import committeeService from "../../services/committeeService";

const CommitteeList = () => {
  const navigate = useNavigate();

  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // ---------------------------------------------------------
  // Load committees
  // ---------------------------------------------------------

  const loadCommittees = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await committeeService.getCommittees();

      setCommittees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load committees:", error);

      setError("Unable to load committees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommittees();
  }, []);

  // ---------------------------------------------------------
  // Search
  // ---------------------------------------------------------

  const filteredCommittees = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) {
      return committees;
    }

    return committees.filter(
      (committee) =>
        committee.name?.toLowerCase().includes(searchText) ||
        committee.description?.toLowerCase().includes(searchText) ||
        committee.chairperson?.toLowerCase().includes(searchText)
    );
  }, [committees, search]);

  // ---------------------------------------------------------
  // Delete committee
  // ---------------------------------------------------------

  const handleDelete = async (committee) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${committee.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await committeeService.deleteCommittee(committee.id);

      await loadCommittees();
    } catch (error) {
      console.error("Failed to delete committee:", error);

      setError("Unable to delete committee.");
    }
  };

  // ---------------------------------------------------------
  // Format date
  // ---------------------------------------------------------

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div
      style={{
        padding: "24px",
        color: "#1e293b",
      }}
    >
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
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
              fontWeight: "700",
              color: "#0f172a",
            }}
          >
            Committees
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Create and manage institutional committees for NAAC activities.
          </p>
        </div>

        {/* Create Committee */}
        <button
          type="button"
          onClick={() => navigate("/committees/new")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "7px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          <Plus size={18} />
          Create Committee
        </button>
      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            borderRadius: "8px",
          }}
        >
          {error}
        </div>
      )}

      {/* =====================================================
          MAIN CARD
      ====================================================== */}

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* ===================================================
            TOOLBAR
        ==================================================== */}

        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong
              style={{
                fontSize: "16px",
              }}
            >
              Committee List
            </strong>

            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginTop: "3px",
              }}
            >
              {filteredCommittees.length} committee
              {filteredCommittees.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            {/* Search */}
            <input
              type="text"
              placeholder="Search committees..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{
                width: "240px",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "7px",
                outline: "none",
              }}
            />

            {/* Refresh */}
            <button
              type="button"
              onClick={loadCommittees}
              title="Refresh"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "38px",
                height: "38px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                borderRadius: "7px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* ===================================================
            LOADING
        ==================================================== */}

        {loading ? (
          <div
            style={{
              padding: "50px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            Loading committees...
          </div>
        ) : filteredCommittees.length === 0 ? (
          /* =================================================
             EMPTY STATE
          ================================================== */

          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <h3
              style={{
                margin: "0 0 8px",
                color: "#334155",
              }}
            >
              No committees found
            </h3>

            <p
              style={{
                margin: "0 0 18px",
              }}
            >
              Create your first committee to get started.
            </p>

            <button
              type="button"
              onClick={() => navigate("/committees/new")}
              style={{
                padding: "9px 15px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "7px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Create Committee
            </button>
          </div>
        ) : (
          /* =================================================
             TABLE
          ================================================== */

          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                  }}
                >
                  <th style={headerStyle}>Committee</th>

                  <th style={headerStyle}>Chairperson</th>

                  <th style={headerStyle}>Members</th>

                  <th style={headerStyle}>Criteria</th>

                  <th style={headerStyle}>Status</th>

                  <th style={headerStyle}>Created</th>

                  <th
                    style={{
                      ...headerStyle,
                      textAlign: "right",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCommittees.map((committee) => (
                  <tr
                    key={committee.id}
                    style={{
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    {/* Committee */}
                    <td style={cellStyle}>
                      <div
                        style={{
                          fontWeight: "700",
                          color: "#0f172a",
                        }}
                      >
                        {committee.name}
                      </div>

                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "12px",
                          color: "#64748b",
                          maxWidth: "320px",
                        }}
                      >
                        {committee.description || "No description"}
                      </div>
                    </td>

                    {/* Chairperson */}
                    <td style={cellStyle}>
                      {committee.chairperson || "-"}
                    </td>

                    {/* Members Count */}
                    <td style={cellStyle}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Users size={15} />

                        {committee.memberCount ?? 0}
                      </div>
                    </td>

                    {/* Criteria Count */}
                    <td style={cellStyle}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <ClipboardList size={15} />

                        {committee.criteriaCount ?? 0}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={cellStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "5px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background:
                            committee.status === "Active"
                              ? "#dcfce7"
                              : "#f1f5f9",
                          color:
                            committee.status === "Active"
                              ? "#166534"
                              : "#475569",
                        }}
                      >
                        {committee.status}
                      </span>
                    </td>

                    {/* Created */}
                    <td style={cellStyle}>
                      {formatDate(committee.createdAt)}
                    </td>

                    {/* =================================================
                        ACTIONS
                    ================================================== */}

                    <td
                      style={{
                        ...cellStyle,
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: "7px",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Members */}
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/committees/${committee.id}/members`
                            )
                          }
                          style={{
                            ...actionButtonStyle,
                            color: "#2563eb",
                            borderColor: "#bfdbfe",
                            background: "#eff6ff",
                          }}
                          title="Manage committee members"
                        >
                          <Users size={15} />
                          Members
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/committees/${committee.id}/edit`
                            )
                          }
                          style={actionButtonStyle}
                          title="Edit committee"
                        >
                          <Pencil size={15} />
                          Edit
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(committee)}
                          style={{
                            ...actionButtonStyle,
                            color: "#dc2626",
                            borderColor: "#fecaca",
                            background: "#fffafa",
                          }}
                          title="Delete committee"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ===========================================================
// Styles
// ===========================================================

const headerStyle = {
  padding: "13px 16px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: "700",
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const cellStyle = {
  padding: "15px 16px",
  fontSize: "13px",
  color: "#334155",
  verticalAlign: "middle",
};

const actionButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  padding: "7px 10px",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  color: "#334155",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
};

export default CommitteeList;