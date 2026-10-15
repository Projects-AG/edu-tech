export const ANNOUNCED_NOT_OPERATIVE = "ANNOUNCED_NOT_OPERATIVE";
export const INTERNAL_WORKING_CATALOG = "INTERNAL_WORKING_CATALOG";
export const PRODUCTION_READY = "PRODUCTION_READY";

export const METRIC_RULES_UNVERIFIED_TEXT =
  "Metric rules (formulas, word limits, DVV, evidence, required/optional): not verified.";
export const PRODUCTION_UNAVAILABLE_TEXT =
  "Production use: not available (Draft preparation only).";
export const ANNOUNCED_TEXT =
  "Announced — not operative. This framework cannot be selected.";

function isAnnounced(source) {
  return (
    source?.catalogue_status === ANNOUNCED_NOT_OPERATIVE ||
    source?.verification_status === ANNOUNCED_NOT_OPERATIVE
  );
}

function rowCountText(source) {
  const rows = Number(source?.metric_row_count);
  const official = Number(source?.official_metric_count);
  if (Number.isFinite(rows) && rows >= 0 && official > 0) {
    return `Metric codes/titles imported: ${rows} of ${official}.`;
  }
  if (source?.metric_catalogue_complete === true) {
    return "Metric codes/titles imported: official row count reached.";
  }
  if (Number.isFinite(rows) && rows > 0) {
    return `Metric codes/titles imported: ${rows} (official count not recorded).`;
  }
  return "Metric codes/titles imported: incomplete.";
}

// Row-count completeness, rule verification and production readiness are
// reported separately; a full row count never implies verified rules.
export function frameworkReadinessLines(source) {
  if (!source) {
    return [];
  }
  if (isAnnounced(source)) {
    return [ANNOUNCED_TEXT];
  }
  if (source.catalogue_status === INTERNAL_WORKING_CATALOG) {
    return [
      "EduVerse internal working catalogue — not an official NAAC framework.",
    ];
  }
  const lines = [rowCountText(source)];
  lines.push(
    source.metric_rules_verified === true
      ? "Metric rules: verified."
      : METRIC_RULES_UNVERIFIED_TEXT
  );
  lines.push(
    source.allows_production_cycles === true &&
      source.catalogue_status === PRODUCTION_READY
      ? "Production use: available."
      : PRODUCTION_UNAVAILABLE_TEXT
  );
  return lines;
}

export function frameworkReadinessText(source) {
  return frameworkReadinessLines(source).join(" ");
}

export function institutionFrameworkLabel(institution) {
  if (institution?.confirmed_framework_name) {
    const version = institution.confirmed_framework_version
      ? ` (${institution.confirmed_framework_version})`
      : "";
    return `${institution.confirmed_framework_name}${version}`;
  }
  if (institution?.eligible_cycle_framework_id) {
    return "Mapped from category (not yet confirmed)";
  }
  return "No verified framework";
}

export function frameworkOptionLabel(framework) {
  if (!framework) {
    return "";
  }
  const base = `${framework.name} (${framework.version})`;
  if (isAnnounced(framework)) {
    return `${base} — announced, not operative`;
  }
  if (framework.allows_production_cycles !== true) {
    return `${base} — Draft preparation only`;
  }
  return base;
}
