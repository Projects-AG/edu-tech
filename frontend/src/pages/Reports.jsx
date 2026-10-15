import React, { useState, useEffect } from "react";
import { FileText, CheckCircle, PieChart, ShieldAlert, Download } from "lucide-react";
import reportService from "../services/reportService";
import PageHeader from "../components/common/PageHeader";
import {
  LoadingState,
  ErrorState,
} from "../components/common/FeedbackStates";
import { useAuth } from "../context/AuthContext";
import { ROLES, normalizeRole } from "../config/roles";

export const Reports = () => {
  const { user, activeRole } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadState, setDownloadState] = useState("idle");
  const [downloadError, setDownloadError] = useState("");
  const [finalizeState, setFinalizeState] = useState("idle");
  const [finalizeError, setFinalizeError] = useState("");
  const isPrincipal =
    normalizeRole(activeRole || user?.role) === ROLES.PRINCIPAL_DIRECTOR;

  const loadReports = () => {
    setLoading(true);
    setError("");

    reportService.getReports()
      .then((data) => {
        setSummaryData(data);
      })
      .catch((err) => {
        setSummaryData(null);
        setError(
          err?.response?.data?.detail ||
            "Unable to load report summary."
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDownloadFinalReport = async () => {
    setDownloadState("generating");
    setDownloadError("");

    try {
      const response = await reportService.downloadFinalReport();
      const header = response.headers?.["content-disposition"] || "";
      const match = header.match(/filename="([^"]+)"/);
      const filename = match?.[1] || "naac-final-report.html";
      const blob = new Blob([response.data], {
        type: response.headers?.["content-type"] || "text/html",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setDownloadState("success");
    } catch (err) {
      let message = "Unable to download the final report.";
      const payload = err?.response?.data;
      if (payload instanceof Blob) {
        try {
          const text = await payload.text();
          const parsed = JSON.parse(text);
          message = parsed.detail || message;
        } catch {
          message = "Unable to download the final report.";
        }
      } else if (payload?.detail) {
        message = payload.detail;
      }
      setDownloadError(message);
      setDownloadState("error");
    }
  };

  const handleFinalizeCycle = async () => {
    if (!isPrincipal) {
      return;
    }
    const confirmed = window.confirm(
      "Finalize this accreditation cycle? This will generate and store the final internal progress report (not an official NAAC document) and cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    setFinalizeState("working");
    setFinalizeError("");
    try {
      await reportService.finalizeAccreditationCycle();
      setFinalizeState("success");
      loadReports();
    } catch (err) {
      const payload = err?.response?.data?.detail;
      let message = "Unable to finalize the accreditation cycle.";
      if (typeof payload === "string") {
        message = payload;
      } else if (payload?.reason) {
        message = payload.reason;
      } else if (payload?.message) {
        message = payload.message;
      }
      setFinalizeError(message);
      setFinalizeState("error");
    }
  };

  return (
    <div style={{ color: "#1e293b" }}>
      <PageHeader
        eyebrow="ANALYTICS"
        title="Accreditation Reports"
        description={
          summaryData?.cycle
            ? `Live progress for ${summaryData.cycle.name}${
                summaryData.cycle.academic_period
                  ? ` (${summaryData.cycle.academic_period})`
                  : ""
              }.`
            : "Live institutional progress from current submissions, approvals, and evidence."
        }
      />

      {loading ? (
        <LoadingState message="Loading report summary..." />
      ) : error ? (
        <ErrorState
          title="Unable to load reports"
          message={error}
          onRetry={loadReports}
        />
      ) : null}

      {!loading && !error && summaryData && summaryData.cycle_progress?.uses_catalog_fallback ? (
        <div
          style={{
            marginBottom: "16px",
            padding: "14px 16px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "10px",
            color: "#92400e",
            fontSize: "13px",
          }}
        >
          {summaryData.cycle_progress?.cycle_id
            ? "Applicability is not configured for the current accreditation cycle. Progress uses the global metric catalog."
            : "No active accreditation cycle is configured. Progress uses the global metric catalog."}
        </div>
      ) : null}

      {!loading && !error && summaryData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "#ffffff", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#2563eb", marginBottom: "8px" }}>
              <PieChart size={18} />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Overall Progress</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{summaryData.overall_completion_percentage || 0}%</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              {summaryData.cycle_progress?.applicability_configured
                ? `${summaryData.cycle_progress.finalized_count || 0} of ${summaryData.cycle_progress.total_applicable_metrics || 0} applicable metrics finalized`
                : "SSR preparation readiness (internal)"}
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#16a34a", marginBottom: "8px" }}>
              <CheckCircle size={18} />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Approval Rate</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{summaryData.approval_rate_percentage || 0}%</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Approver sign-off metric</div>
          </div>

          <div style={{ background: "#ffffff", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#7c3aed", marginBottom: "8px" }}>
              <FileText size={18} />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Total Submissions</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{summaryData.institution_funnel?.total || summaryData.submission_funnel?.total || 0}</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              Institution-wide submissions
              {summaryData.cycle_funnel
                ? ` · cycle ${summaryData.cycle_funnel.total || 0}`
                : ""}
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#ea580c", marginBottom: "8px" }}>
              <ShieldAlert size={18} />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Evidence Documents</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{summaryData.evidence?.total_documents || 0}</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              Pending evidence: {summaryData.evidence?.pending_evidence || 0}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && summaryData && (
        <>
          {summaryData.cycle_progress?.applicability_configured ? (
            <div className="panel" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>Cycle metric progress</h3>
              <p style={{ fontSize: "12px", color: "#475569", margin: "0 0 10px" }}>
                {summaryData.cycle_progress.cycle_name || "Current cycle"}
                {summaryData.cycle_progress.framework_name
                  ? ` · ${summaryData.cycle_progress.framework_name} (${summaryData.cycle_progress.framework_version})`
                  : ""}
                {summaryData.cycle_progress.metric_catalogue_complete === false
                  ? " · Official metric catalogue incomplete; seven criteria are not a complete or mandatory metric set."
                  : ""}
                . Metric completion uses this cycle's applicable requirements, not the institution-wide submission count.
              </p>
              {summaryData.cycle_progress?.eligibility_status === "UNVERIFIED" ||
              summaryData.final_report?.eligibility_status === "UNVERIFIED" ? (
                <p style={{ color: "#9a3412", fontSize: "13px", margin: "0 0 10px" }}>
                  Official required, optional, and not-applicable rules are unverified.
                  Included metrics are cycle configuration only and are not counted as optional or complete.
                </p>
              ) : null}
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px" }}>
                <span>Required: {summaryData.cycle_progress.required_metric_count ?? 0}</span>
                {summaryData.cycle_progress?.eligibility_status === "UNVERIFIED" ||
                summaryData.final_report?.eligibility_status === "UNVERIFIED" ? null : (
                  <span>Optional: {summaryData.cycle_progress.optional_metric_count ?? 0}</span>
                )}
                <span>Finalized required: {summaryData.cycle_progress.finalized_required_count ?? 0}</span>
                <span>Pending required: {summaryData.cycle_progress.pending_required_count ?? 0}</span>
                <span>Under review: {summaryData.cycle_progress.under_review_count ?? 0}</span>
                <span>Changes requested: {summaryData.cycle_progress.changes_requested_count ?? 0}</span>
                <span>Rejected: {summaryData.cycle_progress.rejected_count ?? 0}</span>
              </div>
              {(summaryData.cycle_progress.missing_required_metrics || []).length > 0 ? (
                <p style={{ color: "#92400e", fontSize: "12px", margin: "12px 0 0" }}>
                  Missing required metrics:{" "}
                  {summaryData.cycle_progress.missing_required_metrics
                    .map((item) => item.metric_code)
                    .join(", ")}
                </p>
              ) : null}
              {(summaryData.cycle_progress.optional_metrics || []).length > 0 &&
              summaryData.cycle_progress?.eligibility_status !== "UNVERIFIED" &&
              summaryData.final_report?.eligibility_status !== "UNVERIFIED" ? (
                <p style={{ color: "#475569", fontSize: "12px", margin: "8px 0 0" }}>
                  Optional metrics:{" "}
                  {summaryData.cycle_progress.optional_metrics
                    .map((item) => item.metric_code || item)
                    .join(", ")}
                </p>
              ) : null}
              {(summaryData.cycle_progress.finalized_metrics || []).length > 0 ? (
                <p style={{ color: "#166534", fontSize: "12px", margin: "8px 0 0" }}>
                  Finalized metrics:{" "}
                  {summaryData.cycle_progress.finalized_metrics
                    .map((item) => item.metric_code || item)
                    .join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="panel" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>Criterion report</h3>
            {(summaryData.criterion_report || []).length === 0 ? (
              <div style={{ color: "#64748b", fontSize: "13px" }}>No criteria found.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "8px" }}>Criterion</th>
                    <th style={{ padding: "8px" }}>Status</th>
                    <th style={{ padding: "8px" }}>Submissions</th>
                    <th style={{ padding: "8px" }}>Approved</th>
                    <th style={{ padding: "8px" }}>Evidence</th>
                    <th style={{ padding: "8px" }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {(summaryData.criterion_report || []).map((item) => (
                    <tr key={item.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "8px" }}>{item.number} — {item.title}</td>
                      <td style={{ padding: "8px" }}>{item.status}</td>
                      <td style={{ padding: "8px" }}>{item.total_submissions}</td>
                      <td style={{ padding: "8px" }}>{item.approved_submissions}</td>
                      <td style={{ padding: "8px" }}>{item.total_evidence}</td>
                      <td style={{ padding: "8px" }}>{item.completion_percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>Evidence report</h3>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", marginBottom: "12px" }}>
              <span>Total: {summaryData.evidence?.total_documents || 0}</span>
              <span>Approved: {summaryData.evidence?.approved || 0}</span>
              <span>Pending: {summaryData.evidence?.pending || 0}</span>
              <span>Rejected: {summaryData.evidence?.rejected || 0}</span>
            </div>
            <p style={{ color: "#64748b", fontSize: "12px", margin: 0 }}>
              Evidence classification uses the linked submission status. Documents themselves are stored as uploaded files.
            </p>
          </div>

          <div className="panel" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>Progress / review report</h3>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px" }}>
              <span>Reviews: {summaryData.progress_report?.review_activity?.total || 0}</span>
              <span>Approved reviews: {summaryData.progress_report?.review_activity?.approved || 0}</span>
              <span>Changes requested: {summaryData.progress_report?.review_activity?.changes_requested || 0}</span>
              <span>Rejected reviews: {summaryData.progress_report?.review_activity?.rejected || 0}</span>
            </div>
          </div>

          <div className="panel" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "15px" }}>Report status</h3>
            <p style={{ color: "#166534", fontSize: "13px", fontWeight: 600, margin: "0 0 16px" }}>
              Report available / viewable from current institution-scoped submissions and evidence.
            </p>
            <h3 style={{ margin: "0 0 8px", fontSize: "15px" }}>Final report</h3>
            <p style={{ color: "#64748b", fontSize: "13px", margin: "0 0 12px" }}>
              {summaryData.final_report?.reason ||
                "Final report eligibility is determined after Principal / Director final submission."}
            </p>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", marginBottom: "12px" }}>
              <span>Status required: {summaryData.final_report?.required_status || "Final Submitted"}</span>
              <span>Final submitted: {summaryData.final_report?.final_submitted_count ?? 0}</span>
              <span>Awaiting final submission: {summaryData.final_report?.final_approval_count ?? 0}</span>
              {summaryData.final_report?.cycle_name || summaryData.final_report?.cycle_id ? (
                <span>
                  Cycle: {summaryData.final_report.cycle_name || summaryData.final_report.cycle_id}
                </span>
              ) : (
                <span>Cycle: not configured</span>
              )}
            </div>
            {summaryData.final_report?.eligible ? (
              <div style={{ color: "#166534", fontSize: "13px", fontWeight: 600, marginBottom: "12px" }}>
                The final internal progress report is ready. It is not an
                official NAAC AQAR, SSR, or accreditation outcome.
              </div>
            ) : (
              <div style={{ color: "#92400e", fontSize: "13px", fontWeight: 600, marginBottom: "12px" }}>
                {summaryData.final_report?.eligibility_status === "UNVERIFIED"
                  ? "Official required, optional, and not-applicable rules are unverified. Final report is not ready."
                  : summaryData.final_report?.eligibility_status === "ADMIN_UNSCOPED"
                  ? "Select an institution to evaluate Final Report eligibility."
                  : summaryData.final_report?.applicability_configured
                  ? "Report is not ready."
                  : "Report not yet eligible because final approval/submission is incomplete."}
              </div>
            )}
            {summaryData.final_report?.applicability_configured &&
            !summaryData.final_report?.eligible &&
            summaryData.final_report?.eligibility_status !== "UNVERIFIED" ? (
              <div style={{ fontSize: "13px", color: "#475569", marginBottom: "12px" }}>
                <div>
                  Required metrics remaining: {summaryData.final_report.pending_required_count ?? 0}
                  {summaryData.final_report.required_metric_count != null
                    ? ` of ${summaryData.final_report.required_metric_count}`
                    : ""}
                </div>
                {(summaryData.final_report.missing_required_metrics || []).length > 0 ? (
                  <p style={{ margin: "8px 0 0", color: "#92400e" }}>
                    {(summaryData.final_report.missing_required_metrics || [])
                      .map((item) => `${item.metric_code} (${item.reason})`)
                      .join("; ")}
                  </p>
                ) : null}
                {(summaryData.final_report.missing_required_evidence || []).length > 0 ? (
                  <p style={{ margin: "8px 0 0", color: "#92400e" }}>
                    Missing required evidence:{" "}
                    {(summaryData.final_report.missing_required_evidence || [])
                      .map((item) => item.metric_code)
                      .join(", ")}
                  </p>
                ) : null}
                <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#64748b" }}>
                  Optional and unmapped metrics do not block the final internal progress report.
                </p>
              </div>
            ) : null}
            {summaryData.cycle?.status === "Completed" ||
            summaryData.final_report?.cycle_status === "Completed" ? (
              <div style={{ color: "#166534", fontSize: "13px", fontWeight: 600, marginBottom: "12px" }}>
                This accreditation cycle has been finalized.
                {summaryData.final_report?.report_available
                  ? " The final internal progress report is available."
                  : ""}
              </div>
            ) : null}
            {isPrincipal &&
            summaryData.final_report?.eligible &&
            summaryData.cycle?.id &&
            summaryData.cycle?.status !== "Completed" &&
            summaryData.final_report?.cycle_status !== "Completed" ? (
              <button
                type="button"
                onClick={handleFinalizeCycle}
                disabled={finalizeState === "working"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  border: "1px solid #15803d",
                  background: "#16a34a",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontWeight: 700,
                  cursor: finalizeState === "working" ? "wait" : "pointer",
                  marginRight: "8px",
                  marginBottom: "12px",
                }}
              >
                {finalizeState === "working"
                  ? "Finalizing cycle..."
                  : "Finalize Accreditation Cycle"}
              </button>
            ) : null}
            {finalizeError ? (
              <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "12px" }}>
                {finalizeError}
              </div>
            ) : null}
            {finalizeState === "success" ? (
              <div style={{ color: "#166534", fontSize: "12px", marginBottom: "12px" }}>
                Accreditation cycle finalized. The final internal progress report is available.
              </div>
            ) : null}
            {summaryData.final_report?.can_download ? (
              <button
                type="button"
                onClick={handleDownloadFinalReport}
                disabled={downloadState === "generating"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontWeight: 700,
                  cursor: downloadState === "generating" ? "wait" : "pointer",
                }}
              >
                <Download size={16} />
                {downloadState === "generating"
                  ? "Generating final report..."
                  : "Download Final Report"}
              </button>
            ) : null}
            {downloadState === "generating" ? (
              <div style={{ color: "#2563eb", fontSize: "12px", marginTop: "8px" }}>
                Report generation in progress.
              </div>
            ) : null}
            {downloadState === "success" ? (
              <div style={{ color: "#166534", fontSize: "12px", marginTop: "8px" }}>
                Final report downloaded.
              </div>
            ) : null}
            {downloadError ? (
              <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "8px" }}>
                {downloadError}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
