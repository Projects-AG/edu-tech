export const FRAMEWORK_REQUIRED_MESSAGE =
  "Select a NAAC framework. The internal working catalogue is not assigned automatically.";

export const NO_ELIGIBLE_FRAMEWORK_MESSAGE =
  "Set or confirm the institution's official NAAC category first. Only the framework mapped to that category can be used for a cycle.";

export const PRODUCTION_STATUSES = ["Active", "In Progress", "Completed"];
export const LIVE_CYCLE_STATUSES = ["Active", "In Progress"];

export function institutionHasOtherLiveCycle(
  cycles,
  institutionId,
  excludeCycleId = null
) {
  if (institutionId == null || institutionId === "") {
    return false;
  }
  return (Array.isArray(cycles) ? cycles : []).some((cycle) => {
    if (Number(cycle.institution_id) !== Number(institutionId)) {
      return false;
    }
    if (
      excludeCycleId != null &&
      excludeCycleId !== "" &&
      Number(cycle.id) === Number(excludeCycleId)
    ) {
      return false;
    }
    return LIVE_CYCLE_STATUSES.includes(cycle.status);
  });
}

export function cycleStatusesForLiveConstraint(
  allStatuses,
  hasOtherLiveCycle
) {
  const statuses = Array.isArray(allStatuses) ? allStatuses : [];
  if (!hasOtherLiveCycle) {
    return statuses;
  }
  return statuses.filter((status) => !LIVE_CYCLE_STATUSES.includes(status));
}

export function noEligibleFrameworkReason(institution) {
  if (!institution) {
    return "Select an institution first.";
  }
  const reason = String(
    institution.eligible_cycle_framework_reason || ""
  ).trim();
  return reason || NO_ELIGIBLE_FRAMEWORK_MESSAGE;
}

// The institution's eligible framework comes from the backend category
// mapping. Without it, no framework may be offered or silently selected.
export function eligibleFrameworksForCycle(
  frameworks,
  eligibleFrameworkId = null
) {
  if (eligibleFrameworkId == null || eligibleFrameworkId === "") {
    return [];
  }
  const eligibleId = Number(eligibleFrameworkId);
  return (Array.isArray(frameworks) ? frameworks : []).filter(
    (item) =>
      item && item.confirmable === true && Number(item.id) === eligibleId
  );
}

export function cycleStatusesForFramework(allStatuses, framework) {
  const statuses = Array.isArray(allStatuses) ? allStatuses : [];
  if (!framework || framework.allows_production_cycles) {
    return statuses;
  }
  return statuses.filter((status) => !PRODUCTION_STATUSES.includes(status));
}

export function buildCycleCreatePayload({ form = {}, user = {}, frameworkId }) {
  const parsedId = Number(frameworkId);
  if (!frameworkId || Number.isNaN(parsedId) || parsedId <= 0) {
    const error = new Error(FRAMEWORK_REQUIRED_MESSAGE);
    error.code = "FRAMEWORK_REQUIRED";
    throw error;
  }
  const institutionId = Number(form.institution_id || user.institution_id);
  if (!institutionId) {
    throw new Error("Select an institution.");
  }
  return {
    institution_id: institutionId,
    name: String(form.name || "").trim(),
    code: String(form.code || "").trim(),
    academic_period: String(form.academic_period || "").trim() || null,
    description: String(form.description || "").trim() || null,
    status: form.status || "Draft",
    framework_id: parsedId,
  };
}
