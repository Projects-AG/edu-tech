# Human-reviewed mapping plan: Autonomous College QIF (85) vs EduVerse working catalogue (51)

**Status:** review only. No `maps_to_metric_id` values were written. Applicability, `required_default`, and `allows_production_cycles` were not changed.

**Date:** 9 October 2026
**Official source:** NAAC Manual for Autonomous Colleges, HTML QIF dated 11 July 2023 (`RAF_AUTONOMOUS_COLLEGE` version `2023-07-11`, 85 unique `official_code` values, 35 QlM + 50 QnM, weightage 1000).
**Working source:** live EduVerse `metrics` table (51 rows, all `Quantitative`, all weightage 10, one generic evidence requirement each).
**Scope:** Autonomous College RAF only. University and Affiliated/Constituent catalogues remain unimported until official NAAC.gov.in metric files are verified.

## Classification rules

Comparisons use metric **definitions and data requirements**, not codes alone. Same-code pairs are treated as a warning, not as a match.

| Class | Meaning |
|---|---|
| **Exact semantic match** | Same measured object, QlM/QnM type, and data requirement (formula, SOP, or word-limit prompt). Safe to map later without changing the working row’s meaning. |
| **Possible match requiring human review** | Related topic family (same NAAC key-indicator theme). Type, weightage, SOP, and fields still differ. A human must decide whether to reuse, split, or replace the working row. |
| **Conflicting definition** | A tempting same-code (or nearby) working row exists but measures a **different** object or key indicator. Mapping that pair would attach the wrong SSR prompt to existing submissions. |
| **No match** | No working row covers the official topic even as a coarse bucket. A new working metric (and usually new fields/workflow) is required if this QIF is used operationally. |

**Structural bar for exact match:** every working row is a generic stub (`"Metric for evaluating …"`, Quantitative, weight 10, free-form `data_json` + one evidence slot). Official QIF rows are specific QlM narratives or QnM formulas, often with 5-year templates or A–E option lists. **No pair clears the exact-match bar.**

This review is **not** the string-similarity snapshot in `docs/NAAC_FRAMEWORK_SELECTION_RESEARCH.md` §11 (0 possible matches at similarity ≥ 0.60). That snapshot was a code-alignment check. This document is a definition-level mapping **plan**.

## Summary counts

| Classification | Count | Share of 85 |
|---|---|---|
| Exact semantic match | **0** | 0% |
| Possible match requiring human review | **46** | 54% |
| Conflicting definition | **12** | 14% |
| No match | **27** | 32% |
| **Official metrics reviewed** | **85** | 100% |

| Other inventory | Count |
|---|---|
| Working catalogue metrics | 51 |
| Same official/working **code** (titles still differ) | 36 |
| Working codes absent from this QIF | 15 |
| Official metrics that would need new structured fields or workflows (all 85 if this QIF becomes operational; see §4) | 85 |
| Official metrics with **no** working counterpart even as a bucket | 27 |
| Working metrics with **no** official code in this QIF | 15 |
| `framework_metrics.maps_to_metric_id` written | 0 |
| `required_default = true` | 0 |
| University / Affiliated `framework_metrics` | 0 / 0 |

**One-to-many collisions (must not auto-map):** several official rows share one working candidate. Examples: `3.4.3` + `3.4.4` → working `3.1.1`; `3.4.5` + `3.4.6` → working `3.1.2`; `4.4.1` + `4.4.2` → working `4.1.2`; many `7.1.x` → working `7.1.1` / `7.1.2` / `9.2.x`. Product owner must split or replace, not collapse.

---

## 1. Criterion 1 — Curricular Aspects (7 official / weight 150)

