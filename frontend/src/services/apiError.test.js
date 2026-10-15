import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatApiError } from "./apiError.js";

const withDetail = (detail) => ({ response: { data: { detail } } });

describe("formatApiError", () => {
  it("returns a plain string detail unchanged", () => {
    assert.equal(
      formatApiError(withDetail("No Active cycle."), "fallback"),
      "No Active cycle."
    );
  });

  it("turns a FastAPI 422 list into readable lines", () => {
    const message = formatApiError(
      withDetail([
        {
          type: "missing",
          loc: ["body", "metric_code"],
          msg: "Field required",
          input: {},
        },
        {
          type: "value_error",
          loc: ["body", "data_json", "items", 0],
          msg: "Value error, invalid entry",
        },
      ]),
      "fallback"
    );
    assert.equal(typeof message, "string");
    assert.equal(
      message,
      "metric_code: Field required\ndata_json.items.0: Value error, invalid entry"
    );
  });

  it("handles list entries without a location or with odd shapes", () => {
    assert.equal(
      formatApiError(withDetail([{ msg: "Bad payload" }, null, 7, "plain"]), "x"),
      "Bad payload\nplain"
    );
  });

  it("reduces object details to their message", () => {
    assert.equal(
      formatApiError(withDetail({ eligible: false, reason: "Not ready" }), "x"),
      "Not ready"
    );
    assert.equal(
      formatApiError(withDetail({ eligible: false }), "Fallback text"),
      "Fallback text"
    );
  });

  it("uses the error message when there is no response", () => {
    assert.equal(formatApiError(new Error("Network Error"), "x"), "Network Error");
  });

  it("falls back for empty input", () => {
    assert.equal(formatApiError(undefined, "Fallback text"), "Fallback text");
    assert.equal(formatApiError(withDetail([]), "Fallback text"), "Fallback text");
    assert.equal(formatApiError(withDetail("   "), "Fallback text"), "Fallback text");
  });
});
