import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isOfficialCycleCatalog,
  pickActiveCycle,
} from "./cycleCatalog.js";

describe("accreditation cycle catalogue routing", () => {
  it("picks the newest live cycle and does not treat official catalogues as working", () => {
    const cycles = [
      { id: 10, status: "Active", catalog_kind: "WORKING" },
      { id: 11, status: "Completed", catalog_kind: "WORKING" },
      { id: 20, status: "Draft", catalog_kind: "OFFICIAL" },
    ];
    const active = pickActiveCycle(cycles);
    assert.equal(active.id, 10);
    assert.equal(isOfficialCycleCatalog(active), false);
    assert.equal(
      isOfficialCycleCatalog({ catalog_kind: "OFFICIAL" }),
      true
    );
    assert.equal(
      isOfficialCycleCatalog({ catalog_kind: "OFFICIAL_INCOMPLETE" }),
      true
    );
  });
});