| Official | Title (short) | Type | Wt | Candidate working | Class | Why |
|---|---|---|---|---|---|---|
| **1.1.1** | Curricula relevant to local/regional/national/global needs, reflected in POs and COs | QlM | 20 | `1.1.1` Curriculum Planning and Implementation (id 1) | Possible | Same KI 1.1 (curriculum). Official asks a PO/CO relevance narrative. Working is a generic planning stub, Quantitative 10. |
| **1.1.2** | Programmes focus on employability / entrepreneurship / skill development; syllabi revised | QlM | 30 | `1.1.2` Curriculum Development and Revision (id 2) | Possible | Related “revision” theme. Official is employability/skill QlM with syllabus-revision evidence. Working has no employability SOP. |
| **1.2.1** | Percentage of new courses introduced (last five years) | QnM | 30 | `1.2.1` Academic Flexibility and Choice (id 4) | Possible | Official 1.2 is a **new-course percentage formula**. Working is generic “flexibility/choice” (closer to older CBCS wording). Different data. |
| **1.3.1** | Cross-cutting issues: ethics, gender, human values, environment, SDGs, NEP-2020 in curriculum | QlM | 15 | `1.3.1` Curriculum Enrichment Activities (id 6) | Possible | Enrichment KI overlap. Official is a specific NEP/SDG integration write-up. Working is a generic activity count stub. |
| **1.3.2** | Certificate / value-added / diploma / MOOCs-SWAYAM-NPTEL completions (last five years) | QnM | 25 | `1.3.2` Value Added Learning (id 7) | Possible | Topic family matches. Official is a 5-year enrolment-and-completion count across named platforms. Working has no platform or completion fields. |
| **1.3.3** | Percentage of programmes with field projects / research projects / internships | QnM | 10 | — | No match | No working metric names internships, field projects, or programme-level project components. |
| **1.4.1** | Structured curriculum feedback from students, teachers, employers, alumni, peers (classified process) | QnM | 20 | — | No match | Working `2.3.2` is assessment/CIE feedback under Evaluation, not curriculum-stakeholder feedback. Mapping it here would conflict with Criterion 2 exam metrics. |

---

## 2. Criterion 2 — Teaching-Learning and Evaluation (17 official / weight 300)

| Official | Title (short) | Type | Wt | Candidate working | Class | Why |
|---|---|---|---|---|---|---|
| **2.1.1** | Enrolment percentage | QnM | 10 | `2.1.1` Student Admission and Enrolment (id 8) | Possible | Same enrolment theme. Official is sanctioned-intake vs admitted (standard NAAC formula). Working has no intake/admitted year-wise template. |
| **2.1.2** | Percentage of seats filled against reserved categories (SC, ST, OBC, etc.) | QnM | 10 | `2.1.2` Student Profile Analysis (id 9) | Possible | Reservation fill is a slice of “profile,” not the same metric. Official needs category-wise earmarked vs admitted. |
| **2.2.1** | Assesses learning levels; special programmes for differential needs | QlM | 15 | `2.2.1` Teaching-Learning Practices (id 10) | Possible | Broad T-L overlap. Official is slow/advanced learner identification + programmes. Working is a generic T-L stub. |
| **2.2.2** | Student–full-time teacher ratio (latest year) | QnM | 15 | `2.2.2` Student Centric Learning (id 11) | **Conflicting** | Official is a headcount ratio. Working title is student-centric methods, which is official **2.3.1**, not 2.2.2. Same code, different KI. |
| **2.3.1** | Student-centric methods (experiential, participative, problem-solving) and ICT-enabled teaching | QlM | 30 | `2.3.1` Continuous Internal Evaluation (id 12) | **Conflicting** | Official 2.3.1 is pedagogy/ICT. Working 2.3.1 is CIE, which belongs with official **2.5.3**. |
| **2.3.2** | Mentor–mentee scheme for academics and student-psychological issues | QlM | 10 | `2.3.2` Assessment and Feedback (id 13) | **Conflicting** | Official is mentoring. Working is assessment/feedback. Different objects. |
| **2.3.3** | Academic calendar and teaching plans prepared and adhered to | QlM | 10 | `1.1.3` Academic Planning and Delivery (id 3) | Possible | Different code. Working 1.1.3 is the only planning/calendar-like stub. Official also requires adherence evidence. |
| **2.4.1** | Full-time teachers appointed against sanctioned posts (last five years) | QnM | 15 | — | No match | No faculty roster / sanctioned-post metric. |
| **2.4.2** | Percentage of full-time teachers with Ph.D. / D.Sc. / D.Litt. / L.L.D | QnM | 25 | — | No match | No qualification roster. |
| **2.4.3** | Average teaching experience of full-time teachers (latest year) | QnM | 5 | — | No match | No experience field. |
| **2.4.4** | Percentage of full-time teachers working throughout the last five years | QnM | 5 | — | No match | No retention/stability roster. |
| **2.5.1** | Average days from last exam to result declaration (last five years) | QnM | 20 | — | No match | No exam-calendar / result-lag fields. |
| **2.5.2** | Percentage of student complaints/grievances about evaluation | QnM | 15 | — | No match | Exam-evaluation grievances are not working `2.3.2` (generic assessment feedback). |
| **2.5.3** | IT integration and reforms in examination / CIA / EMS | QlM | 15 | `2.3.1` Continuous Internal Evaluation (id 12) | Possible | Different code. Working CIE stub is the closest exam-process bucket; official is EMS/CIA reform narrative plus IT integration. |
| **2.6.1** | Stated POs/COs/graduate attributes, publicized, integrated in assessment, attainment evaluated | QlM | 30 | — | No match | Outcome-attainment is not working 1.1.1 (planning) and is a distinct official metric from 1.1.1 (curriculum relevance). |
| **2.6.2** | Pass percentage of students excluding backlog (latest year) | QnM | 20 | — | No match | No results/pass-percentage template. |
| **2.7.1** | Online student satisfaction survey (teaching-learning) | QnM | 50 | — | No match | NAAC SSS is an external survey workflow (portal / student list upload). Nothing in the working catalogue implements it. |

