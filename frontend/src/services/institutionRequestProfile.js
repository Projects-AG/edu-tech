export const OFFICIAL_CATEGORY_REQUIRED_MESSAGE =
  "Select the official NAAC category for your institution.";

export const CATEGORY_SPECIFIC_FIELDS = {
  affiliated_university: ["AFFILIATED_COLLEGE"],
  autonomous_status: ["AFFILIATED_COLLEGE"],
  parent_institution_name: ["CONSTITUENT_COLLEGE"],
  is_constituent_unit: ["CONSTITUENT_COLLEGE"],
  programme_level: ["AFFILIATED_COLLEGE", "CONSTITUENT_COLLEGE"],
};

const EMPTY_VALUES = {
  affiliated_university: "",
  autonomous_status: "",
  parent_institution_name: "",
  is_constituent_unit: false,
  programme_level: "",
};

export function fieldAppliesToCategory(field, category) {
  const allowed = CATEGORY_SPECIFIC_FIELDS[field];
  return !allowed || allowed.includes(category);
}

// Hidden category-specific inputs must not keep stale values that would
// change the framework recommendation for another category.
export function applyInstitutionRequestChange(previous, name, value) {
  const next = { ...previous, [name]: value };
  if (name !== "official_category" || previous.official_category === value) {
    return next;
  }
  Object.keys(CATEGORY_SPECIFIC_FIELDS).forEach((field) => {
    if (!fieldAppliesToCategory(field, value)) {
      next[field] = EMPTY_VALUES[field];
    }
  });
  return next;
}

function trimmedOrNull(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function categorySpecificPayload(request) {
  const category = request.official_category || "";
  const payload = {};
  Object.keys(CATEGORY_SPECIFIC_FIELDS).forEach((field) => {
    if (!fieldAppliesToCategory(field, category)) {
      payload[field] = field === "is_constituent_unit" ? false : null;
    } else if (field === "is_constituent_unit") {
      payload[field] = Boolean(request[field]);
    } else {
      payload[field] = trimmedOrNull(request[field]);
    }
  });
  return payload;
}

export function validateOfficialCategory(category, categories = []) {
  const code = String(category || "").trim();
  if (!code) {
    return OFFICIAL_CATEGORY_REQUIRED_MESSAGE;
  }
  if (
    Array.isArray(categories) &&
    categories.length > 0 &&
    !categories.some((item) => item?.code === code)
  ) {
    return "Select a supported official NAAC category.";
  }
  return "";
}
