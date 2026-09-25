from app.db.database import SessionLocal
from app.models import Metric, Section


metrics = [
    # C1
    (1, "1.1.2", "Curriculum Development and Revision"),
    (1, "1.1.3", "Academic Planning and Delivery"),

    (2, "1.2.1", "Academic Flexibility and Choice"),
    (2, "1.2.2", "Choice Based Learning Opportunities"),

    (3, "1.3.1", "Curriculum Enrichment Activities"),
    (3, "1.3.2", "Value Added Learning"),

    # C2
    (4, "2.1.1", "Student Admission and Enrolment"),
    (4, "2.1.2", "Student Profile Analysis"),

    (5, "2.2.1", "Teaching-Learning Practices"),
    (5, "2.2.2", "Student Centric Learning"),

    (6, "2.3.1", "Continuous Internal Evaluation"),
    (6, "2.3.2", "Assessment and Feedback"),

    # C3
    (7, "3.1.1", "Research Publications"),
    (7, "3.1.2", "Research Quality and Impact"),

    (8, "3.2.1", "Innovation Activities"),
    (8, "3.2.2", "Research Collaboration"),

    (9, "3.3.1", "Extension Activities"),
    (9, "3.3.2", "Community Outreach"),

    # C4
    (10, "4.1.1", "Physical Infrastructure Facilities"),
    (10, "4.1.2", "Infrastructure Maintenance"),

    (11, "4.2.1", "Library Resources"),
    (11, "4.2.2", "Library Utilization"),

    (12, "4.3.1", "IT Infrastructure"),
    (12, "4.3.2", "Digital Learning Resources"),

    # C5
    (13, "5.1.1", "Student Support Services"),
    (13, "5.1.2", "Student Welfare Initiatives"),

    (14, "5.2.1", "Student Progression"),
    (14, "5.2.2", "Career and Placement Support"),

    (15, "5.3.1", "Student Participation"),
    (15, "5.3.2", "Student Clubs and Activities"),

    # C6
    (16, "6.1.1", "Institutional Governance"),
    (16, "6.1.2", "Participative Decision Making"),

    (17, "6.2.1", "Leadership Effectiveness"),
    (17, "6.2.2", "Management Practices"),

    (18, "6.3.1", "Financial Planning"),
    (18, "6.3.2", "Financial Audit and Accountability"),

    # C7
    (19, "7.1.1", "Institutional Values and Ethics"),
    (19, "7.1.2", "Environmental and Social Responsibility"),

    (20, "7.2.1", "Institutional Best Practices"),
    (20, "7.2.2", "Innovative Institutional Practices"),

    # C8
    (21, "8.1.1", "Institutional Outreach"),
    (21, "8.1.2", "Outreach Programmes"),

    (22, "8.2.1", "Community Engagement"),
    (22, "8.2.2", "Social Development Activities"),

    # C9
    (23, "9.1.1", "Health and Wellness Facilities"),
    (23, "9.1.2", "Student and Staff Health Initiatives"),

    (24, "9.2.1", "Environmental Sustainability"),
    (24, "9.2.2", "Green Campus Initiatives"),

    # C10
    (25, "10.1.1", "Overall Institutional Outcomes"),
    (25, "10.1.2", "Institutional Performance Review"),
]


db = SessionLocal()

try:
    inserted = 0
    skipped = 0

    for section_id, code, title in metrics:

        section = (
            db.query(Section)
            .filter(Section.id == section_id)
            .first()
        )

        if not section:
            print(f"SKIPPED: Section ID {section_id} not found")
            skipped += 1
            continue

        existing = (
            db.query(Metric)
            .filter(
                Metric.section_id == section_id,
                Metric.code == code
            )
            .first()
        )

        if existing:
            print(f"EXISTS: {code} - {title}")
            skipped += 1
            continue

        metric = Metric(
            section_id=section_id,
            code=code,
            title=title,
            description=f"Metric for evaluating {title.lower()}.",
            metric_type="Quantitative",
            weightage=10,
            max_score=100,
            requires_evidence=True,
            display_order=2
        )

        db.add(metric)
        inserted += 1

    db.commit()

    print("\n===================================")
    print("NAAC METRIC SEED COMPLETE")
    print("===================================")
    print(f"Inserted : {inserted}")
    print(f"Skipped  : {skipped}")
    print("===================================")

finally:
    db.close()