---

## 3. Criterion 3 — Research, Innovations and Extension (17 official / weight 150)

| Official | Title (short) | Type | Wt | Candidate working | Class | Why |
|---|---|---|---|---|---|---|
| **3.1.1** | Research facilities updated; research-promotion policy on website and implemented | QlM | 6 | `3.1.1` Research Publications (id 14) | **Conflicting** | Official is facilities + policy. Working is publications (official **3.4.3**). Same code, different object. |
| **3.1.2** | Seed money to teachers for research | QnM | 8 | — | No match | No seed-money / internal grant ledger. |
| **3.1.3** | Teachers receiving national/international fellowship or financial support for advanced studies/research | QnM | 6 | — | No match | No fellowship register. |
| **3.2.1** | Research funding from government, industry, corporates, international bodies, endowment chairs | QnM | 5 | `3.2.1` Innovation Activities (id 16) | **Conflicting** | Official is external research rupees. Working is innovation activities (closer to official **3.3.1**). |
| **3.2.2** | Research projects per teacher from government / non-government / industry | QnM | 2 | `3.2.2` Research Collaboration (id 17) | **Conflicting** | Official is project **count per teacher**. Working is collaboration (closer to official **3.7.1** MoUs). |
| **3.2.3** | Percentage of teachers recognised as research guides (latest year) | QnM | 3 | — | No match | No guide-recognition field. |
| **3.3.1** | Ecosystem for innovations, IKS, IPR awareness, IPR cell, incubation, knowledge transfer | QlM | 10 | `3.2.1` Innovation Activities (id 16) | Possible | Different code. Innovation/incubation/IPR family matches; working has no IKS/IPR-cell SOP. |
| **3.4.1** | Implementation of stated Code of Ethics for research | QnM | 5 | — | No match | Research-ethics / plagiarism-committee options are absent. |
| **3.4.2** | Ph.D. candidates registered per teacher (last five years) | QnM | 5 | — | No match | No research-scholar register. |
| **3.4.3** | Research papers per teacher in UGC CARE journals | QnM | 5 | `3.1.1` Research Publications (id 14) | Possible | Different code. Closest publications stub. Official needs CARE-list year-wise papers per teacher — not a generic “publications” score. |
| **3.4.4** | Books and chapters in edited volumes per teacher | QnM | 5 | `3.1.1` Research Publications (id 14) | Possible | Same candidate as 3.4.3. Human must **split** books vs papers; one working row cannot serve both. |
| **3.4.5** | Bibliometrics — average citation index (Scopus / Web of Science, last five years) | QnM | 5 | `3.1.2` Research Quality and Impact (id 15) | Possible | Impact family. Official requires Scopus/WoS citation extract, not a free-text “quality” score. |
| **3.4.6** | Bibliometrics — institutional h-index (Scopus / Web of Science) | QnM | 5 | `3.1.2` Research Quality and Impact (id 15) | Possible | Same candidate as 3.4.5. Citation index ≠ h-index; must split or add fields. |
| **3.5.1** | Revenue from consultancy and corporate training (last five years) | QnM | 10 | — | No match | No consultancy-revenue ledger. |
| **3.6.1** | Outcomes of extension in the neighbourhood; impact, sensitization, awards | QlM | 30 | `3.3.1` Extension Activities (id 18) | Possible | Extension KI. Official is **outcomes/impact** narrative (and awards). Working is a generic activity stub. Secondary C8 outreach rows are not RAF metrics. |
| **3.6.2** | Extension and outreach programmes through NSS/NCC and community forums | QnM | 20 | `3.3.2` Community Outreach (id 19) | Possible | Different code (working 3.3.2 is not in this QIF). Official is a year-wise NSS/NCC programme count. |
| **3.7.1** | Functional MoUs/linkages for internship, OJT, project, exchange, collaborative research | QnM | 20 | `3.2.2` Research Collaboration (id 17) | Possible | MoU/collaboration family. Official counts **functional** MoUs across internship and research, not “collaboration quality.” |

