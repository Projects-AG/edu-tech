// import React, { useState, useEffect } from "react";
// import reviewService from "../services/reviewService";
// import DataTable from "../components/common/DataTable";
// import PageHeader from "../components/common/PageHeader";
// import PermissionGuard from "../components/common/PermissionGuard";
// import { PERMISSIONS } from "../config/permissions";

// export const Review = () => {
//   const [reviews, setReviews] = useState([]);

//   useEffect(() => {
//     reviewService.getPendingReviews().then(setReviews);
//   }, []);

//   const handleApprove = (id) => {
//     reviewService.approveReview(id).then(() => {
//       setReviews(reviews.map((r) => (r.id === id ? { ...r, status: "Approved" } : r)));
//     });
//   };

//   const handleReject = (id) => {
//     reviewService.rejectReview(id).then(() => {
//       setReviews(reviews.map((r) => (r.id === id ? { ...r, status: "Rejected" } : r)));
//     });
//   };

//   const columns = [
//     { title: "Submission Title", dataIndex: "submissionTitle" },
//     { title: "Reviewer", dataIndex: "reviewer" },
//     { title: "Assigned Date", dataIndex: "assignedDate" },
//     { title: "Status", dataIndex: "status", isStatus: true },
//     { title: "Comments / Feedback", dataIndex: "comments" },
//     {
//       title: "Actions",
//       dataIndex: "id",
//       render: (id, row) => (
//         <div style={{ display: "flex", gap: "6px" }}>
//           <PermissionGuard permission={PERMISSIONS.REVIEWS_APPROVE}>
//             <button
//               onClick={() => handleApprove(id)}
//               disabled={row.status === "Approved"}
//               style={{
//                 padding: "4px 8px",
//                 background: row.status === "Approved" ? "#f1f5f9" : "#16a34a",
//                 color: row.status === "Approved" ? "#94a3b8" : "#fff",
//                 border: "none",
//                 borderRadius: "4px",
//                 fontSize: "11px",
//                 cursor: row.status === "Approved" ? "default" : "pointer",
//               }}
//             >
//               Approve
//             </button>
//           </PermissionGuard>

//           <PermissionGuard permission={PERMISSIONS.REVIEWS_REJECT}>
//             <button
//               onClick={() => handleReject(id)}
//               disabled={row.status === "Rejected"}
//               style={{
//                 padding: "4px 8px",
//                 background: row.status === "Rejected" ? "#f1f5f9" : "#dc2626",
//                 color: row.status === "Rejected" ? "#94a3b8" : "#fff",
//                 border: "none",
//                 borderRadius: "4px",
//                 fontSize: "11px",
//                 cursor: row.status === "Rejected" ? "default" : "pointer",
//               }}
//             >
//               Reject
//             </button>
//           </PermissionGuard>
//         </div>
//       ),
//     },
//   ];

//   return (
//     <div>
//       <PageHeader eyebrow="QUALITY ASSURANCE" title="Review & Approval Workflow" description="Evaluate criteria evidence, attach comments, and give statutory approvals." />
//       <div className="panel">
//         <DataTable columns={columns} data={reviews} keyField="id" />
//       </div>
//     </div>
//   );
// };

// export default Review;


import React, { useEffect, useState } from "react";
import submissionService from "../services/submissionService";
import DataTable from "../components/common/DataTable";
import PageHeader from "../components/common/PageHeader";
import { useNavigate } from "react-router-dom";

export const Review = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // ============================================================
  // LOAD DATA APPROVER QUEUE
  // ============================================================

  useEffect(() => {
    loadApprovalQueue();
  }, []);

  const loadApprovalQueue = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await submissionService.getSubmissions();

      console.log("ALL SUBMISSIONS:", data);

      // Only submissions that:
      // 1. Were approved by reviewer
      // 2. Are not yet approved by Data Approver

      const pendingApprovals = data.filter(
        (submission) =>
          submission.status === "Approved" &&
          !submission.approved_by
      );

      console.log(
        "DATA APPROVER QUEUE:",
        pendingApprovals
      );

      setSubmissions(pendingApprovals);
    } catch (err) {
      console.error("APPROVAL QUEUE ERROR:", err);
      setError("Unable to load approval queue.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // DATA APPROVER APPROVE
  // ============================================================

  const handleApprove = async (id) => {
    const comments = window.prompt(
      "Enter approval comments (optional):"
    );

    if (comments === null) {
      return;
    }

    try {
      setActionLoading(true);

      await submissionService.approveSubmission(id, {
        comments: comments,
      });

      alert("Submission approved successfully.");

      await loadApprovalQueue();
    } catch (err) {
      console.error("DATA APPROVAL ERROR:", err);

      alert(
        err?.response?.data?.detail ||
          "Failed to approve submission."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // DATA APPROVER REJECT
  // ============================================================

  const handleReject = async (id) => {
    const reason = window.prompt(
      "Enter rejection reason:"
    );

    if (reason === null) {
      return;
    }

    if (reason.trim().length < 3) {
      alert(
        "Rejection reason must contain at least 3 characters."
      );
      return;
    }

    try {
      setActionLoading(true);

      await submissionService.rejectSubmissionByDataApprover(
        id,
        {
          reason: reason.trim(),
        }
      );

      alert("Submission rejected successfully.");

      await loadApprovalQueue();
    } catch (err) {
      console.error(
        "DATA APPROVER REJECTION ERROR:",
        err
      );

      alert(
        err?.response?.data?.detail ||
          "Failed to reject submission."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // TABLE COLUMNS
  // ============================================================

  const columns = [
    {
      title: "Submission Title",
      dataIndex: "title",
    },

    {
      title: "Criterion",
      dataIndex: "criterion_id",
      render: (value) =>
        value ? `Criterion ${value}` : "-",
    },

    {
      title: "Metric",
      dataIndex: "metric_code",
      render: (value) => value || "-",
    },

    {
      title: "Reviewer",
      dataIndex: "reviewed_by",
      render: (value) =>
        value ? `User ${value}` : "-",
    },

    {
      title: "Reviewed Date",
      dataIndex: "reviewed_at",
      render: (value) =>
        value
          ? new Date(value).toLocaleDateString()
          : "-",
    },

    {
      title: "Status",
      dataIndex: "status",
      isStatus: true,
    },

    {
      title: "Actions",
      dataIndex: "id",

      render: (id) => (
  <button
    type="button"
    onClick={() =>
      navigate(`/approver/submissions/${id}`)
    }
    style={{
      padding: "6px 12px",
      background: "#2563eb",
      color: "#ffffff",
      border: "none",
      borderRadius: "5px",
      fontSize: "11px",
      fontWeight: "600",
      cursor: "pointer",
    }}
  >
    View
  </button>
),
    },
  ];

  // ============================================================
  // UI
  // ============================================================

  return (
    <div>
      <PageHeader
        eyebrow="DATA APPROVAL"
        title="Approval Queue"
        description="Review reviewer-approved submissions and provide data approval."
      />

      <div className="panel">

        {error && (
          <div
            style={{
              padding: "12px",
              marginBottom: "12px",
              background: "#fee2e2",
              color: "#b91c1c",
              borderRadius: "6px",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "20px" }}>
            Loading approval queue...
          </div>
        ) : submissions.length === 0 ? (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            No submissions are currently pending
            Data Approval.
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={submissions}
            keyField="id"
          />
        )}

      </div>
    </div>
  );
};

export default Review;
