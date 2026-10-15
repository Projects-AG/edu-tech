import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildOfficialApplicabilityItems,
  groupOfficialOperationalMetrics,
  metricApplicabilityLabel,
} from "./cycleApplicabilityPayload.js";

describe("official cycle applicability payload", () => {
  it("includes only selected official metric IDs and does not mark them required", () => {
    const items = buildOfficialApplicabilityItems(["53", 54, 53, "", null]);
    assert.deepEqual(items, [
      { metric_id: 53, required: false },
      { metric_id: 54, required: false },
    ]);
  });

  it("does not invent working-catalogue rows from matching codes", () => {
    const items = buildOfficialApplicabilityItems([53]);
    assert.equal(items[0].metric_id, 53);
    assert.notEqual(items[0].metric_id, 1);
  });

  it("does not display required=false as a verified NAAC optional label", () => {
    assert.equal(
      metricApplicabilityLabel(
        { required: false, catalog_kind: "OFFICIAL" },
        { has_official_operational_metrics: true, naac_required_optional_verified: false }
      ),
      "Included for this cycle"
    );
    assert.equal(
      metricApplicabilityLabel({ required: false, catalog_kind: "WORKING" }),
      "Optional"
    );
    assert.equal(
      metricApplicabilityLabel({ required: true, catalog_kind: "WORKING" }),
      "Required"
    );
  });

  it("groups official operational metrics by criterion without treating them as applicable", () => {
    const groups = groupOfficialOperationalMetrics([
      {
        metric_id: 53,
        criterion_id: 1,
        criterion_number: "C1",
        criterion_title: "Curricular Aspects",
      },
      {
        metric_id: 90,
        criterion_id: 2,
        criterion_number: "C2",
        criterion_title: "Teaching-Learning",
      },
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].metrics[0].metric_id, 53);
  });
});