---

## 4. Criterion 4 — Infrastructure and Learning Resources (9 official / weight 100)

| Official | Title (short) | Type | Wt | Candidate working | Class | Why |
|---|---|---|---|---|---|---|
| **4.1.1** | Adequate infrastructure and other facilities | QlM | 20 | `4.1.1` Physical Infrastructure Facilities (id 20) | Possible | Closest topic pair in the whole catalogue. Official is a QlM facilities description (often with a checklist). Working is Quantitative 10 with no facility inventory. |
| **4.1.2** | Percentage of expenditure excluding salary for infrastructure development and augmentation | QnM | 10 | `4.1.2` Infrastructure Maintenance (id 21) | **Conflicting** | Official 4.1.2 is **capital/augmentation** spend. Working 4.1.2 is **maintenance**, which is official **4.4.1**. |
| **4.2.1** | Library automated with ILMS; e-resources; optimal use by faculty and students | QlM | 15 | `4.2.1` Library Resources (id 22) | Possible | Library KI. Official combines ILMS + subscriptions + usage. Working “resources” does not include ILMS or usage SOP. |
| **4.2.2** | Expenditure on books / e-books / journals / e-journals | QnM | 5 | `4.2.2` Library Utilization (id 23) | **Conflicting** | Official is purchase/subscription **spend**. Working is **utilization** (footfall/usage). Different measures. |
| **4.3.1** | IT facilities updated; sufficient internet bandwidth | QlM | 12 | `4.3.1` IT Infrastructure (id 24) | Possible | IT KI. Official needs bandwidth/update narrative (and often a bandwidth figure). Working is a generic IT stub. |
| **4.3.2** | Student–computer ratio (latest year) | QnM | 10 | `4.3.2` Digital Learning Resources (id 25) | **Conflicting** | Official is computers in working condition vs students. Working is digital/e-content resources (closer to official **4.3.3**). |
| **4.3.3** | Dedicated AV centre, mixing/editing, media studio, LCS, hardware/software for e-content | QlM | 8 | `4.3.2` Digital Learning Resources (id 25) | Possible | Different code. E-content/LCS family. Working does not list studio/LCS assets. |
| **4.4.1** | Expenditure on maintenance of physical and academic support facilities excluding salary | QnM | 10 | `4.1.2` Infrastructure Maintenance (id 21) | Possible | Different code. Maintenance-spend family. Official is a 5-year expenditure percentage. |
| **4.4.2** | Established systems and procedures for maintaining and utilizing labs, library, sports, computers, classrooms | QlM | 10 | `4.1.2` Infrastructure Maintenance (id 21) | Possible | Same candidate as 4.4.1. Official 4.4.2 is **procedures** (QlM), 4.4.1 is **rupees** (QnM). Must split. |

---

## 5. Criterion 5 — Student Support and Progression (11 official / weight 100)

