# NAAC Framework Selection Research

This document records how EduVerse selects an official NAAC pathway from verified institution details. It is a research and implementation note, not a substitute for NAAC manuals.

## 1. Methodology

1. Inspected the live EduVerse registration, institution, cycle, criterion/metric, report, and RBAC code. Criteria and metrics are database-driven (seeded catalogue), not hardcoded in the UI.
2. Consulted official and official-copy sources listed below. Where a page timed out or returned an error, that failure is recorded.
3. Distinguished **operative RAF manuals** from **reform announcements**.
4. Seeded only verified criteria names and pathway metadata. **No official metric IDs were invented.**
5. Uncertain rules are marked `REQUIRES_OFFICIAL_VERIFICATION` and are not silently treated as mandatory production frameworks.

## 2. Official sources

| Source | Authority | Date | URL | What it supports |
|---|---|---|---|---|
| NAAC home / RAF transition note | NAAC | Current site; RAF launched July 2017 | http://naac.gov.in/index.php/en/ | Official host. https://www.naac.gov.in/ timed out (504) during this work. |
| Open University Manual page | NAAC | RAF from July 2017 | http://naac.gov.in/index.php/en/terms-conditions/2-uncategorised/250-open-university-manual-in-multi-languages | Seven conventional criteria adopted for ODL; key indicators and weightages modified. |
| PIB: Major Reforms in Accreditation of HEIs | Ministry of Education | 27 January 2024 | https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2000086&lang=2&reg=48 | Binary Accreditation and Maturity-Based Graded Levels **proposed**; staged implementation announced, not proof of a launched metric catalogue. |
| NAAC Public Notice | NAAC Director | 5 December 2025 | Circulated copies, e.g. http://hbni.ac.in/pdf/circulars/NAAC_Public_Notice.pdf | Binary then MBGL **proposed to launch**; RAF validity extension; Basic Accreditation “to be launched soon”. |
| Manual for Universities (RAF) | NAAC | 29 March 2023 | https://www.naac.gov.in/images/docs/Manuals/manuals_new/University-Manual-23-8-2022.pdf (504 on 9 Oct 2026); http://naac.gov.in/ manuals index timed out | **Not imported.** Seven criteria only. Line-level metric IDs were not retrieved from NAAC.gov.in. |
| Autonomous Colleges Manual in Multi Languages | NAAC | 11 July 2023 | http://naac.gov.in/index.php/en/2-uncategorised/239-empanelment-of-hindi-consultant-2023 | Official HTML QIF. Table 1: 85 metrics (35 QlM + 50 QnM). QIF lists 85 unique IDs, weightage sum 1000. Prose on the same page says 84. **Imported into `framework_metrics` with `required_default=false`.** Production stays off. |
| Affiliated / Constituent College Manual | NAAC (HEI-hosted copy only) | 20 July 2023 | https://sreechaitanyamahavidyalaya.ac.in/images/IQAC_NAAC/Affiliated_College_Manual_20-07-2023.pdf | Copy, not NAAC.gov.in. Table 1 cites 56 metrics (22 QlM + 34 QnM). PDF extract parsed 42 IDs unreliably. **Not imported.** |
| University Manual (older copy) | NAAC copyright; third-party host | 6 April 2021 | https://epsiindia.org/wp-content/uploads/2021/11/University-Manual-6-4-2021.pdf | Outdated edition (107 university metrics in that copy). **Not imported.** |
| Basic Accreditation portal | NAAC | Attempted 9 October 2026 | https://www.assessmentonline-basic.naac.gov.in/ | HTTP 500 during this work. Not used as proof that Binary is operative. |
| Ministry of Education schemes / guidelines | MoE | Attempted | https://www.education.gov.in/hi/schemes-guidelines | Not used as a metric catalogue. |

Third-party HEI PDFs were treated as copies of NAAC manuals, not as independent rule-making. Conflicting metric **counts** across 2023 vs later copies are flagged below.

## 3. Established seven-criteria framework

Verified names used by RAF manuals:

1. Curricular Aspects
2. Teaching-Learning and Evaluation
3. Research, Innovations and Extension
4. Infrastructure and Learning Resources
5. Student Support and Progression
6. Governance, Leadership and Management
7. Institutional Values and Best Practices

These seven criteria are the established RAF structure. They are **not** assumed for Binary Accreditation or MBGL.

## 4. Institution-type → framework mapping

