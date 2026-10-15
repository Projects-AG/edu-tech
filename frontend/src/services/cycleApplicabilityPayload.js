export const NAAC_REQUIRED_OPTIONAL_UNVERIFIED =
  "NAAC required, optional, and not-applicable rules are not verified in the official QIF. Included metrics are cycle-specific configuration only and are not marked required by default.";

export const OFFICIAL_UNCONFIGURED_MESSAGE =
  "Applicability is not configured for this official cycle. Official metrics are not treated as applicable until they are selected from this framework's operational catalogue.";

export function buildOfficialApplicabilityItems(selectedMetricIds) {
  const seen = new Set();
  const items = [];
  (selectedMetricIds || []).forEach((value) => {
    const metricId = Number(value);
    if (!metricId || seen.has(metricId)) {
      return;
    }
    seen.add(metricId);
    items.push({ metric_id: metricId, required: false });
  });
  return items;
}

export function isOfficialApplicability(applicability) {
  return Boolean(
    applicability?.has_official_operational_metrics ||
      applicability?.catalog_kind === "OFFICIAL" ||
      applicability?.catalog_kind === "OFFICIAL_INCOMPLETE"
  );
}

export function metricApplicabilityLabel(item, applicability = null) {
  if (
    isOfficialApplicability(applicability) ||
    item?.catalog_kind === "OFFICIAL"
  ) {
    return "Included for this cycle";
  }
  if (item?.required === false) {
    return "Optional";
  }
  return "Required";
}

export function groupOfficialOperationalMetrics(metrics) {
  const groups = {};
  (metrics || []).forEach((item) => {
    if (!item.criterion_id) {
      return;
    }
    if (!groups[item.criterion_id]) {
      groups[item.criterion_id] = {
        id: item.criterion_id,
        number: item.criterion_number,
        title: item.criterion_title,
        metrics: [],
      };
    }
    groups[item.criterion_id].metrics.push(item);
  });
  return Object.values(groups).sort((a, b) =>
    String(a.number).localeCompare(String(b.number), undefined, {
      numeric: true,
    })
  );
}