| Official | Title (short) | Type | Wt | Candidate working | Class | Why |
|---|---|---|---|---|---|---|
| **5.1.1** | Students benefited by scholarships and freeships (institution, government, non-government, industry, philanthropists) | QnM | 11 | `5.1.1` Student Support Services (id 26) | Possible | Support KI. Official is a scholarship-beneficiary **percentage** with funding-source split. Working is a generic support stub. |
| **5.1.2** | Career counselling including e-counselling and guidance for competitive examinations | QlM | 6 | `5.1.2` Student Welfare Initiatives (id 27) | **Conflicting** | Same code: official is **counselling/competitive exams**. Working is **welfare**. Better semantic neighbour is working `5.2.2` Career and Placement Support (id 29), which itself is a candidate for official 5.2.2 — collision. |
| **5.1.3** | Capacity development and skills-enhancement activities | QnM | 8 | `5.1.1` Student Support Services (id 26) | Possible | Soft skills / language / life skills / ICT options. Working has no activity-option list. Shares candidate with 5.1.1. |
| **5.1.4** | Redressal of student grievances including sexual harassment and ragging | QnM | 5 | — | No match | ICC / anti-ragging / Student Grievance Redressal Committee implementation options. No working equivalent. |
| **5.2.1** | Placement of outgoing students **and** progression to higher education (combined percentage) | QnM | 20 | `5.2.1` Student Progression (id 28) | Possible | Progression KI. Official is a combined placement + HE formula over five years. Working has no placed/HE/outgoing split. |
| **5.2.2** | Students qualifying in state/national/international examinations (of graduated students) | QnM | 10 | `5.2.2` Career and Placement Support (id 29) | Possible | Competitive-exam **qualifying rate**, not placement support services. Related career KI; different numerator. |
| **5.3.1** | Awards/medals in sports/cultural activities at university / state / national / international level | QnM | 15 | `5.3.1` Student Participation (id 30) | Possible | Participation/awards family. Official is a medal/award **count** with level filters, not generic participation. |
| **5.3.2** | Active Student Council and student representation on academic/administrative bodies | QlM | 10 | `5.3.2` Student Clubs and Activities (id 31) | Possible | Student-body family. Official is council + committee representation (QlM, 500 words). Working is clubs/activities. |
| **5.3.3** | Institution conducts/organizes listed cultural, sports, and technical activities | QnM | 5 | `5.3.1` Student Participation (id 30) / `5.3.2` Student Clubs (id 31) | Possible | Event-option QnM. Shares candidates with 5.3.1 and 5.3.2; human must not collapse three official metrics into two stubs. |
| **5.4.1** | Alumni contribution through registered Alumni association (last five years) | QnM | 5 | — | No match | No alumni-fund / registered-association ledger. |
| **5.4.2** | Alumni contribute and engage in academic and other support systems | QlM | 5 | — | No match | Alumni engagement narrative is absent from the working catalogue. |

---

## 6. Criterion 6 — Governance, Leadership and Management (12 official / weight 100)

| Official | Title (short) | Type | Wt | Candidate working | Class | Why |
|---|---|---|---|---|---|---|
| **6.1.1** | Institutional governance and leadership in accordance with vision/mission (truncated source title) | QlM | 15 | `6.1.1` Institutional Governance (id 32) | Possible | Governance KI. Official is vision/mission alignment of leadership (QlM). Working `6.1.2` Participative Decision Making is a secondary, not official 6.1.2. |
| **6.2.1** | Perspective plan deployed; bodies effective (policies, setup, appointment, service rules) | QlM | 6 | `6.2.1` Leadership Effectiveness (id 34) | Possible | Strategy/bodies family. Official lists policies, appointments, service rules. Working is generic “leadership.” |
| **6.2.2** | E-governance in operations | QnM | 4 | `6.2.2` Management Practices (id 35) | Possible | Weak. Official is an e-governance **areas** option list (administration, finance, student, exam). Working is generic management. |
| **6.3.1** | Performance appraisal, welfare measures, career progression for teaching and non-teaching staff | QlM | 5 | `6.3.1` Financial Planning (id 36) | **Conflicting** | Official 6.3 is **HR/staff development**. Working 6.3.1 is **finance**, which belongs with official **6.4**. |
| **6.3.2** | Teachers provided financial support to attend conferences/workshops and professional-body membership | QnM | 15 | `6.3.2` Financial Audit and Accountability (id 37) | **Conflicting** | Official is teacher conference/membership support. Working is **audit** (official **6.4.3**). |
| **6.3.3** | Teachers undergoing FDP / MDP (online or face-to-face, last five years) | QnM | 10 | — | No match | No FDP/MDP attendance register. |
| **6.4.1** | Strategies for mobilisation of funds other than salary and fees, and optimal utilisation | QlM | 5 | `6.3.1` Financial Planning (id 36) | Possible | Different code. Resource-mobilisation narrative vs generic financial planning. |
| **6.4.2** | Funds/grants from government, non-government, philanthropists (not covered in Criteria III and V) | QnM | 5 | — | No match | Residual grants metric with explicit exclusion of C3/C5 amounts. No working residual-grants ledger. |
| **6.4.3** | Internal and external financial audits conducted regularly | QlM | 5 | `6.3.2` Financial Audit and Accountability (id 37) | Possible | Different code. Audit family matches; official is QlM describing internal+external audit practice. |
| **6.5.1** | IQAC/IQAS institutionalizes quality strategies; reviews T-L, structures, learning outcomes | QlM | 10 | — | No match | No IQAC metric, body, or minutes workflow. |
| **6.5.2** | Institution reviews T-L process and learning outcomes at intervals through IQAC | QlM | 10 | — | No match | Overlaps 6.5.1 in theme; still a distinct official QlM. No working IQAC review cycle. |
| **6.5.3** | Quality-assurance practices adopted (option list) | QnM | 10 | — | No match | IQAC option-list QnM (e.g. regular meetings, AAA, NIRF, ISO — exact options need SOP confirmation). |