| Official category | Framework code | Version | Production? | Verification |
|---|---|---|---|---|
| University | `RAF_UNIVERSITY` | 2023-03-29 | **No** (criteria verified; metric catalogue incomplete) | Criterion structure VERIFIED |
| Autonomous college | `RAF_AUTONOMOUS_COLLEGE` | 2023-07-11 | **No** (85 QIF IDs imported; required/optional not stated; not mapped to working catalogue) | Criterion + metric IDs VERIFIED; applicability `REQUIRES_OFFICIAL_VERIFICATION` |
| Affiliated college (affiliating university named) | `RAF_AFFILIATED_CONSTITUENT_COLLEGE` | 2023-07-20 | **No** (criteria verified; metric catalogue not imported from NAAC.gov.in) | Criterion structure VERIFIED |
| Affiliated college without affiliating university | — | — | No | `PENDING_FRAMEWORK_VERIFICATION` |
| Affiliated + granted autonomy | `RAF_AUTONOMOUS_COLLEGE` | 2023-07-11 | **No** (same autonomous QIF; production still off) | Criterion + metric IDs VERIFIED; applicability unverified |
| Constituent college with parent named | `RAF_AFFILIATED_CONSTITUENT_COLLEGE` | 2023-07-20 | **No** (criteria verified; metric catalogue incomplete) | Criterion structure VERIFIED |
| Constituent college without parent | — | — | No | `PENDING_FRAMEWORK_VERIFICATION` |
| Open university | `RAF_OPEN_UNIVERSITY` | RAF-ODL | **No** (seven criteria verified; metric IDs missing) | Criterion structure VERIFIED |
| Other / blank | — | — | No | `PENDING_FRAMEWORK_VERIFICATION` |
| Binary Accreditation | `BINARY_ACCREDITATION` | announced | **No** | `ANNOUNCED_NOT_OPERATIVE` |
| MBGL | `MBGL` | announced | **No** | `ANNOUNCED_NOT_OPERATIVE` |

UG vs PG affiliated metric lists (93 UG / 96 PG in the 29 March 2023 university manual grouping table) are recorded on the institution profile. Separate metric catalogues are **not** seeded.

Exact current metric totals (115 vs later 137/136/121 copies) remain `REQUIRES_OFFICIAL_VERIFICATION`.

## 5. Reform uncertainty

The 27 January 2024 PIB note and NAAC Executive Committee decision described Binary Accreditation and MBGL as reforms to be implemented in stages. NAAC’s 5 December 2025 notice still describes Binary then MBGL as **proposed**, with Basic Accreditation “to be launched soon”, and extends RAF validity until MBGL launch plus up to three months.

**EduVerse does not treat Binary or MBGL as the current mandatory production pathway.** They are catalogued so the product can record the announcement, not so coordinators can open a production cycle against an unpublished metric set.

## 6. Proposed / implemented workflow

1. Pre-login **Request New Institution** captures official NAAC category and supporting questions. Applicants do not pick or delete the seven criteria.
2. The public recommendation API returns a verified framework or `Pending framework verification`.
3. Platform Admin may confirm the **recommended RAF family** (criterion structure). That is not the same as declaring the metric catalogue production-ready.
4. Draft cycles may bind the confirmed framework version. Autonomous QIF IDs are stored in `framework_metrics` with `required_default=false` and no working-catalogue mapping, so **no working metrics are auto-marked required**. Existing cycles 10 and 11 are not rewritten and keep `framework_id` null. Updates cannot backfill `framework_id`.
5. A cycle cannot be set Active / In Progress / Completed on an incomplete official framework. The internal working catalogue remains available only for legacy institutions that have no official category; it cannot be confirmed as an official pathway.
6. Coordinators cannot save unofficial working metrics as the official SSR set until official rows exist **and** are mapped to working metrics. Autonomous QIF IDs are imported but unmapped, so working-catalogue save is still blocked. Incomplete University/Affiliated catalogues do not inherit the working catalog as required metrics.
7. Reports show institution-wide totals separately from cycle-specific applicable-metric progress, including framework name/version and catalogue-completeness.

## 7. Data model

- `naac_frameworks` — versioned pathway metadata, source URL, verification status, production flag.
- `framework_criteria` — official criteria for that version (seven names for RAF variants; none for Binary/MBGL).
- `framework_metrics` — official metric rows only. Autonomous 11 July 2023 QIF: **85 rows** (unique `official_code` per framework). University, Affiliated, Open University, Binary, MBGL: **zero rows**. `required_default` is false. `maps_to_metric_id` is null. Weightage stored where the QIF states it. Seven `framework_criteria` rows are not a metric catalogue.

### Schema vs official QIF (discrepancies recorded before import)

| Official QIF field | EduVerse `framework_metrics` | Action |
|---|---|---|
| Metric number (e.g. 1.1.1) | `official_code` | Imported for autonomous |
| Metric title | `title` (widened to text) | Imported for autonomous |
| QlM / QnM | `metric_kind` | Imported for autonomous |
| Weightage | `weightage` (added) | Imported for autonomous |
| Required / optional / NA | not stated in source | `required_default=false`; not inferred |
| Key indicator name | criterion FK only | Criterion number mapped (C1–C7); KI title not stored |
| File description / formula | not in schema | Not imported |
| Working `metrics.code` | `maps_to_metric_id` | **Not mapped.** EduVerse has 51 working metrics including non-RAF `10.x` codes; titles differ by HEI type, so code-only mapping would be unsafe. |
- Institution and institution-request profile fields (category, affiliation, autonomy, parent, programme level, NAAC status).
- `accreditation_cycles.framework_id` — version lock at creation.
- `cycle_applicable_metrics` exception columns.

