import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Send,
  Eye,
  CheckCircle,
  RotateCcw,
  XCircle,
} from "lucide-react";

import submissionService from "../services/submissionService";
import DataTable from "../components/common/DataTable";
import PageHeader from "../components/common/PageHeader";
import { ROLES } from "../config/roles";
import { useAuth } from "../context/AuthContext";

const DEPARTMENT_UNASSIGNED_MESSAGE =
  "Your account is not assigned to a department. Please contact an administrator.";

const isDepartmentUnassignedError = (error) => {
  const detail = error?.response?.data?.detail;

  return (
    error?.response?.status === 403 &&
    String(detail || "").includes("User is not assigned to a department")
  );
};

export const Submissions = () => {
  const navigate = useNavigate();
  const { activeRole } = useAuth();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  // ==========================================================
  // USER / ROLE
  // ==========================================================

  const role = activeRole;

  // ==========================================================
  // ROLE ACCESS
  // ==========================================================

  const allowedSubmissionRoles = [
    ROLES.NAAC_COORDINATOR,
    ROLES.DEPT_COORDINATOR,
    ROLES.COMMITTEE_MEMBER,
    ROLES.DATA_APPROVER,
    ROLES.PRINCIPAL_DIRECTOR,
  ];

  const isSubmissionAuthorized =
    allowedSubmissionRoles.includes(role);

  // ==========================================================
  // DATA ENTRY ROLES
  // ==========================================================

  const isDataEntryRole = [
    ROLES.NAAC_COORDINATOR,
    ROLES.DEPT_COORDINATOR,
  ].includes(role);

  // ==========================================================
  // REVIEWER
  // ==========================================================

  const isReviewer = role === ROLES.REVIEWER;

  // ==========================================================
  // DATA APPROVER
  // ==========================================================

  const isDataApprover = role === ROLES.DATA_APPROVER;

  // ==========================================================
  // PRINCIPAL / DIRECTOR
  // ==========================================================

  const isPrincipal = role === ROLES.PRINCIPAL_DIRECTOR;

  // ==========================================================
  // LOAD SUBMISSIONS
  // ==========================================================

  const loadSubmissions = async () => {
    if (!isSubmissionAuthorized) {
      console.log(
        `SUBMISSIONS ACCESS SKIPPED FOR ROLE: ${role}`
      );

      setSubmissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError("");

      const data = await submissionService.getSubmissions();
      if (!Array.isArray(data)) {
        throw new Error("The submissions API returned an invalid response.");
      }

      console.log("SUBMISSIONS DATA:", data);

      // ======================================================
      // APPROVAL DEBUG
      // ======================================================

      if (Array.isArray(data)) {
        const approvalDebug = data
          .filter(
            (sub) =>
              String(sub.status || "")
                .trim()
                .toLowerCase() === "approved"
          )
          .map((sub) => ({
            id: sub.id,
            status: sub.status,
            approved_by: sub.approved_by,
            approved_by_type: typeof sub.approved_by,
          }));

        console.log(
          "APPROVAL DEBUG:",
          approvalDebug
        );
      }

      if (Array.isArray(data)) {
        const formatted = data.map((sub) => ({
          id: sub.id,

          title:
            sub.title ||
            "Criteria Submission",

          criterion:
            sub.criterion ||
            (sub.metric_code
              ? `Metric ${sub.metric_code}`
              : sub.criterion_id
              ? `Criterion #${sub.criterion_id}`
              : "Criterion Submission"),

          department:
            sub.department ||
            sub.department_name ||
            (sub.department_id
              ? `Department #${sub.department_id}`
              : "Academic Department"),

          submittedBy:
            sub.submittedBy ||
            sub.user_name ||
            (sub.user_id
              ? `User #${sub.user_id}`
              : "Unknown User"),

          date:
            sub.date ||
            (sub.created_at
              ? sub.created_at.split("T")[0]
              : "-"),

          cycle:
            sub.cycle_name ||
            (sub.cycle_id
              ? `Cycle #${sub.cycle_id}`
              : "Not assigned"),

          metric:
            sub.metric_code ||
            "-",

          status: String(
            sub.status || "Draft"
          )
            .trim()
            .replace(/\s+/g, " "),

          // Keep the complete backend object.
          // This is important because workflow fields such as
          // approved_by are used by Principal/Director.
          original: sub,
        }));

        console.log(
          "FORMATTED SUBMISSIONS:",
          formatted
        );

        setSubmissions(formatted);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      setSubmissions([]);

      if (isDepartmentUnassignedError(error)) {
        setLoadError(DEPARTMENT_UNASSIGNED_MESSAGE);
      } else {
        console.error(
          "SUBMISSIONS LOAD ERROR:",
          error?.response?.data || error
        );
        setLoadError(
          (typeof error?.response?.data?.detail === "string" &&
            error.response.data.detail) ||
            error?.message ||
            "Unable to load submissions."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [role]);

  // ==========================================================
  // CREATE SUBMISSION
  // ==========================================================

  const handleCreate = () => {
    if (!isDataEntryRole) {
      alert(
        "You are not authorized to create submissions."
      );
      return;
    }

    navigate("/submissions/new");
  };

  const handleView = (id) => {
    navigate(`/submissions/${id}`);
  };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (id) => {
    if (!isDataEntryRole) {
      return;
    }

    try {
      setActionLoading(id);

      await submissionService.submitSubmission(id);

      await loadSubmissions();
    } catch (error) {
      console.error(
        "SUBMIT ERROR:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.detail ||
          "Unable to submit the submission."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // RESUBMIT
  // ==========================================================

  const handleResubmit = async (id) => {
    if (!isDataEntryRole) {
      return;
    }

    try {
      setActionLoading(id);

      console.log(
        "RESUBMITTING SUBMISSION:",
        id
      );

      const response =
        await submissionService.resubmitSubmission(id);

      console.log(
        "RESUBMIT RESPONSE:",
        response
      );

      await loadSubmissions();
    } catch (error) {
      console.error(
        "RESUBMIT ERROR:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.detail ||
          "Unable to resubmit."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // REVIEWER - START REVIEW
  // ==========================================================

  const handleStartReview = async (id) => {
    if (!isReviewer) {
      return;
    }

    try {
      setActionLoading(id);

      await submissionService.startReview(id);

      await loadSubmissions();
    } catch (error) {
      console.error(
        "START REVIEW ERROR:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.detail ||
          "Unable to start review."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // REVIEWER - APPROVE
  // ==========================================================

  const handleReviewApprove = async (id) => {
    if (!isReviewer) {
      return;
    }

    try {
      setActionLoading(id);

      await submissionService.reviewSubmission(id, {
        status: "Approved",
        comments:
          "Submission reviewed and approved.",
      });

      await loadSubmissions();
    } catch (error) {
      console.error(
        "REVIEW APPROVE ERROR:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.detail ||
          "Unable to approve submission."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // REVIEWER - REQUEST CHANGES
  // ==========================================================

  const handleReviewChanges = async (id) => {
    if (!isReviewer) {
      return;
    }

    const comments = window.prompt(
      "Enter reason for requesting changes:"
    );

    if (!comments) {
      return;
    }

    try {
      setActionLoading(id);

      await submissionService.reviewSubmission(id, {
        status: "Changes Requested",
        comments,
      });

      await loadSubmissions();
    } catch (error) {
      console.error(
        "REQUEST CHANGES ERROR:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.detail ||
          "Unable to request changes."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // REVIEWER - REJECT
  // ==========================================================

  const handleReject = async (id) => {
    if (!isReviewer) {
      return;
    }

    const reason = window.prompt(
      "Enter rejection reason:"
    );

    if (!reason) {
      return;
    }

    try {
      setActionLoading(id);

      await submissionService.rejectSubmission(id, {
        reason,
      });

      await loadSubmissions();
    } catch (error) {
      console.error(
        "REJECT ERROR:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.detail ||
          "Unable to reject submission."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // DATA APPROVER - APPROVE
  // ==========================================================

  const handleDataApprove = async (id) => {
    if (!isDataApprover) {
      return;
    }

    try {
      setActionLoading(id);

      await submissionService.approveSubmission(id, {
        comments:
          "Data verified and approved.",
      });

      await loadSubmissions();
    } catch (error) {
      console.error(
        "DATA APPROVAL ERROR:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.detail ||
          "Unable to approve data."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // DATA APPROVER - REJECT
  // ==========================================================

  const handleDataReject = async (id) => {
    if (!isDataApprover) {
      return;
    }

    const reason = window.prompt(
      "Enter reason for rejection:"
    );

    if (!reason) {
      return;
    }

    try {
      setActionLoading(id);

      await submissionService.rejectSubmissionByDataApprover(
        id,
        {
          reason,
        }
      );

      await loadSubmissions();
    } catch (error) {
      console.error(
        "DATA APPROVER REJECTION ERROR:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.detail ||
          "Unable to reject submission."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // PRINCIPAL / DIRECTOR - FINAL APPROVE
  // ==========================================================

  const handleFinalApprove = async (id) => {
    if (!isPrincipal) {
      return;
    }

    try {
      setActionLoading(id);

      console.log(
        "FINAL APPROVAL REQUEST:",
        id
      );

      const response =
        await submissionService.finalApprove(id, {
          comments:
            "Final approval granted by Principal / Director.",
        });

      console.log(
        "FINAL APPROVAL RESPONSE:",
        response
      );

      await loadSubmissions();
    } catch (error) {
      console.error(
        "FINAL APPROVAL ERROR:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.detail ||
          "Unable to give final approval."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // PRINCIPAL / DIRECTOR - FINAL SUBMIT
  // ==========================================================

  const handleFinalSubmit = async (id) => {
    if (!isPrincipal) {
      return;
    }

    try {
      setActionLoading(id);

      console.log(
        "FINAL INSTITUTIONAL SUBMISSION:",
        id
      );

      const response =
        await submissionService.finalSubmit(id);

      console.log(
        "FINAL SUBMISSION RESPONSE:",
        response
      );

      await loadSubmissions();
    } catch (error) {
      console.error(
        "FINAL SUBMISSION ERROR:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.detail ||
          "Unable to complete the final institutional submission."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // ACTION RENDERING
  // ==========================================================

  const renderActions = (row) => {
    const status = String(
      row.status || "Draft"
    )
      .trim()
      .replace(/\s+/g, " ");

    const normalizedStatus =
      status.toLowerCase();

    const isLoading =
      actionLoading === row.id;

    const viewButton = (
      <button
        onClick={() => handleView(row.id)}
        title="View / Open"
        style={actionButtonStyle}
      >
        <Eye size={16} />
      </button>
    );

    console.log(
      `ROW ${row.id} STATUS:`,
      status,
      "ROLE:",
      role,
      "APPROVED_BY:",
      row?.original?.approved_by
    );

    // ========================================================
    // DATA ENTRY ROLE
    // ========================================================

    if (isDataEntryRole) {
      // ------------------------------------------------------
      // DRAFT → SUBMIT
      // ------------------------------------------------------

      if (normalizedStatus === "draft") {
        return (
          <div style={{ display: "flex", gap: "6px" }}>
            {viewButton}
            <button
              onClick={() =>
                handleSubmit(row.id)
              }
              disabled={isLoading}
              title="Submit"
              style={{
                ...actionButtonStyle,
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              <Send size={16} />
            </button>
          </div>
        );
      }

      // ------------------------------------------------------
      // CHANGES REQUESTED → RESUBMIT
      // ------------------------------------------------------

      if (
        normalizedStatus ===
        "changes requested"
      ) {
        return (
          <div style={{ display: "flex", gap: "6px" }}>
            {viewButton}
            <button
              onClick={() =>
                handleResubmit(row.id)
              }
              disabled={isLoading}
              title="Resubmit after making requested changes"
              style={{
                ...actionButtonStyle,
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        );
      }

      // ------------------------------------------------------
      // ALL OTHER STATUSES → VIEW
      // ------------------------------------------------------

      return viewButton;
    }

    // ========================================================
    // REVIEWER
    // ========================================================

    if (isReviewer) {
      // ------------------------------------------------------
      // SUBMITTED / RESUBMITTED → START REVIEW
      // ------------------------------------------------------

      if (
        normalizedStatus === "submitted" ||
        normalizedStatus === "resubmitted"
      ) {
        return (
          <button
            onClick={() =>
              handleStartReview(row.id)
            }
            disabled={isLoading}
            title="Start Review"
            style={{
              ...actionButtonStyle,
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading
                ? "not-allowed"
                : "pointer",
            }}
          >
            <Eye size={16} />
          </button>
        );
      }

      // ------------------------------------------------------
      // UNDER REVIEW → APPROVE / CHANGES / REJECT
      // ------------------------------------------------------

      if (
        normalizedStatus ===
        "under review"
      ) {
        return (
          <div
            style={{
              display: "flex",
              gap: "6px",
            }}
          >
            <button
              onClick={() =>
                handleReviewApprove(
                  row.id
                )
              }
              disabled={isLoading}
              title="Approve"
              style={{
                ...actionButtonStyle,
                opacity: isLoading
                  ? 0.6
                  : 1,
              }}
            >
              <CheckCircle size={16} />
            </button>

            <button
              onClick={() =>
                handleReviewChanges(
                  row.id
                )
              }
              disabled={isLoading}
              title="Request Changes"
              style={{
                ...actionButtonStyle,
                opacity: isLoading
                  ? 0.6
                  : 1,
              }}
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={() =>
                handleReject(row.id)
              }
              disabled={isLoading}
              title="Reject"
              style={{
                ...actionButtonStyle,
                opacity: isLoading
                  ? 0.6
                  : 1,
              }}
            >
              <XCircle size={16} />
            </button>
          </div>
        );
      }

      return (
        <button
          title="View"
          style={actionButtonStyle}
        >
          <Eye size={16} />
        </button>
      );
    }

    // ========================================================
    // DATA APPROVER
    // ========================================================

    if (isDataApprover) {
      const awaitingDataApproval =
        normalizedStatus === "approved" &&
        !row?.original?.approved_by;

      if (awaitingDataApproval) {
        return (
          <div
            style={{
              display: "flex",
              gap: "6px",
            }}
          >
            {viewButton}
            <button
              onClick={() =>
                handleDataApprove(
                  row.id
                )
              }
              disabled={isLoading}
              title="Approve Data"
              style={{
                ...actionButtonStyle,
                opacity: isLoading
                  ? 0.6
                  : 1,
              }}
            >
              <CheckCircle size={16} />
            </button>

            <button
              onClick={() =>
                handleDataReject(
                  row.id
                )
              }
              disabled={isLoading}
              title="Reject Data"
              style={{
                ...actionButtonStyle,
                opacity: isLoading
                  ? 0.6
                  : 1,
              }}
            >
              <XCircle size={16} />
            </button>
          </div>
        );
      }

      return viewButton;
    }

    // ========================================================
    // PRINCIPAL / DIRECTOR
    // ========================================================

    if (isPrincipal) {
      // ------------------------------------------------------
      // APPROVED + DATA APPROVER SIGN-OFF
      // → FINAL APPROVAL
      //
      // Backend keeps status as "Approved"
      // and records approved_by.
      // ------------------------------------------------------

      const awaitingFinalApproval =
        normalizedStatus === "approved" &&
        Boolean(row?.original?.approved_by);

      if (awaitingFinalApproval) {
        return (
          <div style={{ display: "flex", gap: "6px" }}>
            {viewButton}
            <button
            onClick={() =>
              handleFinalApprove(
                row.id
              )
            }
            disabled={isLoading}
            title="Final Approval"
            style={{
              ...actionButtonStyle,
              opacity: isLoading
                ? 0.6
                : 1,
              cursor: isLoading
                ? "not-allowed"
                : "pointer",
            }}
          >
            <CheckCircle size={16} />
          </button>
          </div>
        );
      }

      // ------------------------------------------------------
      // FINAL APPROVAL → FINAL SUBMIT
      // ------------------------------------------------------

      if (
        normalizedStatus ===
        "final approval"
      ) {
        return (
          <div style={{ display: "flex", gap: "6px" }}>
            {viewButton}
            <button
            onClick={() =>
              handleFinalSubmit(
                row.id
              )
            }
            disabled={isLoading}
            title="Final institutional submission (not sent to NAAC)"
            style={{
              ...actionButtonStyle,
              opacity: isLoading
                ? 0.6
                : 1,
              cursor: isLoading
                ? "not-allowed"
                : "pointer",
            }}
          >
            <Send size={16} />
          </button>
          </div>
        );
      }

      // ------------------------------------------------------
      // EVERYTHING ELSE → VIEW
      // ------------------------------------------------------

      return viewButton;
    }

    // ========================================================
    // DEFAULT
    // ========================================================

    return viewButton;
  };

  // ==========================================================
  // TABLE
  // ==========================================================

  const columns = [
    {
      title: "Submission Title",
      dataIndex: "title",
    },

    {
      title: "Criterion",
      dataIndex: "criterion",
    },

    {
      title: "Metric",
      dataIndex: "metric",
    },

    {
      title: "Cycle",
      dataIndex: "cycle",
    },

    {
      title: "Department",
      dataIndex: "department",
    },

    {
      title: "Submitted By",
      dataIndex: "submittedBy",
    },

    {
      title: "Date",
      dataIndex: "date",
    },

    {
      title: "Status",
      dataIndex: "status",
      isStatus: true,
    },

    {
      title: "Actions",
      dataIndex: "id",
      render: (_, row) =>
        renderActions(row),
    },
  ];

  // ==========================================================
  // ACCESS RESTRICTED
  // ==========================================================

  if (!isSubmissionAuthorized) {
    return (
      <div
        style={{
          color: "#1e293b",
        }}
      >
        <PageHeader
          eyebrow="ACCREDITATION DOSSIER"
          title="Submissions Management"
          description="Track internal SSR / AQAR preparation data across academic units."
        />

        <div
          className="panel"
          style={{
            background: "#ffffff",
            border:
              "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              margin:
                "0 auto 16px",
              borderRadius: "50%",
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
            }}
          >
            <XCircle
              size={28}
              color="#64748b"
            />
          </div>

          <h3
            style={{
              margin:
                "0 0 8px",
              color: "#1e293b",
            }}
          >
            Access Restricted
          </h3>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            The{" "}
            {role || "current"} role is not
            authorized to access the NAAC
            submission workflow.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN
  // ==========================================================

  return (
    <div
      style={{
        color: "#1e293b",
      }}
    >
      <PageHeader
        eyebrow="ACCREDITATION DOSSIER"
        title="Submissions Management"
        description="Track internal SSR / AQAR preparation data across academic units."
        primaryAction={
          isDataEntryRole
            ? {
                label: "New Submission",
                icon: Plus,
                onClick:
                  handleCreate,
              }
            : undefined
        }
      />

      <div
        className="panel"
        style={{
          background: "#ffffff",
          border:
            "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "30px",
              textAlign:
                "center",
              color: "#64748b",
            }}
          >
            Loading submissions...
          </div>
        ) : loadError ? (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              color: "#7f1d1d",
            }}
          >
            {loadError}
            <button
              type="button"
              onClick={loadSubmissions}
              style={{
                display: "block",
                margin: "12px auto 0",
                padding: "8px 14px",
                border: "1px solid #fecaca",
                borderRadius: "7px",
                background: "#ffffff",
                color: "#7f1d1d",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={submissions}
            keyField="id"
            emptyMessage="No criteria submissions found."
          />
        )}
      </div>
    </div>
  );
};

// ============================================================
// ACTION BUTTON STYLE
// ============================================================

const actionButtonStyle = {
  border:
    "1px solid #e2e8f0",

  background:
    "#ffffff",

  borderRadius:
    "7px",

  padding:
    "6px 8px",

  cursor:
    "pointer",

  display:
    "inline-flex",

  alignItems:
    "center",

  justifyContent:
    "center",
};

export default Submissions;