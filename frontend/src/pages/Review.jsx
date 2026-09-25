import React, { useState, useEffect } from "react";
import reviewService from "../services/reviewService";
import DataTable from "../components/common/DataTable";
import PageHeader from "../components/common/PageHeader";
import PermissionGuard from "../components/common/PermissionGuard";
import { PERMISSIONS } from "../config/permissions";

export const Review = () => {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    reviewService.getPendingReviews().then(setReviews);
  }, []);

  const handleApprove = (id) => {
    reviewService.approveReview(id).then(() => {
      setReviews(reviews.map((r) => (r.id === id ? { ...r, status: "Approved" } : r)));
    });
  };

  const handleReject = (id) => {
    reviewService.rejectReview(id).then(() => {
      setReviews(reviews.map((r) => (r.id === id ? { ...r, status: "Rejected" } : r)));
    });
  };

  const columns = [
    { title: "Submission Title", dataIndex: "submissionTitle" },
    { title: "Reviewer", dataIndex: "reviewer" },
    { title: "Assigned Date", dataIndex: "assignedDate" },
    { title: "Status", dataIndex: "status", isStatus: true },
    { title: "Comments / Feedback", dataIndex: "comments" },
    {
      title: "Actions",
      dataIndex: "id",
      render: (id, row) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <PermissionGuard permission={PERMISSIONS.REVIEWS_APPROVE}>
            <button
              onClick={() => handleApprove(id)}
              disabled={row.status === "Approved"}
              style={{
                padding: "4px 8px",
                background: row.status === "Approved" ? "#f1f5f9" : "#16a34a",
                color: row.status === "Approved" ? "#94a3b8" : "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: row.status === "Approved" ? "default" : "pointer",
              }}
            >
              Approve
            </button>
          </PermissionGuard>

          <PermissionGuard permission={PERMISSIONS.REVIEWS_REJECT}>
            <button
              onClick={() => handleReject(id)}
              disabled={row.status === "Rejected"}
              style={{
                padding: "4px 8px",
                background: row.status === "Rejected" ? "#f1f5f9" : "#dc2626",
                color: row.status === "Rejected" ? "#94a3b8" : "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: row.status === "Rejected" ? "default" : "pointer",
              }}
            >
              Reject
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader eyebrow="QUALITY ASSURANCE" title="Review & Approval Workflow" description="Evaluate criteria evidence, attach comments, and give statutory approvals." />
      <div className="panel">
        <DataTable columns={columns} data={reviews} keyField="id" />
      </div>
    </div>
  );
};

export default Review;