Existing Criterion / Metric / Section / Submission tables remain the operational catalogue for **historical** cycles. They are not imported into `framework_metrics` and are not treated as official required SSR metrics.

## 8. Security

- Public: `GET /public/institution-categories`, `POST /public/framework-recommendation`, existing `POST /institution-requests`.
- Authenticated catalogue list: `GET /naac-frameworks` requires `ACCREDITATION_CYCLES:View` or `INSTITUTION_MANAGEMENT:View`.
- Institution-request approve/reject remains platform Admin + `INSTITUTION_MANAGEMENT`.
- Cycle create still requires `ACCREDITATION_CYCLES:Create` and institution isolation.
- No RBAC seed changes. Approval workflow roles are unchanged.

## 9. Progress calculations

- Institution funnel = all submissions for the institution.
- Cycle funnel = submissions with that cycle_id.
- Cycle metric completion denominator = configured applicable metrics for that cycle, not the institution-wide submission count.
- Historical `cycle_id IS NULL` rows are not counted as current-cycle metric completion.
- Prior cycles keep their stored mappings and (if present) stored final report even after a newer catalogue version is seeded.

## 10. Limitations / still requiring official verification

- University RAF line-level metric IDs: NAAC.gov.in PDF 504 / manuals index timeout on 9 Oct 2026.
- Affiliated/constituent line-level IDs from a NAAC.gov.in file (HEI copy cites 56; extract was incomplete; earlier grouping tables cited 93 UG / 96 PG).
- Whether autonomous Table 1 (85) or the same page's prose (84) is the intended count. QIF listing and Table 1 both yield **85**, which is what was imported.
- Required vs optional vs not-applicable rules for any RAF metric. None of the retrieved sources say “all metrics are mandatory.”
- Mapping from official QIF codes to the existing 51-row EduVerse working catalogue.
- Whether 115 / 107 / 93 / 96 (2023) or later 137 / 136 / 121 counts are current for University.
- UG vs PG affiliated metric differences at line level.
- When a constituent college is assessed only through its parent university.
- Operative Binary Accreditation and MBGL manuals, portals, and mandatory switchover date.
- Open University manual publication date and ODL metric list.
- Direct NAAC.gov.in PDF retrieval (site timeouts during this work).

Until those items are verified from an official NAAC file, EduVerse will recommend the verified seven-criteria RAF **family**, will not invent metric IDs, will not mark working metrics required by default, and will not activate Binary/MBGL or incomplete RAF metric catalogues as production frameworks.

**Production safety:** Autonomous Colleges now have a verified 85-row QIF identity catalogue. That is **not** a production accreditation configuration: required/optional rules are unverified, working metrics are not mapped, and `allows_production_cycles` remains false. University and Affiliated pathways still have empty `framework_metrics`. Historical SKNCOE cycles 10 and 11 continue on the existing operational catalogue without framework backfill.

Tests use `httpx.AsyncClient` with `ASGITransport` against the project `httpx==0.28.1` pin. Starlette `TestClient` / `httpx2` is not used.

## 11. Autonomous QIF validation (9 Oct 2026)

Inspection compared live `framework_metrics` to (a) `raf_autonomous_college_qif_2023_07.json` and (b) the retrieved NAAC.gov.in HTML QIF. No code or database change was made from this validation: the 85-row import matches the listing and Table 1.

### Counts and weightages

| Check | Source / expected | Live DB |
|---|---|---|
| Unique official codes | 85 (QIF listing + Table 1) | 85 |
| QlM / QnM | 35 / 50 (Table 1) | 35 / 50 |
| Total weightage | 1000 (Table 2 criterion totals) | 1000 |
| C1–C7 weightage | 150 / 300 / 150 / 100 / 100 / 100 / 100 | exact match |
| `required_default` | not stated in source | all false |
| `maps_to_metric_id` | do not auto-map | all null |
| University / Affiliated rows | must remain unimported | 0 / 0 |
| Cycles 10 and 11 | `framework_id` null | null |
| Submissions | 44 | 44 |

Row identity (code, title, kind, criterion C1–C7, weightage) matched the JSON and the HTML extract with **zero field diffs**.

### 84 vs 85

