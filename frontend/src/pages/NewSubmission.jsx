import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import PageHeader from "../components/common/PageHeader";
import OfficialMetricForm from "../components/OfficialMetricForm";
import { useAuth } from "../context/AuthContext";
import { ROLES, normalizeRole } from "../config/roles";
import {
  OFFICIAL_UNCONFIGURED_MESSAGE,
  isOfficialApplicability,
  metricApplicabilityLabel,
} from "../services/cycleApplicabilityPayload";
import accreditationCycleService, {
  pickActiveCycle,
} from "../services/accreditationCycleService";
import criteriaService from "../services/criteriaService";
import {
  buildOfficialSubmissionDataJson,
  officialFormView,
  officialMetricKind,
  officialSubmissionBlocked,
} from "../services/officialMetricForm";
import submissionService from "../services/submissionService";
import { formatApiError } from "../services/apiError";

const fieldStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  fontSize: "13px",
};

const groupCatalogMetrics = (criteria, sections, metrics) => {
  const sectionsById = Object.fromEntries(
    (sections || []).map((section) => [section.id, section])
  );
  const groups = {};
  (metrics || []).forEach((metric) => {
    const section = sectionsById[metric.section_id];
    const criterion = (criteria || []).find(
      (item) => item.id === section?.criterion_id
    );
    if (!criterion) {
      return;
    }
    if (!groups[criterion.id]) {
      groups[criterion.id] = {
        id: criterion.id,
        number: criterion.number,
        title: criterion.title,
        metrics: [],
      };
    }
    groups[criterion.id].metrics.push({
      metric_id: metric.id,
      metric_code: metric.code,
      metric_title: metric.title,
      required: true,
      criterion_id: criterion.id,
      criterion_number: criterion.number,
      criterion_title: criterion.title,
    });
  });
  return Object.values(groups).sort((a, b) =>
    String(a.number).localeCompare(String(b.number), undefined, { numeric: true })
  );
};

