"""Source-backed NAAC framework catalogue.

Metric-level official IDs are not invented. Binary/MBGL are recorded as
announced, not operative production pathways.
"""

from datetime import date


VERIFIED = "VERIFIED"
REQUIRES_OFFICIAL_VERIFICATION = "REQUIRES_OFFICIAL_VERIFICATION"
ANNOUNCED_NOT_OPERATIVE = "ANNOUNCED_NOT_OPERATIVE"
CATALOGUE_INCOMPLETE = "CATALOGUE_INCOMPLETE"
PRODUCTION_READY = "PRODUCTION_READY"
INTERNAL_WORKING_CATALOG = "INTERNAL_WORKING_CATALOG"

PENDING_FRAMEWORK_VERIFICATION = "PENDING_FRAMEWORK_VERIFICATION"
RECOMMENDATION_VERIFIED = "VERIFIED"

PRODUCTION_CYCLE_STATUSES = {"Active", "In Progress", "Completed"}

PATHWAY_RAF = "RAF"
PATHWAY_BINARY = "BINARY"
PATHWAY_MBGL = "MBGL"
PATHWAY_INTERNAL = "INTERNAL"

CATEGORY_UNIVERSITY = "UNIVERSITY"
CATEGORY_AUTONOMOUS_COLLEGE = "AUTONOMOUS_COLLEGE"
CATEGORY_AFFILIATED_COLLEGE = "AFFILIATED_COLLEGE"
CATEGORY_CONSTITUENT_COLLEGE = "CONSTITUENT_COLLEGE"
CATEGORY_OPEN_UNIVERSITY = "OPEN_UNIVERSITY"
CATEGORY_OTHER = "OTHER"

SEVEN_CRITERIA = [
    ("C1", "Curricular Aspects", 1),
    ("C2", "Teaching-Learning and Evaluation", 2),
    ("C3", "Research, Innovations and Extension", 3),
    ("C4", "Infrastructure and Learning Resources", 4),
    ("C5", "Student Support and Progression", 5),
    ("C6", "Governance, Leadership and Management", 6),
    ("C7", "Institutional Values and Best Practices", 7),
]

SEVEN_CRITERIA_NUMBERS = {item[0] for item in SEVEN_CRITERIA}

PERMITTED_EXCEPTION_TYPES = {
    "NOT_APPLICABLE",
    "OPTIONAL_OVERRIDE",
    "EXCLUDED",
}

OFFICIAL_CATEGORIES = [
    {
        "code": CATEGORY_UNIVERSITY,
        "label": "University",
        "description": "Central, state, deemed, or private university assessed as a university.",
    },
    {
        "code": CATEGORY_AUTONOMOUS_COLLEGE,
        "label": "Autonomous College",
        "description": "College granted autonomy by UGC / affiliating university.",
    },
    {
        "code": CATEGORY_AFFILIATED_COLLEGE,
        "label": "Affiliated College",
        "description": "College affiliated to a UGC-recognised affiliating university.",
    },
    {
        "code": CATEGORY_CONSTITUENT_COLLEGE,
        "label": "Constituent College",
        "description": "Constituent college of a university; parent institution details are required.",
    },
    {
        "code": CATEGORY_OPEN_UNIVERSITY,
        "label": "Open University / ODL University",
        "description": "Open university assessed under the NAAC ODL / Open University manual.",
    },
    {
        "code": CATEGORY_OTHER,
        "label": "Other / not listed",
        "description": "Category is unclear against official NAAC HEI groups.",
    },
]

OFFICIAL_CATEGORY_CODES = frozenset(item["code"] for item in OFFICIAL_CATEGORIES)


def normalize_official_category(value, required: bool = False) -> str | None:
    """Return a supported official category code or raise ValueError."""
    if value is not None and not isinstance(value, str):
        raise ValueError("Official NAAC category must be a category code.")
    code = (value or "").strip().upper()
    if not code:
        if required:
            raise ValueError("Official NAAC category is required.")
        return None
    if code not in OFFICIAL_CATEGORY_CODES:
        raise ValueError(
            "Unsupported official NAAC category. Use one of: "
            + ", ".join(sorted(OFFICIAL_CATEGORY_CODES))
            + "."
        )
    return code