The same official page says “The SSR has **84** Metrics for Autonomous Colleges” (assessment-process prose) and Table 1 “Total Metrics (QlM + QnM) = **85**”. The QIF listing contains **7.1.10** (QnM, Code of Conduct, weight 5). A parser that only accepted a single digit in the third segment (`7.1.1`–`7.1.9`) would report 84 and miss `7.1.10`. Criterion 7.1 then sums to 46 instead of the Table 2 KI total of 50. Including `7.1.10` restores 7.1 = 50 and the 85 / 1000 totals. **The imported 85-row set follows Table 1 and the QIF listing, not the prose count.** The prose 84 remains an unresolved source inconsistency, not a reason to drop `7.1.10`.

Source token `Q1M` on 5.3.2 was stored as `QlM`: the metric asks for a 500-word description, and Table 1’s 35 QlM count includes it.

### Working-catalogue mapping (not applied)

EduVerse working catalogue: **51** metrics. Official autonomous QIF: **85**.

| Category | Count | Rule |
|---|---|---|
| Exact code **and** title match | **0** | Would be the only auto-map candidate; none exist |
| Same code, titles too different to treat as the same metric | **36** | e.g. official 1.1.1 curriculum-relevance QlM vs working “Curriculum Planning and Implementation”; similarity typically 0.04–0.53 |
| Possible match needing human review | **0** | Highest same-code similarity was 4.1.1 at 0.59 (“adequate infrastructure…” vs “Physical Infrastructure Facilities”) — still not accepted |
| Official QIF code absent from working catalogue | **49** | including 1.3.3, 1.4.1, most of C2 teacher/exam metrics, 7.1.3–7.1.10 |
| Working codes not in this QIF | **15** | `1.1.3`, `1.2.2`, `3.3.2`, `6.1.2`, `7.2.2`, `8.1.1`–`8.2.2`, `9.1.1`–`9.2.2`, `10.1.1`, `10.1.2` |

No `maps_to_metric_id` values were written. Code-only mapping would attach the wrong SSR text.

### Production / regression

- `metric_catalogue_complete` is true for Autonomous **identity** (85/85 IDs). `allows_production_cycles` is **false**. `catalogue_status` remains `CATALOGUE_INCOMPLETE` because production is not enabled. Activating Active / In Progress / Completed is rejected.
- Working-catalogue applicability save remains blocked until official rows are mapped.
- `python -m unittest tests.test_framework_metrics_catalogue tests.test_framework_recommendation tests.test_framework_seed_and_cycles` — 38 tests OK.

### Unresolved after this validation

- Official confirmation whether prose 84 or Table 1 / listing 85 is the intended SSR size.
- Required / optional / NA rules (source does not state them).
- Human mapping of 85 QIF rows to the 51 working metrics, if those working rows should remain the operational submission catalogue. **Review report (no maps written):** [`docs/NAAC_AUTONOMOUS_QIF_MAPPING_REVIEW.md`](NAAC_AUTONOMOUS_QIF_MAPPING_REVIEW.md).
- University and Affiliated line-level IDs from NAAC.gov.in.

## 12. Human-reviewed Autonomous mapping plan (9 Oct 2026)

Inspection-only. No `maps_to_metric_id`, applicability, `required_default`, or production-readiness flags were changed. University and Affiliated catalogues remain empty.

**Report:** [`docs/NAAC_AUTONOMOUS_QIF_MAPPING_REVIEW.md`](NAAC_AUTONOMOUS_QIF_MAPPING_REVIEW.md)

Classification uses definitions and data requirements, not codes or string similarity. §11’s 0 possible-match snapshot remains valid as a **code-alignment** check; this section is the **mapping plan**.

| Class | Count |
|---|---|
| Exact semantic match | **0** |
| Possible match requiring human review | **46** |
| Conflicting definition | **12** |
| No match | **27** |
| Official metrics reviewed | **85** |
| Working metrics with no official code in this QIF | **15** |

Read-only validation after the report: maps 0, required-true 0, University/Affiliated rows 0/0, cycles 10 and 11 `framework_id` null, 44 submissions, `allows_production_cycles` false.

### Unresolved questions for product owner / NAAC

- Whether the 51 working rows stay the operational submission catalogue or official QIF rows become first-class metrics.
- Approval or rejection of each of the 46 possible pairs (none are pre-approved). The 12 conflicting same-code pairs must not be mapped.
- One-to-many collisions (several official rows share one working candidate).
- Fate of working Criteria 8, 9, and 10 (not in the 7-criteria RAF).
- Required / optional / NA rules; DVV SOP option lists for truncated A–E titles.
- Prose 84 vs Table 1 / listing 85 (`7.1.10`).
- SSS (2.7.1) and Scopus/WoS bibliometrics (3.4.5, 3.4.6) workflows.
- University and Affiliated official metric files from NAAC.gov.in.
- Historical cycles 10 and 11 remain unmapped and must not be backfilled.
