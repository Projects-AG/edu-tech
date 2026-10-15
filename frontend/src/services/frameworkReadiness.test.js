import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ANNOUNCED_TEXT,
  METRIC_RULES_UNVERIFIED_TEXT,
  PRODUCTION_UNAVAILABLE_TEXT,
  frameworkOptionLabel,
  frameworkReadinessLines,
  frameworkReadinessText,
  institutionFrameworkLabel,
} from "./frameworkReadiness.js";

const autonomous = {
  name: "RAF Autonomous College",
  version: "2023-07-11",
  verification_status: "VERIFIED",
  catalogue_status: "CATALOGUE_INCOMPLETE",
  metric_catalogue_complete: true,
  metric_row_count: 85,
  official_metric_count: 85,
  metric_rules_verified: false,
  allows_production_cycles: false,
};

describe("framework readiness wording", () => {
  it("separates row count, rule verification and production readiness", () => {
    assert.deepEqual(frameworkReadinessLines(autonomous), [
      "Metric codes/titles imported: 85 of 85.",
      METRIC_RULES_UNVERIFIED_TEXT,
      PRODUCTION_UNAVAILABLE_TEXT,
    ]);
  });

  it("never describes the catalogue as simply complete", () => {
    const text = frameworkReadinessText(autonomous);
    assert.doesNotMatch(text, /catalogue: complete/i);
    assert.doesNotMatch(text, /production-ready/i);
  });

  it("handles responses without row counts", () => {
    const lines = frameworkReadinessLines({
      catalogue_status: "CATALOGUE_INCOMPLETE",
      metric_catalogue_complete: true,
      metric_rules_verified: false,
    });
    assert.equal(lines[0], "Metric codes/titles imported: official row count reached.");
    assert.equal(lines[1], METRIC_RULES_UNVERIFIED_TEXT);
    assert.equal(lines[2], PRODUCTION_UNAVAILABLE_TEXT);
  });

  it("reports announced frameworks as not operative", () => {
    const binary = {
      name: "Binary Accreditation",
      version: "announced",
      verification_status: "ANNOUNCED_NOT_OPERATIVE",
      catalogue_status: "ANNOUNCED_NOT_OPERATIVE",
    };
    assert.deepEqual(frameworkReadinessLines(binary), [ANNOUNCED_TEXT]);
    assert.match(frameworkOptionLabel(binary), /announced, not operative/);
  });

  it("does not claim production use without an explicit production-ready status", () => {
    const lines = frameworkReadinessLines({
      ...autonomous,
      allows_production_cycles: true,
    });
    assert.equal(lines[2], PRODUCTION_UNAVAILABLE_TEXT);
  });

  it("labels Draft-only frameworks in option lists", () => {
    assert.equal(
      frameworkOptionLabel(autonomous),
      "RAF Autonomous College (2023-07-11) — Draft preparation only"
    );
    assert.deepEqual(frameworkReadinessLines(null), []);
  });

  it("labels an institution's loaded framework", () => {
    assert.equal(
      institutionFrameworkLabel({
        confirmed_framework_name: "RAF Autonomous College",
        confirmed_framework_version: "2023-07-11",
      }),
      "RAF Autonomous College (2023-07-11)"
    );
    assert.equal(
      institutionFrameworkLabel({ eligible_cycle_framework_id: 3 }),
      "Mapped from category (not yet confirmed)"
    );
    assert.equal(
      institutionFrameworkLabel({ institution_type: "Autonomous College" }),
      "No verified framework"
    );
  });
});