---

## 7. Criterion 7 — Institutional Values and Best Practices (12 official / weight 100)

| Official | Title (short) | Type | Wt | Candidate working | Class | Why |
|---|---|---|---|---|---|---|
| **7.1.1** | Gender audit and measures for gender equity (last five years) | QlM | 5 | `7.1.1` Institutional Values and Ethics (id 38) | Possible | Values KI. Official is **gender equity/audit** specifically, not generic ethics. |
| **7.1.2** | Alternate energy and conservation facilities (solar, biogas, grid, sensors, LED, wind; A–E options) | QnM | 6 | `7.1.2` Environmental and Social Responsibility (id 39) | Possible | Green-energy option list. Working is a generic environment stub; no A–E facility checklist. |
| **7.1.3** | Facilities for degradable and non-degradable waste (500 words) | QlM | 6 | `7.1.2` Environmental and Social Responsibility (id 39) | Possible | Waste-management write-up. Shares candidate with 7.1.2; must split energy vs waste. |
| **7.1.4** | Water conservation facilities | QnM | 5 | `7.1.2` (id 39) / `9.2.1` Environmental Sustainability (id 48) | Possible | Water-facility option list. Working C9 is not a RAF criterion; using it is a product decision, not an official counterpart. |
| **7.1.5** | Green campus initiatives | QlM | 4 | `9.2.2` Green Campus Initiatives (id 49) | Possible | Title-level topic match on a **non-RAF** working criterion (C9). Official 7.1.5 is still QlM under Criterion 7. Do not treat C9 as an official RAF section. |
| **7.1.6** | Quality audits on environment and energy | QnM | 5 | `9.2.1` Environmental Sustainability (id 48) | Possible | Green-audit option list. Same C9 caveat as 7.1.5. |
| **7.1.7** | Differently-abled (Divyangjan) friendly, barrier-free environment | QlM | 5 | — | No match | No accessibility / ramps / assistive-tech metric. Health (9.1.x) is not barrier-free design. |
| **7.1.8** | Inclusive environment: cultural, regional, linguistic, communal, socioeconomic diversity (500 words) | QlM | 5 | `7.1.1` Institutional Values and Ethics (id 38) | Possible | Inclusion narrative vs generic values. Shares 7.1.1 with 7.1.1, 7.1.9, 7.1.10. |
| **7.1.9** | Sensitization to constitutional obligations: values, rights, duties, responsibilities | QlM | 4 | `7.1.1` Institutional Values and Ethics (id 38) | Possible | Constitution/citizenship programmes. Not the same as gender (7.1.1) or code of conduct (7.1.10). |
| **7.1.10** | Prescribed code of conduct for students, teachers, administrators, staff; periodic programmes | QnM | 5 | `7.1.1` Institutional Values and Ethics (id 38) | Possible | Ethics/code family. Official is QnM with implementation options. This is the metric the prose “84” count omits; it is in Table 1 and the QIF listing. |
| **7.2.1** | Two best practices in NAAC manual format | QlM | 30 | `7.2.1` Institutional Best Practices (id 40) | Possible | Closest title pair after 4.1.1. Official requires **exactly two** practices in the NAAC format (title, objectives, context, practice, evidence of success, problems, notes). Working is Quantitative 10 with no format. Working `7.2.2` is **not** an official metric. |
| **7.3.1** | Institutional distinctiveness — one area of priority and thrust (1000 words) | QlM | 20 | — | No match | Distinctiveness is not working `10.1.1` Overall Institutional Outcomes or `10.1.2` Performance Review. Those C10 rows are not RAF. |

---

## 8. Working metrics with no official counterpart in this QIF

Codes **absent** from the Autonomous 85 (15):

