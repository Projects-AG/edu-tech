import { isOfficialApplicability } from "./cycleApplicabilityPayload.js";

export const OFFICIAL_FORM_KIND = "OFFICIAL";

export const OFFICIAL_SOURCE_GAPS = [
  "word_limit",
  "dvv_option_list",
  "formula_template",
  "year_wise_data_template",
  "sss_workflow",
  "bibliometrics_workflow",
  "metric_specific_evidence_checklist",
  "required_optional_na",
];

export const OFFICIAL_FORM_NOTICE =
  "Official QIF source verifies QlM/QnM kind, title, code, and weightage. Word limits, DVV option lists, formulas, SSS, bibliometrics, and document checklists are not imported and are not validated here.";

export function officialMetricKind(metric) {
  if (metric?.metric_kind === "QlM" || metric?.metric_kind === "QnM") {
    return metric.metric_kind;
  }
  return null;
}

export function usesOfficialMetricForm(metric, applicability) {
  return Boolean(
    metric &&
      (metric.catalog_kind === "OFFICIAL" ||
        isOfficialApplicability(applicability))
  );
}

export function officialFormView(metric) {
  const kind = officialMetricKind(metric);
  if (!kind) {
    return {
      configured: false,
      metric_kind: null,
      fields: [],
      word_limit: null,
      option_list: null,
      formula: null,
      reason:
        "Official form is unconfigured. Verified QlM/QnM metric_kind is missing.",
    };
  }
  return {
    configured: true,
    metric_kind: kind,
    fields:
      kind === "QlM"
        ? ["qualitative_response", "notes"]
        : ["quantitative_response", "notes"],
    word_limit: null,
    option_list: null,
    formula: null,
    reason: null,
  };
}

export function officialSubmissionBlocked(applicability) {
  return Boolean(
    isOfficialApplicability(applicability) &&
      applicability?.configured === false &&
      applicability?.uses_catalog_fallback === false
  );
}

export function officialMetricsEligibleForForm(applicability) {
  if (!isOfficialApplicability(applicability) || !applicability?.configured) {
    return [];
  }
  return (applicability.applicable_metrics || []).filter((item) => {
    const kind = officialMetricKind(item);
    return kind === "QlM" || kind === "QnM";
  });
}

export function buildOfficialSubmissionDataJson({
  metric,
  qualitativeResponse,
  quantitativeResponse,
  notes,
}) {
  const view = officialFormView(metric);
  if (!view.configured) {
    throw new Error(view.reason);
  }
  return JSON.stringify({
    form_kind: OFFICIAL_FORM_KIND,
    metric_id: metric.metric_id,
    metric_code: metric.metric_code,
    metric_title: metric.metric_title || null,
    metric_kind: view.metric_kind,
    metric_type: metric.metric_type || null,
    weightage: metric.weightage ?? null,
    qualitative_response:
      view.metric_kind === "QlM"
        ? String(qualitativeResponse || "").trim() || null
        : null,
    quantitative_response:
      view.metric_kind === "QnM"
        ? String(quantitativeResponse || "").trim() || null
        : null,
    notes: String(notes || "").trim() || null,
    word_limit: null,
    option_list: null,
    formula: null,
    source_gaps: OFFICIAL_SOURCE_GAPS,
    evidence_mode: "generic_existing_upload",
  });
}

export function parseOfficialDataJson(raw) {
  if (!raw) {
    return null;
  }
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || parsed.form_kind !== OFFICIAL_FORM_KIND) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