export const NewSubmission = () => {
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();
  const role = normalizeRole(activeRole || user?.role);
  const isDeptCoordinator = role === ROLES.DEPT_COORDINATOR;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cycle, setCycle] = useState(null);
  const [applicability, setApplicability] = useState(null);
  const [criteriaOptions, setCriteriaOptions] = useState([]);
  const [metricOptions, setMetricOptions] = useState([]);
  const [criterionId, setCriterionId] = useState("");
  const [metricId, setMetricId] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [qualitativeResponse, setQualitativeResponse] = useState("");
  const [quantitativeResponse, setQuantitativeResponse] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const cycles = await accreditationCycleService.getCycles();
        const active = pickActiveCycle(cycles);
        setCycle(active);

        if (active) {
          const data = await accreditationCycleService.getApplicableMetrics(
            active.id
          );
          setApplicability(data);
          if (data.configured) {
            const grouped = {};
            (data.applicable_metrics || []).forEach((item) => {
              if (!item.criterion_id) {
                return;
              }
              if (!grouped[item.criterion_id]) {
                grouped[item.criterion_id] = {
                  id: item.criterion_id,
                  number: item.criterion_number,
                  title: item.criterion_title,
                  metrics: [],
                };
              }
              grouped[item.criterion_id].metrics.push(item);
            });
            const options = Object.values(grouped);
            setCriteriaOptions(options);
            return;
          }
          if (data.uses_catalog_fallback === false) {
            setCriteriaOptions([]);
            setError(
              data.has_official_operational_metrics
                ? OFFICIAL_UNCONFIGURED_MESSAGE
                : "This cycle's official metric catalogue is not available for submissions. The working catalogue is not used as a substitute."
            );
            return;
          }
        }

        const [criteria, sections, metrics] = await Promise.all([
          criteriaService.getCriteria(),
          criteriaService.getSections(),
          criteriaService.getMetrics(),
        ]);
        setApplicability((current) => current || {
          configured: false,
          uses_catalog_fallback: true,
        });
        setCriteriaOptions(groupCatalogMetrics(criteria, sections, metrics));
      } catch (err) {
        setError(
          formatApiError(
            err,
            "Unable to load cycle metrics for a new submission."
          )
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const selected = criteriaOptions.find(
      (item) => String(item.id) === String(criterionId)
    );
    setMetricOptions(selected?.metrics || []);
    setMetricId("");
  }, [criterionId, criteriaOptions]);

  const selectedMetric = useMemo(
    () =>
      metricOptions.find(
        (item) => String(item.metric_id) === String(metricId)
      ) || null,
    [metricId, metricOptions]
  );

  useEffect(() => {
    if (selectedMetric) {
      setTitle(
        `${selectedMetric.metric_code} - ${selectedMetric.metric_title || "Submission"}`
      );
    }
  }, [selectedMetric]);

  useEffect(() => {
    setDetails("");
    setQualitativeResponse("");
    setQuantitativeResponse("");
  }, [metricId]);

  const officialBlocked = officialSubmissionBlocked(applicability);
  const officialCycle =
    isOfficialApplicability(applicability) && applicability?.configured;
  const officialForm = officialCycle;
  const officialView = selectedMetric ? officialFormView(selectedMetric) : null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (officialBlocked) {
      setError(
        applicability?.has_official_operational_metrics
          ? OFFICIAL_UNCONFIGURED_MESSAGE
          : "This cycle's official metric catalogue is not available for submissions. The working catalogue is not used as a substitute."
      );
      return;
    }
    if (!selectedMetric) {
      setError("Select a criterion and metric.");
      return;
    }
    if (officialForm && !officialView?.configured) {
      setError(
        officialView?.reason ||
          "Official form is unconfigured for this metric."
      );
      return;
    }
    try {
      setSaving(true);
      setError("");
      const payload = {
        title: title.trim() || `${selectedMetric.metric_code} submission`,
        criterion_id: selectedMetric.criterion_id,
        metric_code: selectedMetric.metric_code,
        metric_id: selectedMetric.metric_id || null,
        data_json: officialForm
          ? buildOfficialSubmissionDataJson({
              metric: selectedMetric,
              qualitativeResponse,
              quantitativeResponse,
            })
          : JSON.stringify({
              notes: details.trim() || null,
              metric_code: selectedMetric.metric_code,
              metric_title: selectedMetric.metric_title,
              metric_id: selectedMetric.metric_id || null,
            }),
      };
      const created = await submissionService.createSubmission(payload);
      navigate(`/submissions/${created.id}`, {
        state: { created: true },
      });
    } catch (err) {
      setError(formatApiError(err, "Unable to create the submission."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ color: "#1e293b" }}>
      <PageHeader
        eyebrow="ACCREDITATION DOSSIER"
        title="New Submission"
        description="Create a metric-based draft. The active accreditation cycle is assigned by the backend."
        secondaryAction={{
          label: "Back to submissions",
          icon: ArrowLeft,
          onClick: () => navigate("/submissions"),
        }}
      />

      {loading ? (
        <div className="panel" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
          Loading applicable metrics...
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="panel"
          style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}
        >
          {error ? (
            <div style={{ color: "#b91c1c", marginBottom: "12px", fontSize: "13px", whiteSpace: "pre-line" }}>
              {error}
            </div>
          ) : null}

          <div
            style={{
              marginBottom: "16px",
              padding: "10px 12px",
              borderRadius: "8px",
              background: cycle ? "#eff6ff" : "#fff7ed",
              fontSize: "13px",
            }}
          >
            {cycle ? (
              <>
                Active cycle: <strong>{cycle.name}</strong> ({cycle.code}
                {cycle.academic_period ? `, ${cycle.academic_period}` : ""}) · {cycle.status}.
                {" "}Cycle assignment is automatic. You cannot select or override cycle_id.
                {applicability?.configured
                  ? isOfficialApplicability(applicability)
                    ? " Showing official metrics included for this cycle. Required/optional is not a verified NAAC classification."
                    : " Showing this cycle's applicable metrics only."
                  : applicability?.uses_catalog_fallback === false
                    ? ` ${OFFICIAL_UNCONFIGURED_MESSAGE}`
                    : " Applicability is unconfigured, so the working catalog is shown."}
              </>
            ) : (
              <>
                No active accreditation cycle. The draft can still be created with cycle_id left empty.
              </>
            )}
          </div>

          {officialBlocked ? (
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#9a3412" }}>
              This official cycle has no configured applicable metrics. A draft
              cannot be created from the working catalogue as a substitute.
            </p>
          ) : null}

          {officialBlocked ? null : (
            <>
          {isDeptCoordinator ? (
            <label style={{ display: "block", marginBottom: "12px" }}>
              Department
              <input
                readOnly
                value={
                  user?.department_name ||
                  (user?.department_id
                    ? `Department #${user.department_id}`
                    : "Assigned department")
                }
                style={{ ...fieldStyle, background: "#f8fafc" }}
              />
            </label>
          ) : null}

          <label style={{ display: "block", marginBottom: "12px" }}>
            Criterion
            <select
              required
              value={criterionId}
              onChange={(event) => setCriterionId(event.target.value)}
              style={fieldStyle}
            >
              <option value="">Select criterion</option>
              {criteriaOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.number} — {item.title}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", marginBottom: "12px" }}>
            Metric
            <select
              required
              value={metricId}
              onChange={(event) => setMetricId(event.target.value)}
              disabled={!criterionId}
              style={fieldStyle}
            >
              <option value="">Select metric</option>
              {metricOptions.map((item) => (
                <option key={item.metric_id} value={item.metric_id}>
                  {item.metric_code}
                  {officialMetricKind(item) ? ` · ${officialMetricKind(item)}` : ""}
                  {" — "}
                  {metricApplicabilityLabel(item, applicability)}
                  {item.metric_title ? ` · ${item.metric_title}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", marginBottom: "12px" }}>
            Title
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              style={fieldStyle}
            />
          </label>

          {officialForm ? (
            selectedMetric ? (
              <OfficialMetricForm
                metric={selectedMetric}
                qualitativeResponse={qualitativeResponse}
                quantitativeResponse={quantitativeResponse}
                onQualitativeChange={setQualitativeResponse}
                onQuantitativeChange={setQuantitativeResponse}
                fieldStyle={fieldStyle}
              />
            ) : null
          ) : (
            <label style={{ display: "block", marginBottom: "16px" }}>
              Data / details
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={4}
                placeholder="Enter metric values, notes, or supporting details"
                style={fieldStyle}
              />
            </label>
          )}
            </>
          )}

          <button
            type="submit"
            disabled={
              saving ||
              officialBlocked ||
              (officialForm && selectedMetric && !officialView?.configured)
            }
            style={{
              border: "none",
              background: "#2563eb",
              color: "#fff",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 700,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? "Creating draft..." : "Create Draft Submission"}
          </button>
        </form>
      )}
    </div>
  );
};

export default NewSubmission;