CODE_INTERNAL = "EDUVERSE_INTERNAL_WORKING_CATALOG"
CODE_RAF_UNIVERSITY = "RAF_UNIVERSITY"
CODE_RAF_AUTONOMOUS = "RAF_AUTONOMOUS_COLLEGE"
CODE_RAF_AFFILIATED = "RAF_AFFILIATED_CONSTITUENT_COLLEGE"
CODE_RAF_OPEN_UNIVERSITY = "RAF_OPEN_UNIVERSITY"
CODE_BINARY = "BINARY_ACCREDITATION"
CODE_MBGL = "MBGL"

FRAMEWORK_DEFINITIONS = [
    {
        "code": CODE_INTERNAL,
        "name": "EduVerse internal working catalogue (RAF-style)",
        "version": "1.0",
        "pathway_type": PATHWAY_INTERNAL,
        "institution_category": CATEGORY_OTHER,
        "programme_level": None,
        "source_title": "Existing EduVerse metric catalogue",
        "source_url": None,
        "issuing_authority": "EduVerse (internal)",
        "publication_date": None,
        "effective_from": None,
        "effective_to": None,
        "verification_status": REQUIRES_OFFICIAL_VERIFICATION,
        "status": "ACTIVE",
        "allows_production_cycles": True,
        "uses_seven_criteria": True,
        "official_criterion_count": 7,
        "official_metric_count": None,
        "official_metric_count_note": (
            "Preserves the metrics already stored in this application. "
            "Codes and titles are not claimed as a complete official NAAC SSR list."
        ),
        "notes": (
            "Legacy / existing-cycle fallback. Not an official NAAC manual. "
            "Used so current institutions and cycles keep working."
        ),
        "seed_seven_criteria": True,
    },
    {
        "code": CODE_RAF_UNIVERSITY,
        "name": "NAAC Revised Accreditation Framework — Universities",
        "version": "2023-03-29",
        "pathway_type": PATHWAY_RAF,
        "institution_category": CATEGORY_UNIVERSITY,
        "programme_level": None,
        "source_title": "Manual for Universities (Revised Accreditation Framework)",
        "source_url": "http://naac.gov.in/index.php/en/",
        "issuing_authority": "National Assessment and Accreditation Council (NAAC)",
        "publication_date": date(2023, 3, 29),
        "effective_from": date(2023, 3, 29),
        "effective_to": None,
        "verification_status": VERIFIED,
        "status": "ACTIVE",
        "allows_production_cycles": False,
        "uses_seven_criteria": True,
        "official_criterion_count": 7,
        "official_metric_count": 115,
        "official_metric_count_note": (
            "University Manual dated 29 March 2023 states 115 university metrics. "
            "Later third-party copies cite 137. Exact current count "
            f"{REQUIRES_OFFICIAL_VERIFICATION}. No metric IDs are seeded."
        ),
        "notes": (
            "Established seven-criteria RAF for universities. Full official "
            "metric catalogue is not imported because line-level codes were "
            "not verified from a NAAC.gov.in file in this change."
        ),
        "seed_seven_criteria": True,
    },
    {
        "code": CODE_RAF_AUTONOMOUS,
        "name": "NAAC Revised Accreditation Framework — Autonomous Colleges",
        "version": "2023-07-11",
        "pathway_type": PATHWAY_RAF,
        "institution_category": CATEGORY_AUTONOMOUS_COLLEGE,
        "programme_level": None,
        "source_title": (
            "NAAC Autonomous Colleges Manual in Multi Languages "
            "(simplified RAF QIF)"
        ),
        "source_url": (
            "http://naac.gov.in/index.php/en/2-uncategorised/"
            "239-empanelment-of-hindi-consultant-2023"
        ),
        "issuing_authority": "National Assessment and Accreditation Council (NAAC)",
        "publication_date": date(2023, 7, 11),
        "effective_from": date(2023, 7, 11),
        "effective_to": None,
        "verification_status": VERIFIED,
        "status": "ACTIVE",
        "allows_production_cycles": False,
        "uses_seven_criteria": True,
        "official_criterion_count": 7,
        "official_metric_count": 85,
        "official_metric_count_note": (
            "Table 1 of the 11 July 2023 NAAC HTML manual lists 85 metrics "
            "(35 QlM + 50 QnM). The QIF lists 85 unique IDs whose weightages "
            "sum to 1000. The same page's prose says 84. Required/optional "
            "status is not stated, so production cycles stay disabled."
        ),
        "notes": (
            "Criterion structure and QIF metric IDs/titles/types/weightages "
            "are taken from the official NAAC.gov.in HTML manual. Metrics are "
            "not marked required. Working-catalogue rows are not auto-mapped."
        ),
        "seed_seven_criteria": True,
    },
    {
        "code": CODE_RAF_AFFILIATED,
        "name": "NAAC Revised Accreditation Framework — Affiliated / Constituent Colleges",
        "version": "2023-07-20",
        "pathway_type": PATHWAY_RAF,
        "institution_category": CATEGORY_AFFILIATED_COLLEGE,
        "programme_level": "BOTH",
        "source_title": "Manual for Affiliated / Constituent Colleges",
        "source_url": "http://naac.gov.in/index.php/en/",
        "issuing_authority": "National Assessment and Accreditation Council (NAAC)",
        "publication_date": date(2023, 7, 20),
        "effective_from": date(2023, 7, 20),
        "effective_to": None,
        "verification_status": VERIFIED,
        "status": "ACTIVE",
        "allows_production_cycles": False,
        "uses_seven_criteria": True,
        "official_criterion_count": 7,
        "official_metric_count": None,
        "official_metric_count_note": (
            "University Manual 29 March 2023 cites 93 UG and 96 PG affiliated/"
            "constituent metrics. Affiliated College Manual 20 July 2023 uses "
            "the same seven criteria. Line-level UG/PG metric lists are "
            f"{REQUIRES_OFFICIAL_VERIFICATION}."
        ),
        "notes": (
            "Affiliated and constituent colleges share this RAF family. "
            "UG versus PG metric variants are recorded on the institution "
            "profile, not as invented metric rows."
        ),
        "seed_seven_criteria": True,
    },
    {
        "code": CODE_RAF_OPEN_UNIVERSITY,
        "name": "NAAC Revised Accreditation Framework — Open Universities",
        "version": "RAF-ODL",
        "pathway_type": PATHWAY_RAF,
        "institution_category": CATEGORY_OPEN_UNIVERSITY,
        "programme_level": None,
        "source_title": "Open University Manual (NAAC RAF for ODL institutions)",
        "source_url": (
            "http://naac.gov.in/index.php/en/terms-conditions/"
            "2-uncategorised/250-open-university-manual-in-multi-languages"
        ),
        "issuing_authority": "National Assessment and Accreditation Council (NAAC)",
        "publication_date": None,
        "effective_from": date(2017, 7, 1),
        "effective_to": None,
        "verification_status": VERIFIED,
        "status": "ACTIVE",
        "allows_production_cycles": False,
        "uses_seven_criteria": True,
        "official_criterion_count": 7,
        "official_metric_count": None,
        "official_metric_count_note": (
            "NAAC states the seven conventional criteria are adopted for ODL "
            "with modified key indicators and weightages. Exact metric IDs "
            f"and the current manual date are {REQUIRES_OFFICIAL_VERIFICATION}."
        ),
        "notes": "Seven-criteria ODL pathway. Metric catalogue not imported.",
        "seed_seven_criteria": True,
    },
    {
        "code": CODE_BINARY,
        "name": "NAAC Basic (Binary) Accreditation",
        "version": "announced",
        "pathway_type": PATHWAY_BINARY,
        "institution_category": CATEGORY_OTHER,
        "programme_level": None,
        "source_title": (
            "PIB: Major Reforms in Accreditation of Higher Education Institutions; "
            "NAAC Public Notice 5 December 2025"
        ),
        "source_url": (
            "https://www.pib.gov.in/Pressreleaseshare.aspx?"
            "PRID=2000086&lang=2&reg=48"
        ),
        "issuing_authority": (
            "Ministry of Education / NAAC Executive Committee"
        ),
        "publication_date": date(2024, 1, 27),
        "effective_from": None,
        "effective_to": None,
        "verification_status": ANNOUNCED_NOT_OPERATIVE,
        "status": "NOT_AVAILABLE_FOR_PRODUCTION",
        "allows_production_cycles": False,
        "uses_seven_criteria": False,
        "official_criterion_count": None,
        "official_metric_count": None,
        "official_metric_count_note": (
            "Binary accreditation is a recommended reform. NAAC's 5 December 2025 "
            "notice still describes it as proposed / to be launched. No operative "
            "metric catalogue is activated here."
        ),
        "notes": (
            "Do not treat Binary Accreditation as the current mandatory "
            "production pathway."
        ),
        "seed_seven_criteria": False,
    },
    {
        "code": CODE_MBGL,
        "name": "NAAC Maturity-Based Graded Levels (MBGL)",
        "version": "announced",
        "pathway_type": PATHWAY_MBGL,
        "institution_category": CATEGORY_OTHER,
        "programme_level": None,
        "source_title": (
            "PIB: Major Reforms in Accreditation of Higher Education Institutions; "
            "NAAC Public Notice 5 December 2025"
        ),
        "source_url": (
            "https://www.pib.gov.in/Pressreleaseshare.aspx?"
            "PRID=2000086&lang=2&reg=48"
        ),
        "issuing_authority": (
            "Ministry of Education / NAAC Executive Committee"
        ),
        "publication_date": date(2024, 1, 27),
        "effective_from": None,
        "effective_to": None,
        "verification_status": ANNOUNCED_NOT_OPERATIVE,
        "status": "NOT_AVAILABLE_FOR_PRODUCTION",
        "allows_production_cycles": False,
        "uses_seven_criteria": False,
        "official_criterion_count": None,
        "official_metric_count": None,
        "official_metric_count_note": (
            "MBGL remains announced. NAAC has not published an operative "
            "production metric catalogue used by this application."
        ),
        "notes": "Not available for production cycles.",
        "seed_seven_criteria": False,
    },
]


