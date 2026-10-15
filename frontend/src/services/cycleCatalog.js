const ACTIVE_CYCLE_STATUSES = new Set(["Active", "In Progress"]);

export const pickActiveCycle = (cycles) => {
  const list = Array.isArray(cycles) ? [...cycles] : [];
  const byNewest = (a, b) => (b.id || 0) - (a.id || 0);

  const active = list
    .filter((cycle) => ACTIVE_CYCLE_STATUSES.has(cycle.status))
    .sort(byNewest);
  if (active[0]) {
    return active[0];
  }

  return (
    list
      .filter((cycle) => cycle.status !== "Completed")
      .sort(byNewest)[0] || null
  );
};

export const isOfficialCycleCatalog = (cycle) => {
  const kind = cycle?.catalog_kind;
  return kind === "OFFICIAL" || kind === "OFFICIAL_INCOMPLETE";
};

export const OFFICIAL_WORKING_CATALOGUE_MESSAGE =
  "The live accreditation cycle uses official operational metrics. This working-catalogue page does not list or submit those metrics. Use New Submission with the cycle's operational metric ids.";
