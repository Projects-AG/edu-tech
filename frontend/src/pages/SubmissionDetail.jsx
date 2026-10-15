import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UploadCloud } from "lucide-react";

import PageHeader from "../components/common/PageHeader";
import OfficialMetricForm from "../components/OfficialMetricForm";
import { useAuth } from "../context/AuthContext";
import { ROLES, normalizeRole } from "../config/roles";
import accreditationCycleService from "../services/accreditationCycleService";
import documentService, {
  resolveDownloadFilename,
} from "../services/documentService";
import {
  buildOfficialSubmissionDataJson,
  parseOfficialDataJson,
} from "../services/officialMetricForm";
import submissionService from "../services/submissionService";

const EDITABLE_STATUSES = new Set([
  "draft",
  "changes requested",
  "resubmitted",
]);

const panelStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "16px",
};

const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export const SubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();
  const role = normalizeRole(activeRole || user?.role);

  const [submission, setSubmission] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [qualitativeResponse, setQualitativeResponse] = useState("");
  const [quantitativeResponse, setQuantitativeResponse] = useState("");

  const isDataEntry = [ROLES.NAAC_COORDINATOR, ROLES.DEPT_COORDINATOR].includes(role);
  const isDataApprover = role === ROLES.DATA_APPROVER;
  const isPrincipal = role === ROLES.PRINCIPAL_DIRECTOR;
  const status = normalizeStatus(submission?.status);
  const canUploadEvidence =
    isDataEntry && EDITABLE_STATUSES.has(status);
  const officialPayload = parseOfficialDataJson(submission?.data_json);
  const canEditOfficial =
    isDataEntry && EDITABLE_STATUSES.has(status) && Boolean(officialPayload);

  useEffect(() => {
    if (!officialPayload) {
      setQualitativeResponse("");
      setQuantitativeResponse("");
      return;
    }
    setQualitativeResponse(officialPayload.qualitative_response || "");
    setQuantitativeResponse(officialPayload.quantitative_response || "");
  }, [submission?.id, submission?.data_json]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await submissionService.getSubmission(id);
      setSubmission(data);
      const [docs, history] = await Promise.all([
        documentService.getDocuments(id).catch(() => []),
        submissionService.getReviews(id).catch(() => []),
      ]);
      setDocuments(Array.isArray(docs) ? docs : []);
      setReviews(Array.isArray(history) ? history : []);
      if (data.cycle_id) {
        try {
          const cycleData = await accreditationCycleService.getCycle(
            data.cycle_id
          );
          setCycle(cycleData);
        } catch {
          setCycle({ id: data.cycle_id });
        }
      } else {
        setCycle(null);
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to load this submission."
      );
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const runAction = async (fn) => {
    try {
      setActionLoading(true);
      setError("");
      await fn();
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to complete that action.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ color: "#1e293b" }}>
      <PageHeader
        eyebrow="ACCREDITATION DOSSIER"
        title={submission?.title || "Submission"}
        description="Submission details, evidence, review, and approval information."
        secondaryAction={{
          label: "Back",
          icon: ArrowLeft,
          onClick: () => navigate("/submissions"),
        }}
        primaryAction={
          canUploadEvidence
            ? {
                label: "Upload Evidence",
                icon: UploadCloud,
                onClick: () =>
                  navigate(
                    `/documents/upload?submission_id=${submission.id}${
                      submission.criterion_id
                        ? `&criterion_id=${submission.criterion_id}`
                        : ""
                    }`
                  ),
              }
            : undefined
        }
      />

      {loading ? (
        <div className="panel" style={panelStyle}>Loading submission...</div>
      ) : !submission ? (
        <div className="panel" style={panelStyle}>
          <div style={{ color: "#b91c1c" }}>
            {error || "Submission not found."}
          </div>
        </div>
      ) : (
        <>
          {error ? (
            <div className="panel" style={{ ...panelStyle, color: "#b91c1c" }}>
              {error}
            </div>
          ) : null}
          <div className="panel" style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: "0 0 6px" }}>{submission.title}</h3>
                <div style={{ color: "#64748b", fontSize: "13px" }}>
                  Submission #{submission.id}
                </div>
              </div>
              <strong>{submission.status}</strong>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "12px",
                marginTop: "16px",
                fontSize: "13px",
              }}
            >
              <div>
                <div style={{ color: "#64748b" }}>Cycle</div>
                <strong>
                  {cycle?.name ||
                    (submission.cycle_id
                      ? `Cycle #${submission.cycle_id}`
                      : "Not assigned")}
                </strong>
              </div>
              <div>
                <div style={{ color: "#64748b" }}>Criterion</div>
                <strong>
                  {submission.criterion_id
                    ? `Criterion #${submission.criterion_id}`
                    : "-"}
                </strong>
              </div>
              <div>
                <div style={{ color: "#64748b" }}>Metric</div>
                <strong>
                  {submission.metric_code || "-"}
                  {officialPayload?.metric_kind
                    ? ` · ${officialPayload.metric_kind}`
                    : ""}
                  {submission.metric_id
                    ? ` · operational #${submission.metric_id}`
                    : ""}
                </strong>
              </div>
              <div>
                <div style={{ color: "#64748b" }}>Department</div>
                <strong>
                  {submission.department_id
                    ? `Department #${submission.department_id}`
                    : "Institution-level"}
                </strong>
              </div>
              <div>
                <div style={{ color: "#64748b" }}>Status</div>
                <strong>{submission.status}</strong>
              </div>
            </div>
            {canUploadEvidence ? (
              <p style={{ margin: "16px 0 0", fontSize: "13px", color: "#166534" }}>
                Evidence can be uploaded while this submission is editable ({submission.status}).
                Uploads attach to submission #{submission.id}.
              </p>
            ) : (
              <p style={{ margin: "16px 0 0", fontSize: "13px", color: "#92400e" }}>
                Evidence upload is not available after a submission is no longer editable.
              </p>
            )}
          </div>

          {officialPayload ? (
            <div className="panel" style={panelStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>
                Official {officialPayload.metric_kind} response
              </h3>
              {canEditOfficial ? (
                <>
                  <OfficialMetricForm
                    metric={{
                      metric_id: officialPayload.metric_id,
                      metric_code: officialPayload.metric_code,
                      metric_title: officialPayload.metric_title,
                      metric_kind: officialPayload.metric_kind,
                      metric_type: officialPayload.metric_type,
                      weightage: officialPayload.weightage,
                      catalog_kind: "OFFICIAL",
                    }}
                    qualitativeResponse={qualitativeResponse}
                    quantitativeResponse={quantitativeResponse}
                    onQualitativeChange={setQualitativeResponse}
                    onQuantitativeChange={setQuantitativeResponse}
                    fieldStyle={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                    disabled={actionLoading}
                  />
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => {
                      if (
                        submission.metric_id &&
                        officialPayload.metric_id !== submission.metric_id
                      ) {
                        setError(
                          "Official form metric_id must match the stored operational metric."
                        );
                        return;
                      }
                      runAction(() =>
                        submissionService.updateSubmission(submission.id, {
                          data_json: buildOfficialSubmissionDataJson({
                            metric: {
                              metric_id:
                                submission.metric_id || officialPayload.metric_id,
                              metric_code: officialPayload.metric_code,
                              metric_title: officialPayload.metric_title,
                              metric_kind: officialPayload.metric_kind,
                              metric_type: officialPayload.metric_type,
                              weightage: officialPayload.weightage,
                            },
                            qualitativeResponse,
                            quantitativeResponse,
                          }),
                        })
                      );
                    }}
                    style={{
                      border: "none",
                      background: "#2563eb",
                      color: "#fff",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontWeight: 700,
                      cursor: actionLoading ? "wait" : "pointer",
                    }}
                  >
                    {actionLoading ? "Saving..." : "Save official response"}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                    Operational metric #{officialPayload.metric_id}
                    {" · "}
                    {officialPayload.metric_code}
                    {officialPayload.weightage != null
                      ? ` · weightage ${officialPayload.weightage}`
                      : ""}
                  </div>
                  <div style={{ fontSize: "13px", whiteSpace: "pre-wrap" }}>
                    {officialPayload.metric_kind === "QlM"
                      ? officialPayload.qualitative_response ||
                        "No qualitative response recorded."
                      : officialPayload.quantitative_response ||
                        "No quantitative response recorded."}
                  </div>
                  <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#64748b" }}>
                    Word limits, DVV option lists, formulas, and document checklists are not
                    imported from the official QIF source.
                  </p>
                </>
              )}
            </div>
          ) : null}

          <div className="panel" style={panelStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>Evidence / documents</h3>
            {documents.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: "13px" }}>
                No evidence attached to submission #{submission.id}.
              </div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px" }}>
                {documents.map((doc) => (
                  <li key={doc.id}>
                    {resolveDownloadFilename(doc)}
                    {doc.created_at ? ` · ${String(doc.created_at).slice(0, 10)}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel" style={panelStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>Review information</h3>
            <div style={{ fontSize: "13px", marginBottom: "8px" }}>
              Reviewed by: {submission.reviewed_by || "-"} · Reviewed at:{" "}
              {submission.reviewed_at || "-"}
            </div>
            {submission.change_request_reason ? (
              <div style={{ fontSize: "13px" }}>
                Changes requested: {submission.change_request_reason}
              </div>
            ) : null}
            {submission.rejection_reason ? (
              <div style={{ fontSize: "13px" }}>
                Rejection reason: {submission.rejection_reason}
              </div>
            ) : null}
            {reviews.length > 0 ? (
              <ul style={{ fontSize: "13px", paddingLeft: "18px" }}>
                {reviews.map((review) => (
                  <li key={review.id}>
                    {review.status || "Review"}: {review.comments || "No comments"}
                    {review.score != null ? ` · score ${review.score}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="panel" style={panelStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>Approval information</h3>
            <div style={{ fontSize: "13px" }}>
              Data approved by: {submission.approved_by || "-"} · {submission.approved_at || "-"}
            </div>
            <div style={{ fontSize: "13px", marginTop: "6px" }}>
              Final approved by: {submission.final_approved_by || "-"} · {submission.final_approved_at || "-"}
            </div>
          </div>

          <div className="panel" style={panelStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>Final submission information</h3>
            <div style={{ fontSize: "13px" }}>
              Final submitted at: {submission.final_submitted_at || "-"}
            </div>
          </div>

          {isDataApprover && status === "approved" && !submission.approved_by ? (
            <div className="panel" style={panelStyle}>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  runAction(() =>
                    submissionService.approveSubmission(submission.id, {
                      comments: "Data verified and approved.",
                    })
                  )
                }
                style={{ marginRight: "8px" }}
              >
                Data Approve
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  const reason = window.prompt("Enter reason for rejection:");
                  if (!reason) return;
                  runAction(() =>
                    submissionService.rejectSubmissionByDataApprover(submission.id, {
                      reason,
                    })
                  );
                }}
              >
                Data Reject
              </button>
            </div>
          ) : null}

          {isPrincipal && status === "approved" && Boolean(submission.approved_by) ? (
            <div className="panel" style={panelStyle}>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  runAction(() =>
                    submissionService.finalApprove(submission.id, {
                      comments: "Final approval granted by Principal / Director.",
                    })
                  )
                }
              >
                Final Approve
              </button>
            </div>
          ) : null}

          {isPrincipal && status === "final approval" ? (
            <div className="panel" style={panelStyle}>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  runAction(() => submissionService.finalSubmit(submission.id))
                }
              >
                Final Submit
              </button>
            </div>
          ) : null}

          {isDataEntry && status === "draft" ? (
            <div className="panel" style={panelStyle}>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  runAction(() => submissionService.submitSubmission(submission.id))
                }
              >
                Submit for review
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default SubmissionDetail;
