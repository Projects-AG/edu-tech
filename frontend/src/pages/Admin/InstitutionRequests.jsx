import React, { useEffect, useState } from "react";
import { Check, X, RefreshCw, Eye } from "lucide-react";
import api from "../../services/api";
import PageHeader from "../../components/common/PageHeader";

const InstitutionRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [processingId, setProcessingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await api.get("/institution-requests");

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      setRequests(data);
    } catch (err) {
      console.error("LOAD INSTITUTION REQUESTS ERROR:", err);

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(detail.map((item) => item.msg).join(", "));
      } else {
        setError(detail || "Failed to load institution requests.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // -----------------------------------------
  // APPROVE REQUEST
  // -----------------------------------------
  const handleApprove = async (request) => {
    const confirmed = window.confirm(
      `Approve "${request.institution_name}"?\n\nThis will create the institution in EduVerse.`
    );

    if (!confirmed) return;

    try {
      setProcessingId(request.id);
      setError("");
      setSuccessMessage("");

      const response = await api.post(
        `/institution-requests/${request.id}/approve`
      );

      console.log("APPROVE RESPONSE:", response.data);

      setSuccessMessage(
        `"${request.institution_name}" has been approved successfully.`
      );

      await loadRequests();
    } catch (err) {
      console.error("APPROVE REQUEST ERROR:", err);

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(detail.map((item) => item.msg).join(", "));
      } else {
        setError(detail || "Failed to approve institution request.");
      }
    } finally {
      setProcessingId(null);
    }
  };

  // -----------------------------------------
  // REJECT REQUEST
  // -----------------------------------------
  const handleReject = async (request) => {
    const reason = window.prompt(
      `Enter rejection reason for "${request.institution_name}":`
    );

    if (reason === null) return;

    try {
      setProcessingId(request.id);
      setError("");
      setSuccessMessage("");

      const response = await api.post(
        `/institution-requests/${request.id}/reject`,
        {
          reason: reason.trim() || "Request rejected by administrator.",
        }
      );

      console.log("REJECT RESPONSE:", response.data);

      setSuccessMessage(
        `"${request.institution_name}" has been rejected.`
      );

      await loadRequests();
    } catch (err) {
      console.error("REJECT REQUEST ERROR:", err);

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(detail.map((item) => item.msg).join(", "));
      } else {
        setError(detail || "Failed to reject institution request.");
      }
    } finally {
      setProcessingId(null);
    }
  };

  // -----------------------------------------
  // VIEW DETAILS
  // -----------------------------------------
  const handleView = (request) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };

  return (
    <div>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Institution Requests"
        description="Review and manage requests from institutions seeking registration on EduVerse NAAC."
        primaryAction={{
          label: loading ? "Refreshing..." : "Refresh",
          icon: RefreshCw,
          onClick: loadRequests,
        }}
      />

      {error && (
        <div
          style={{
            padding: "13px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            borderRadius: "10px",
            marginBottom: "18px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: "13px 16px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
            borderRadius: "10px",
            marginBottom: "18px",
            fontSize: "14px",
          }}
        >
          {successMessage}
        </div>
      )}

      <div
        className="panel"
        style={{
          overflowX: "auto",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "50px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            Loading institution requests...
          </div>
        ) : requests.length === 0 ? (
          <div
            style={{
              padding: "50px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            No institution requests found.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "950px",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  textAlign: "left",
                }}
              >
                <th style={thStyle}>Institution</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Requester</th>
                <th style={thStyle}>Official Email</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {requests.map((request) => (
                <tr
                  key={request.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <td style={tdStyle}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#172554",
                      }}
                    >
                      {request.institution_name}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "3px",
                      }}
                    >
                      Request #{request.id}
                    </div>
                  </td>

                  <td style={tdStyle}>
                    {request.institution_code || "—"}
                  </td>

                  <td style={tdStyle}>
                    <div>{request.requester_name}</div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      {request.requester_email}
                    </div>
                  </td>

                  <td style={tdStyle}>
                    {request.official_email || "—"}
                  </td>

                  <td style={tdStyle}>
                    {request.city || "—"}
                    {request.state
                      ? `, ${request.state}`
                      : ""}
                  </td>

                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-flex",
                        padding: "5px 10px",
                        borderRadius: "999px",
                        background:
                          request.status === "PENDING"
                            ? "#fff7ed"
                            : request.status === "APPROVED"
                            ? "#f0fdf4"
                            : "#fef2f2",
                        color:
                          request.status === "PENDING"
                            ? "#c2410c"
                            : request.status === "APPROVED"
                            ? "#166534"
                            : "#b91c1c",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {request.status}
                    </span>
                  </td>

                  <td style={tdStyle}>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleView(request)}
                        style={viewButtonStyle}
                        title="View details"
                      >
                        <Eye size={15} />
                      </button>

                      {request.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            disabled={processingId === request.id}
                            onClick={() =>
                              handleApprove(request)
                            }
                            style={approveButtonStyle}
                          >
                            <Check size={15} />
                            {processingId === request.id
                              ? "Processing..."
                              : "Approve"}
                          </button>

                          <button
                            type="button"
                            disabled={processingId === request.id}
                            onClick={() =>
                              handleReject(request)
                            }
                            style={rejectButtonStyle}
                          >
                            <X size={15} />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* DETAILS MODAL */}
      {showDetails && selectedRequest && (
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
              maxWidth: "650px",
              maxHeight: "90vh",
              overflowY: "auto",
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
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "1px",
                    color: "#64748b",
                  }}
                >
                  INSTITUTION REQUEST
                </div>

                <h2
                  style={{
                    margin: "5px 0 0",
                    fontSize: "22px",
                    color: "#172554",
                  }}
                >
                  {selectedRequest.institution_name}
                </h2>
              </div>

              <button
                onClick={() => setShowDetails(false)}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: "26px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
              }}
            >
              <Detail label="Request ID" value={selectedRequest.id} />
              <Detail
                label="Status"
                value={selectedRequest.status}
              />

              <Detail
                label="Institution Code"
                value={selectedRequest.institution_code}
              />

              <Detail
                label="Institution Type"
                value={selectedRequest.institution_type}
              />

              <Detail
                label="Requester"
                value={selectedRequest.requester_name}
              />

              <Detail
                label="Requester Email"
                value={selectedRequest.requester_email}
              />

              <Detail
                label="Official Email"
                value={selectedRequest.official_email}
              />

              <Detail
                label="City"
                value={selectedRequest.city}
              />

              <Detail
                label="State"
                value={selectedRequest.state}
              />

              <Detail
                label="Pincode"
                value={selectedRequest.pincode}
              />

              <div style={{ gridColumn: "1 / -1" }}>
                <Detail
                  label="Address"
                  value={selectedRequest.address}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Detail
                  label="Website"
                  value={selectedRequest.website}
                />
              </div>
            </div>

            {selectedRequest.status === "PENDING" && (
              <div
                style={{
                  padding: "0 26px 26px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  onClick={() => {
                    setShowDetails(false);
                    handleReject(selectedRequest);
                  }}
                  style={rejectButtonStyle}
                >
                  <X size={15} />
                  Reject
                </button>

                <button
                  onClick={() => {
                    setShowDetails(false);
                    handleApprove(selectedRequest);
                  }}
                  style={approveButtonStyle}
                >
                  <Check size={15} />
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Detail = ({ label, value }) => (
  <div>
    <div
      style={{
        fontSize: "11px",
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        marginBottom: "5px",
      }}
    >
      {label}
    </div>

    <div
      style={{
        fontSize: "14px",
        color: "#1e293b",
        fontWeight: 500,
        wordBreak: "break-word",
      }}
    >
      {value || "—"}
    </div>
  </div>
);

const thStyle = {
  padding: "15px 14px",
  fontSize: "12px",
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
};

const tdStyle = {
  padding: "16px 14px",
  fontSize: "13px",
  color: "#334155",
  verticalAlign: "middle",
};

const viewButtonStyle = {
  border: "1px solid #dbeafe",
  background: "#eff6ff",
  color: "#2563eb",
  borderRadius: "7px",
  padding: "8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};

const approveButtonStyle = {
  border: "none",
  background: "#166534",
  color: "#ffffff",
  borderRadius: "7px",
  padding: "8px 12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "5px",
  fontSize: "12px",
  fontWeight: 600,
};

const rejectButtonStyle = {
  border: "none",
  background: "#dc2626",
  color: "#ffffff",
  borderRadius: "7px",
  padding: "8px 12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "5px",
  fontSize: "12px",
  fontWeight: 600,
};

export default InstitutionRequests;
