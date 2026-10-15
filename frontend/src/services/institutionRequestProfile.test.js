import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  OFFICIAL_CATEGORY_REQUIRED_MESSAGE,
  applyInstitutionRequestChange,
  categorySpecificPayload,
  validateOfficialCategory,
} from "./institutionRequestProfile.js";

const constituentDraft = {
  official_category: "CONSTITUENT_COLLEGE",
  affiliated_university: "",
  autonomous_status: "",
  parent_institution_name: "Parent University",
  is_constituent_unit: true,
  programme_level: "UG",
};

describe("institution request category fields", () => {
  it("clears constituent fields when switching to Autonomous College", () => {
    const next = applyInstitutionRequestChange(
      constituentDraft,
      "official_category",
      "AUTONOMOUS_COLLEGE"
    );
    assert.equal(next.official_category, "AUTONOMOUS_COLLEGE");
    assert.equal(next.parent_institution_name, "");
    assert.equal(next.is_constituent_unit, false);
    assert.equal(next.programme_level, "");
  });

  it("keeps programme level when switching between affiliated and constituent", () => {
    const next = applyInstitutionRequestChange(
      constituentDraft,
      "official_category",
      "AFFILIATED_COLLEGE"
    );
    assert.equal(next.programme_level, "UG");
    assert.equal(next.parent_institution_name, "");
    assert.equal(next.is_constituent_unit, false);
  });

  it("clears autonomy fields when leaving Affiliated College", () => {
    const next = applyInstitutionRequestChange(
      {
        official_category: "AFFILIATED_COLLEGE",
        affiliated_university: "State University",
        autonomous_status: "autonomous",
        programme_level: "PG",
      },
      "official_category",
      "UNIVERSITY"
    );
    assert.equal(next.affiliated_university, "");
    assert.equal(next.autonomous_status, "");
    assert.equal(next.programme_level, "");
  });

  it("leaves other fields untouched for ordinary edits", () => {
    const next = applyInstitutionRequestChange(
      constituentDraft,
      "parent_institution_name",
      "New Parent"
    );
    assert.equal(next.parent_institution_name, "New Parent");
    assert.equal(next.is_constituent_unit, true);
  });

  it("sends only fields relevant to the selected category", () => {
    const payload = categorySpecificPayload({
      ...constituentDraft,
      official_category: "UNIVERSITY",
      autonomous_status: "autonomous",
    });
    assert.deepEqual(payload, {
      affiliated_university: null,
      autonomous_status: null,
      parent_institution_name: null,
      is_constituent_unit: false,
      programme_level: null,
    });
    const constituent = categorySpecificPayload(constituentDraft);
    assert.equal(constituent.parent_institution_name, "Parent University");
    assert.equal(constituent.is_constituent_unit, true);
    assert.equal(constituent.programme_level, "UG");
    assert.equal(constituent.affiliated_university, null);
  });

  it("requires a supported official category", () => {
    const categories = [{ code: "UNIVERSITY" }, { code: "AUTONOMOUS_COLLEGE" }];
    assert.equal(validateOfficialCategory("", categories), OFFICIAL_CATEGORY_REQUIRED_MESSAGE);
    assert.equal(validateOfficialCategory("BINARY", categories), "Select a supported official NAAC category.");
    assert.equal(validateOfficialCategory("UNIVERSITY", categories), "");
    assert.equal(validateOfficialCategory("UNIVERSITY", []), "");
  });
});
