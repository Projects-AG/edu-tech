import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildOfficialSubmissionDataJson,
  officialFormView,
  officialMetricKind,
  officialMetricsEligibleForForm,
  officialSubmissionBlocked,
  parseOfficialDataJson,
  usesOfficialMetricForm,
} from "./officialMetricForm.js";

const qlmMetric = {
  metric_id: 53,
  metric_code: "1.1.1",
  metric_title: "Curricular Planning",
  catalog_kind: "OFFICIAL",
  metric_kind: "QlM",
  metric_type: "Qualitative",
  weightage: 20,
};

const qnmMetric = {
  metric_id: 54,
  metric_code: "1.2.1",
  metric_title: "Percentage of new courses",
  catalog_kind: "OFFICIAL",
  metric_kind: "QnM",
  metric_type: "Quantitative",
  weightage: 30,
};

describe("official QlM/QnM metric forms", () => {
  it("renders QlM and QnM from verified catalogue kind without invented SOP fields", () => {
    const qlm = officialFormView(qlmMetric);
    const qnm = officialFormView(qnmMetric);
    assert.equal(qlm.configured, true);
    assert.equal(qlm.metric_kind, "QlM");
    assert.deepEqual(qlm.fields, ["qualitative_response", "notes"]);
    assert.equal(qlm.word_limit, null);
    assert.equal(qlm.option_list, null);
    assert.equal(qnm.configured, true);
    assert.equal(qnm.metric_kind, "QnM");
    assert.deepEqual(qnm.fields, ["quantitative_response", "notes"]);
    assert.equal(qnm.formula, null);
  });

  it("keeps official metric identity on operational id, not matching working codes", () => {
    const payload = JSON.parse(
      buildOfficialSubmissionDataJson({
        metric: qlmMetric,
        qualitativeResponse: "Curriculum planning narrative",
        notes: "",
      })
    );
    assert.equal(payload.form_kind, "OFFICIAL");
    assert.equal(payload.metric_id, 53);
    assert.equal(payload.metric_code, "1.1.1");
    assert.notEqual(payload.metric_id, 1);
    assert.equal(payload.word_limit, null);
    assert.equal(payload.option_list, null);
    assert.equal(payload.qualitative_response, "Curriculum planning narrative");
    assert.equal(payload.quantitative_response, null);
  });

  it("does not invent QnM formulas, option lists, or required word counts", () => {
    const payload = JSON.parse(
      buildOfficialSubmissionDataJson({
        metric: qnmMetric,
        quantitativeResponse: "42.5",
        notes: "Institution-reported figure",
      })
    );
    assert.equal(payload.metric_kind, "QnM");
    assert.equal(payload.quantitative_response, "42.5");
    assert.equal(payload.formula, null);
    assert.equal(payload.word_limit, null);
    assert.ok(payload.source_gaps.includes("formula_template"));
    assert.ok(payload.source_gaps.includes("dvv_option_list"));
    assert.ok(payload.source_gaps.includes("word_limit"));
  });

  it("leaves unconfigured official cycles and missing kinds out of the form list", () => {
    assert.deepEqual(
      officialMetricsEligibleForForm({
        catalog_kind: "OFFICIAL",
        configured: false,
        has_official_operational_metrics: true,
        applicable_metrics: [qlmMetric],
      }),
      []
    );
    assert.equal(officialFormView({ catalog_kind: "OFFICIAL" }).configured, false);
    assert.equal(officialMetricKind({ metric_type: "Qualitative" }), null);
    assert.equal(officialMetricKind({ metric_type: "Quantitative" }), null);
    assert.equal(
      officialSubmissionBlocked({
        catalog_kind: "OFFICIAL",
        configured: false,
        uses_catalog_fallback: false,
        has_official_operational_metrics: true,
      }),
      true
    );
    assert.equal(
      officialSubmissionBlocked({
        catalog_kind: "WORKING",
        configured: false,
        uses_catalog_fallback: true,
      }),
      false
    );
    assert.equal(usesOfficialMetricForm(qlmMetric, { catalog_kind: "OFFICIAL" }), true);
    const parsed = parseOfficialDataJson(
      buildOfficialSubmissionDataJson({
        metric: qlmMetric,
        qualitativeResponse: "text",
      })
    );
    assert.equal(parsed.metric_id, 53);
    assert.equal(parseOfficialDataJson('{"notes":"legacy"}'), null);
  });
});
