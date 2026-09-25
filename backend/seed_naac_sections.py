from app.db.database import SessionLocal
from app.models import Section, Criterion


sections = [
    # C1
    (1, "1.2", "Academic Flexibility", "Flexibility and choice in academic programs.", 20, 2),
    (1, "1.3", "Curriculum Enrichment", "Enrichment of curriculum through additional academic activities.", 20, 3),

    # C2
    (2, "2.1", "Student Enrolment & Profile", "Student admission, enrolment and profile.", 20, 1),
    (2, "2.2", "Teaching-Learning Process", "Teaching and learning practices.", 20, 2),
    (2, "2.3", "Evaluation & Assessment", "Student evaluation and assessment practices.", 20, 3),

    # C3
    (3, "3.1", "Research & Publications", "Research activities and scholarly publications.", 20, 1),
    (3, "3.2", "Innovation & Collaboration", "Innovation, collaboration and research partnerships.", 20, 2),
    (3, "3.3", "Extension Activities", "Extension and community-oriented activities.", 20, 3),

    # C4
    (4, "4.1", "Physical Infrastructure", "Availability and maintenance of physical infrastructure.", 20, 1),
    (4, "4.2", "Library & Learning Resources", "Library facilities and learning resources.", 20, 2),
    (4, "4.3", "IT Infrastructure", "Information technology and digital infrastructure.", 20, 3),

    # C5
    (5, "5.1", "Student Support", "Student support and welfare services.", 20, 1),
    (5, "5.2", "Student Progression", "Student progression and career development.", 20, 2),
    (5, "5.3", "Student Participation", "Student participation and engagement.", 20, 3),

    # C6
    (6, "6.1", "Institutional Governance", "Institutional governance and administrative practices.", 20, 1),
    (6, "6.2", "Leadership & Management", "Leadership and management practices.", 20, 2),
    (6, "6.3", "Financial Management", "Financial planning and resource management.", 20, 3),

    # C7
    (7, "7.1", "Institutional Values", "Institutional values and social responsibility.", 20, 1),
    (7, "7.2", "Best Practices", "Institutional best practices.", 20, 2),

    # C8
    (8, "8.1", "Outreach Activities", "Institutional outreach activities.", 20, 1),
    (8, "8.2", "Community Engagement", "Engagement with the surrounding community.", 20, 2),

    # C9
    (9, "9.1", "Health & Well-being", "Health, safety and well-being initiatives.", 20, 1),
    (9, "9.2", "Environmental Sustainability", "Environmental sustainability initiatives.", 20, 2),

    # C10
    (10, "10.1", "Institutional Performance", "Overall institutional performance and outcomes.", 20, 1),
]


db = SessionLocal()

try:
    inserted = 0
    skipped = 0

    for criterion_id, code, title, description, weightage, display_order in sections:

        criterion = (
            db.query(Criterion)
            .filter(Criterion.id == criterion_id)
            .first()
        )

        if not criterion:
            print(
                f"SKIPPED: Criterion ID {criterion_id} does not exist"
            )
            skipped += 1
            continue

        existing = (
            db.query(Section)
            .filter(
                Section.criterion_id == criterion_id,
                Section.code == code
            )
            .first()
        )

        if existing:
            print(
                f"EXISTS: C{criterion_id} -> {code} {title}"
            )
            skipped += 1
            continue

        section = Section(
            criterion_id=criterion_id,
            code=code,
            title=title,
            description=description,
            weightage=weightage,
            display_order=display_order
        )

        db.add(section)
        inserted += 1

    db.commit()

    print("\n===================================")
    print("NAAC SECTION SEED COMPLETE")
    print("===================================")
    print(f"Inserted : {inserted}")
    print(f"Skipped  : {skipped}")
    print("===================================")

finally:
    db.close()