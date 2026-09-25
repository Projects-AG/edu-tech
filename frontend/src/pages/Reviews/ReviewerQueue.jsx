import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submissionService } from "../../services/submissionService";

const ReviewerQueue = () => {
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // =========================================
  // FETCH REVIEWER QUEUE
  // =========================================
  const fetchReviewerQueue = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await submissionService.getSubmissions();

      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(
        "Failed to fetch reviewer queue:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to load reviewer queue."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // INITIAL LOAD
  // =========================================
  useEffect(() => {
    fetchReviewerQueue();
  }, []);

  // =========================================
  // SEARCH + STATUS FILTER
  // =========================================
  const reviewableSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const statusMatch =
        statusFilter === "All" ||
        submission.status === statusFilter;

      const searchText = search
        .trim()
        .toLowerCase();

      const searchMatch =
        !searchText ||
        submission.title
          ?.toLowerCase()
          .includes(searchText) ||
        submission.metric_code
          ?.toLowerCase()
          .includes(searchText) ||
        String(
          submission.criterion_id || ""
        ).includes(searchText) ||
        String(
          submission.department_id || ""
        ).includes(searchText);

      return statusMatch && searchMatch;
    });
  }, [submissions, search, statusFilter]);

  // =========================================
  // FORMAT DATE
  // =========================================
  const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // =========================================
  // STATUS CLASS
  // =========================================
  const getStatusClass = (status) => {
    switch (status) {
      case "Submitted":
      case "Resubmitted":
        return "status-pending";

      case "Under Review":
        return "status-review";

      case "Approved":
        return "status-approved";

      case "Rejected":
        return "status-rejected";

      case "Changes Requested":
        return "status-changes";

      default:
        return "status-default";
    }
  };

  // =========================================
  // LOADING STATE
  // =========================================
  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Reviewer Queue</h1>
            <p>
              Loading submissions available for
              review...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================
  // ERROR STATE
  // =========================================
  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Reviewer Queue</h1>
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={fetchReviewerQueue}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // =========================================
  // MAIN PAGE
  // =========================================
  return (
    <div className="page-container">

      {/* =========================================
          PAGE HEADER
      ========================================= */}
      <div className="page-header">
        <div>
          <h1>Reviewer Queue</h1>

          <p>
            Review submissions assigned to your
            permitted criteria.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReviewerQueue}
        >
          Refresh
        </button>
      </div>

      {/* =========================================
          QUEUE CARD
      ========================================= */}
      <div className="queue-card">

        {/* =========================================
            QUEUE HEADER
        ========================================= */}
        <div className="queue-header">

          <div>
            <h2>Submissions</h2>

            <span>
              {reviewableSubmissions.length}{" "}
              submission
              {reviewableSubmissions.length !== 1
                ? "s"
                : ""}
            </span>
          </div>

          {/* =========================================
              SEARCH + FILTER
          ========================================= */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder="Search submissions..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              style={{
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "7px",
                minWidth: "220px",
              }}
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              style={{
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "7px",
              }}
            >
              <option value="All">
                All Statuses
              </option>

              <option value="Submitted">
                Submitted
              </option>

              <option value="Resubmitted">
                Resubmitted
              </option>

              <option value="Under Review">
                Under Review
              </option>

              <option value="Approved">
                Approved
              </option>

              <option value="Changes Requested">
                Changes Requested
              </option>

              <option value="Rejected">
                Rejected
              </option>
            </select>
          </div>
        </div>

        {/* =========================================
            EMPTY STATE
        ========================================= */}
        {reviewableSubmissions.length === 0 ? (
          <div className="empty-state">
            <h3>No submissions found</h3>

            <p>
              There are currently no submissions
              matching your filters.
            </p>
          </div>
        ) : (

          /* =========================================
              SUBMISSIONS TABLE
          ========================================= */
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Submission</th>
                  <th>Metric</th>
                  <th>Criterion</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {reviewableSubmissions.map(
                  (submission) => (
                    <tr
                      key={submission.id}
                    >

                      {/* Submission */}
                      <td>
                        <strong>
                          {submission.title ||
                            "Untitled Submission"}
                        </strong>
                      </td>

                      {/* Metric */}
                      <td>
                        {submission.metric_code ||
                          "-"}
                      </td>

                      {/* Criterion */}
                      <td>
                        {submission.criterion_id
                          ? `Criterion ${submission.criterion_id}`
                          : "-"}
                      </td>

                      {/* Department */}
                      <td>
                        {submission.department_id ||
                          "-"}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            submission.status
                          )}`}
                        >
                          {submission.status ||
                            "Unknown"}
                        </span>
                      </td>

                      {/* Submitted Date */}
                      <td>
                        {formatDate(
                          submission.created_at
                        )}
                      </td>

                      {/* Review Button */}
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/reviewer/submissions/${submission.id}`
                            )
                          }
                        >
                          Review
                        </button>
                      </td>

                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewerQueue;