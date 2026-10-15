import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FRAMEWORK_REQUIRED_MESSAGE,
  LIVE_CYCLE_STATUSES,
  buildCycleCreatePayload,
  cycleStatusesForFramework,
  cycleStatusesForLiveConstraint,
  NO_ELIGIBLE_FRAMEWORK_MESSAGE,
  eligibleFrameworksForCycle,
  institutionHasOtherLiveCycle,
  noEligibleFrameworkReason,
} from "./cycleCreatePayload.js";

describe("no eligible framework message", () => {
  it("shows the backend reason when no verified framework matches", () => {
    const reason =
      "No official NAAC category is set for this institution, so no verified framework can be loaded.";
    assert.equal(
      noEligibleFrameworkReason({
        eligible_cycle_framework_id: null,
        eligible_cycle_framework_reason: reason,
      }),
      reason
    );
  });

  it("falls back to the generic message and handles no selection", () => {
    assert.equal(
      noEligibleFrameworkReason({ eligible_cycle_framework_reason: "  " }),
      NO_ELIGIBLE_FRAMEWORK_MESSAGE
    );
    assert.equal(noEligibleFrameworkReason(null), "Select an institution first.");
  });

  it("offers the Autonomous framework once the institution is eligible", () => {
    const options = eligibleFrameworksForCycle(
      [
        { id: 3, code: "RAF_AUTONOMOUS_COLLEGE", confirmable: true },
        { id: 2, code: "RAF_UNIVERSITY", confirmable: true },
      ],
      3
    );
    assert.deepEqual(
      options.map((item) => item.code),
      ["RAF_AUTONOMOUS_COLLEGE"]
    );
  });
});

const frameworks = [
  { id: 1, code: "EDUVERSE_INTERNAL_WORKING_CATALOG", confirmable: false },
  { id: 3, code: "RAF_AUTONOMOUS_COLLEGE", confirmable: true, allows_production_cycles: false },
  { id: 4, code: "RAF_UNIVERSITY", confirmable: true, allows_production_cycles: false },
  { id: 6, code: "BINARY_ACCREDITATION", confirmable: false },
];

describe("cycle create payload", () => {
  it("includes the selected framework_id in the create request", () => {
    const payload = buildCycleCreatePayload({
      form: {
        institution_id: "1",
        name: "QA Cycle",
        code: "QA-NEW",
        academic_period: "2026-2031",
        description: "Draft official bind",
        status: "Draft",
      },
      frameworkId: "3",
    });
    assert.equal(payload.framework_id, 3);
    assert.equal(payload.institution_id, 1);
    assert.equal(payload.status, "Draft");
  });

  it("rejects a missing framework selection instead of defaulting to INTERNAL", () => {
    assert.throws(
      () =>
        buildCycleCreatePayload({
          form: { institution_id: 1, name: "No Framework", code: "NF-1" },
          frameworkId: "",
        }),
      (error) => {
        assert.equal(error.code, "FRAMEWORK_REQUIRED");
        assert.equal(error.message, FRAMEWORK_REQUIRED_MESSAGE);
        return true;
      }
    );
  });

  it("offers only the institution's eligible framework", () => {
    assert.deepEqual(
      eligibleFrameworksForCycle(frameworks, 3).map((item) => item.id),
      [3]
    );
    assert.deepEqual(
      eligibleFrameworksForCycle(frameworks, "4").map((item) => item.id),
      [4]
    );
  });

  it("offers nothing when the institution has no eligible framework", () => {
    assert.deepEqual(eligibleFrameworksForCycle(frameworks), []);
    assert.deepEqual(eligibleFrameworksForCycle(frameworks, null), []);
    assert.deepEqual(eligibleFrameworksForCycle(frameworks, ""), []);
  });

  it("never offers internal or announced frameworks even if eligible id points at them", () => {
    assert.deepEqual(eligibleFrameworksForCycle(frameworks, 1), []);
    assert.deepEqual(eligibleFrameworksForCycle(frameworks, 6), []);
  });

  it("keeps production statuses disabled when the framework is not production-ready", () => {
    const statuses = cycleStatusesForFramework(
      ["Draft", "Active", "In Progress", "Completed", "Archived"],
      frameworks[1]
    );
    assert.deepEqual(statuses, ["Draft", "Archived"]);
  });

  it("blocks a second live cycle for the same institution only", () => {
    const cycles = [
      { id: 10, institution_id: 1, status: "Active" },
      { id: 11, institution_id: 1, status: "Completed" },
      { id: 20, institution_id: 2, status: "Draft" },
    ];
    assert.equal(institutionHasOtherLiveCycle(cycles, 1, 12), true);
    assert.equal(institutionHasOtherLiveCycle(cycles, 1, 10), false);
    assert.equal(institutionHasOtherLiveCycle(cycles, 2, 20), false);
    assert.deepEqual(LIVE_CYCLE_STATUSES, ["Active", "In Progress"]);
    assert.deepEqual(
      cycleStatusesForLiveConstraint(
        ["Draft", "Active", "In Progress", "Completed", "Archived"],
        true
      ),
      ["Draft", "Completed", "Archived"]
    );
  });
});
