import React, { useEffect, useState } from "react";

import api from "../services/api";
import {
  OFFICIAL_FORM_NOTICE,
  officialFormView,
  officialMetricKind,
} from "../services/officialMetricForm";

export const OfficialMetricForm = ({
  metric,
  qualitativeResponse,
  quantitativeResponse,
  onQualitativeChange,
  onQuantitativeChange,
  fieldStyle,
  disabled = false,
}) => {
  const view = officialFormView(metric);
  const kind = officialMetricKind(metric);
  const [evidence, setEvidence] = useState([]);
  const [evidenceError, setEvidenceError] = useState("");

  useEffect(() => {
    if (!metric?.metric_id) {
      setEvidence([]);
      setEvidenceError("");
      return undefined;
    }
    let cancelled = false;
    api
      .get("/evidence-requirements", {
        params: { metric_id: metric.metric_id },
      })
      .then((response) => {
        if (!cancelled) {
          setEvidenceError("");
          setEvidence(Array.isArray(response.data) ? response.data : []);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setEvidence([]);
          setEvidenceError(
            error?.response?.data?.detail ||
              "Unable to load evidence requirements for this official metric."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [metric?.metric_id]);

  if (!view.configured) {
    return (
      <div
        style={{
          marginBottom: "16px",
          padding: "10px 12px",
          borderRadius: "8px",
          background: "#fff7ed",
          fontSize: "13px",
          color: "#9a3412",
        }}
      >
        {view.reason} This metric stays out of the official response form until
        QlM/QnM is present in the catalogue.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          marginBottom: "12px",
          padding: "10px 12px",
          borderRadius: "8px",
          background: "#f8fafc",
          fontSize: "13px",
        }}
      >
        <div>
          Official metric{" "}
          <strong>
            {metric.metric_code} · {kind}
          </strong>
          {metric.weightage != null ? ` · weightage ${metric.weightage}` : ""}
        </div>
        {metric.metric_title ? (
          <div style={{ marginTop: "6px", color: "#334155" }}>
            {metric.metric_title}
          </div>
        ) : null}
        <div style={{ marginTop: "8px", color: "#64748b" }}>
          {OFFICIAL_FORM_NOTICE}
        </div>
      </div>

      {kind === "QlM" ? (
        <label style={{ display: "block", marginBottom: "12px" }}>
          Qualitative response
          <textarea
            value={qualitativeResponse}
            onChange={(event) => onQualitativeChange(event.target.value)}
            rows={8}
            disabled={disabled}
            placeholder="Enter the qualitative narrative. No official word limit is configured from the imported QIF."
            style={fieldStyle}
          />
        </label>
      ) : (
        <label style={{ display: "block", marginBottom: "12px" }}>
          Quantitative response
          <textarea
            value={quantitativeResponse}
            onChange={(event) => onQuantitativeChange(event.target.value)}
            rows={6}
            disabled={disabled}
            placeholder="Enter the institution-reported quantitative response. Official formulas, year-wise templates, and A–E option lists are not imported."
            style={fieldStyle}
          />
        </label>
      )}

      <div
        style={{
          marginBottom: "16px",
          padding: "10px 12px",
          borderRadius: "8px",
          background: "#f0fdf4",
          fontSize: "13px",
          color: "#166534",
        }}
      >
        Evidence uses the existing document-upload workflow after the draft is
        created. Official DVV document lists are not imported.
        {evidenceError ? (
          <div style={{ marginTop: "8px", color: "#b91c1c" }}>{evidenceError}</div>
        ) : null}
        {evidence.length > 0 ? (
          <ul style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
            {evidence.map((item) => (
              <li key={item.id}>
                {item.title}
                {item.description ? ` — ${item.description}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ marginTop: "8px" }}>
            No metric-specific evidence checklist is configured.
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficialMetricForm;