| Working | Title | Notes |
|---|---|---|
| `1.1.3` | Academic Planning and Delivery | Used only as a **cross-code** possible candidate for official 2.3.3. Not an official 1.1.3. |
| `1.2.2` | Choice Based Learning Opportunities | No CBCS / elective-choice metric in this Autonomous QIF (1.2 is only 1.2.1 new courses). |
| `3.3.2` | Community Outreach | Used as possible candidate for official 3.6.2. Not an official 3.3.2 (official 3.3.1 is innovation/IKS). |
| `6.1.2` | Participative Decision Making | No official 6.1.2. May be content inside official 6.1.1; not a separate QIF row. |
| `7.2.2` | Innovative Institutional Practices | Official 7.2 has only 7.2.1 (two best practices). |
| `8.1.1` | Institutional Outreach | Criterion 8 is **not** in the 7-criteria RAF. Possible thematic overlap with 3.6.x only. |
| `8.1.2` | Outreach Programmes | Same. |
| `8.2.1` | Community Engagement | Same. |
| `8.2.2` | Social Development Activities | Same. |
| `9.1.1` | Health and Wellness Facilities | Not a QIF metric. May appear as a **facility bullet** inside official 4.1.1, not as its own code. |
| `9.1.2` | Student and Staff Health Initiatives | Same. |
| `9.2.1` | Environmental Sustainability | Non-RAF C9; used as possible candidate for 7.1.4 / 7.1.6. |
| `9.2.2` | Green Campus Initiatives | Non-RAF C9; used as possible candidate for 7.1.5. |
| `10.1.1` | Overall Institutional Outcomes | Criterion 10 is **not** RAF. Not a substitute for 7.3.1 distinctiveness or 2.6.x outcomes. |
| `10.1.2` | Institutional Performance Review | Same. |

Working rows that **share a code** with the QIF but are **not** counterparts (conflicting): `2.2.2`, `2.3.1`, `2.3.2`, `3.1.1`, `3.2.1`, `3.2.2`, `4.1.2`, `4.2.2`, `4.3.2`, `5.1.2`, `6.3.1`, `6.3.2`. Existing submissions on those codes cannot be treated as the official SSR metric.

---

## 9. Official metrics that require new data fields or workflows

The live submission model is `data_json` plus generic evidence files. There are **no** year-wise QnM templates, A–E option pickers, NAAC word-limit editors, faculty rosters, or SSS integration.

If this QIF becomes the operational catalogue, **every** official metric needs at least: official title/kind/weightage, SOP text, and evidence checklist. Beyond that:

### Must add structured QnM templates (year-wise numerator/denominator)

`1.2.1`, `1.3.2`, `1.3.3`, `2.1.1`, `2.1.2`, `2.2.2`, `2.4.1`–`2.4.4`, `2.5.1`, `2.5.2`, `2.6.2`, `3.1.2`, `3.1.3`, `3.2.1`, `3.2.2`, `3.2.3`, `3.4.2`–`3.4.4`, `3.5.1`, `3.6.2`, `3.7.1`, `4.1.2`, `4.2.2`, `4.3.2`, `4.4.1`, `5.1.1`, `5.2.1`, `5.2.2`, `5.3.1`, `5.4.1`, `6.3.2`, `6.3.3`, `6.4.2`.

### Must add A–E / multi-select option QnM UI (exact option text from SOP, not invented)

`1.4.1`, `3.4.1`, `5.1.3`, `5.1.4`, `5.3.3`, `6.2.2`, `6.5.3`, `7.1.2`, `7.1.4`, `7.1.6`, `7.1.10`. (4.1.1 may also use a facilities checklist inside a QlM.)

### Must add QlM word-limit / NAAC-format editors

500-word prompts include `1.1.1`, `1.1.2`, `1.3.1`, `2.2.1`, `2.3.x`, `2.5.3`, `2.6.1`, `3.1.1`, `3.3.1`, `3.6.1`, `4.1.1`, `4.2.1`, `4.3.1`, `4.3.3`, `4.4.2`, `5.1.2`, `5.3.2`, `5.4.2`, `6.1.1`, `6.2.1`, `6.3.1`, `6.4.1`, `6.4.3`, `6.5.1`, `6.5.2`, `7.1.1`, `7.1.3`, `7.1.5`, `7.1.7`–`7.1.9`.
**Special formats:** `7.2.1` two-practice NAAC template; `7.3.1` 1000-word distinctiveness.

### Must add domain workflows that do not exist today