def serialize_framework(framework, criteria=None, readiness=None) -> dict:
    readiness = readiness or {}
    return {
        "id": framework.id,
        "code": framework.code,
        "name": framework.name,
        "version": framework.version,
        "pathway_type": framework.pathway_type,
        "institution_category": framework.institution_category,
        "programme_level": framework.programme_level,
        "source_title": framework.source_title,
        "source_url": framework.source_url,
        "issuing_authority": framework.issuing_authority,
        "publication_date": framework.publication_date,
        "effective_from": framework.effective_from,
        "effective_to": framework.effective_to,
        "verification_status": framework.verification_status,
        "status": framework.status,
        "allows_production_cycles": readiness.get(
            "allows_production_cycles",
            False,
        ),
        "uses_seven_criteria": framework.uses_seven_criteria,
        "official_criterion_count": framework.official_criterion_count,
        "official_metric_count": framework.official_metric_count,
        "official_metric_count_note": framework.official_metric_count_note,
        "notes": framework.notes,
        "criterion_structure_verified": readiness.get(
            "criterion_structure_verified",
            False,
        ),
        "metric_catalogue_complete": readiness.get(
            "metric_catalogue_complete",
            False,
        ),
        "metric_row_count": readiness.get("metric_row_count", 0),
        "metric_rules_verified": readiness.get("metric_rules_verified", False),
        "confirmable": readiness.get("confirmable", False),
        "catalogue_status": readiness.get(
            "catalogue_status",
            CATALOGUE_INCOMPLETE,
        ),
        "criteria": criteria or [],
    }