| Workflow | Official metrics |
|---|---|
| Faculty HR roster (sanctioned posts, qualification, experience, retention, research-guide status) | 2.2.2, 2.4.1–2.4.4, 3.2.3 |
| Examination EMS (result lag, evaluation grievances, CIA/IT reforms) | 2.5.1–2.5.3 |
| PO/CO publication and attainment | 1.1.1 (relevance), 2.6.1 (attainment) — two different official asks |
| NAAC Student Satisfaction Survey (student list, portal, 50-weight QnM) | 2.7.1 |
| Research: seed money, fellowships, ethics/plagiarism, Ph.D. scholars, CARE papers, books, Scopus/WoS bibliometrics | 3.1.2–3.1.3, 3.4.1–3.4.6 |
| Consultancy and corporate-training revenue | 3.5.1 |
| Finance ledgers with C3/C5 exclusion rules | 3.2.1, 4.1.2, 4.2.2, 4.4.1, 6.4.1–6.4.2 |
| Placement + higher-education + competitive-exam registers | 5.2.1, 5.2.2 |
| Statutory student grievance / ICC / anti-ragging | 5.1.4 |
| Registered alumni association (funds + engagement) | 5.4.1, 5.4.2 |
| IQAC/IQAS (meetings, AAA, quality processes) | 6.5.1–6.5.3 |
| FDP/MDP and conference-support registers | 6.3.2, 6.3.3 |
| Divyangjan / barrier-free campus inventory | 7.1.7 |
| Gender audit | 7.1.1 |
| Green campus facility inventories and environmental audits | 7.1.2–7.1.6 |

Internship / field-project coverage (`1.3.3`) also needs a programme-component register that does not exist.

---

## 10. Decisions requiring product-owner or NAAC confirmation

Do **not** resolve these by inventing mappings or required flags.

1. **Whether the 51 working rows remain the operational submission catalogue** after Autonomous QIF identity is loaded, or whether official QIF rows become first-class `metrics` (recommended for production SSR, not decided here).
2. **None of the 46 “possible” pairs is approved.** Each needs a human decision: replace the working stub, split it, or create a new metric and leave historical submissions on the old code.
3. **The 12 conflicting same-code pairs must not be mapped.** Confirm a migration path for any live submissions already stored under those working codes.
4. **One-to-many collisions** (listed in Summary) — one working id cannot satisfy two official SSR lines.
5. **C8 / C9 / C10 working criteria** are not in the 7-criteria RAF. Confirm they stay internal-only and are never required on an official Autonomous cycle.
6. **Required vs optional vs not-applicable** for any of the 85. Official QIF retrieved for this work does not state “all metrics are mandatory.” `required_default` must stay false until NAAC SOP/DVV rules are verified.
7. **Prose 84 vs Table 1 / listing 85**, specifically whether `7.1.10` Code of Conduct is in the current Autonomous SSR. Import followed Table 1 + listing.
8. **2.7.1 SSS** — whether EduVerse must integrate with the NAAC SSS workflow or only store a declaration/upload.
9. **3.4.5 / 3.4.6 bibliometrics** — whether data is HEI-entered, INFLIBNET/NAAC-provided, or out of scope for v1.
10. **University and Affiliated/Constituent line-level IDs** — still unverified from NAAC.gov.in; do not copy Autonomous 85 onto those families.
11. **DVV SOP option lists** for A–E metrics — QIF titles often truncate (“Institution has adopted the following…”). Exact options must come from the official SOP, not from HEI copies or memory.
12. **Historical cycles 10 and 11** (`framework_id` null, 44 submissions) — confirm they remain on the working catalogue and are never backfilled to `RAF_AUTONOMOUS_COLLEGE`.

---

## 11. Read-only validation (9 Oct 2026)

| Check | Result |
|---|---|
| Official Autonomous `framework_metrics` | 85 unique codes |
| Working `metrics` | 51 |
| `maps_to_metric_id` non-null | **0** |
| `required_default` true | **0** |
| `allows_production_cycles` | **false** |
| University `framework_metrics` | **0** |
| Affiliated `framework_metrics` | **0** |
| Cycles 10 and 11 `framework_id` | **null** |
| Submissions | **44** (unchanged) |

No application code, migration, seed, or database row was modified for this report.

## 12. What this document does not do

- Does not write `FrameworkMetric.maps_to_metric_id`.
- Does not alter `cycle_applicable_metrics`.
- Does not mark any metric mandatory or optional.
- Does not set `allows_production_cycles` or `verification_status`.
- Does not import University or Affiliated catalogues.
- Does not activate a framework or change production readiness.
