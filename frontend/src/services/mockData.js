// Centralized Mock Data for Development / Fallback Mode

export const MOCK_CRITERIA = [
  { id: "c1", number: "01", title: "Curricular Aspects", score: 78, maxScore: 100, status: "In Progress", weighted: 78 },
  { id: "c2", number: "02", title: "Teaching-Learning & Evaluation", score: 224, maxScore: 350, status: "In Review", weighted: 64 },
  { id: "c3", number: "03", title: "Research, Innovations & Extension", score: 142, maxScore: 200, status: "Completed", weighted: 71 },
  { id: "c4", number: "04", title: "Infrastructure & Learning Resources", score: 59, maxScore: 100, status: "Attention Required", weighted: 59 },
  { id: "c5", number: "05", title: "Student Support & Progression", score: 73, maxScore: 100, status: "In Progress", weighted: 73 },
  { id: "c6", number: "06", title: "Governance, Leadership & Management", score: 62, maxScore: 100, status: "In Review", weighted: 62 },
  { id: "c7", number: "07", title: "Institutional Values & Best Practices", score: 69, maxScore: 100, status: "In Progress", weighted: 69 },
];

export const MOCK_DEPARTMENTS = [
  { id: "d1", name: "Computer Science & Engineering", code: "CSE", head: "Dr. A. Sharma", facultyCount: 42, completion: 84 },
  { id: "d2", name: "Mechanical Engineering", code: "MECH", head: "Dr. R. Verma", facultyCount: 38, completion: 76 },
  { id: "d3", name: "Electronics & Communication", code: "ECE", head: "Dr. S. Nair", facultyCount: 35, completion: 81 },
  { id: "d4", name: "Civil Engineering", code: "CIVIL", head: "Dr. M. Patel", facultyCount: 29, completion: 69 },
  { id: "d5", name: "Management Studies", code: "MBA", head: "Dr. P. Gupta", facultyCount: 24, completion: 91 },
];

export const MOCK_DOCUMENTS = [
  { id: "doc1", title: "Curriculum Feedback Report 2024-25", criterion: "Criterion 1", department: "CSE", uploadedBy: "Dr. A. Sharma", date: "2026-03-10", status: "Approved" },
  { id: "doc2", title: "Faculty Research Publications List Q4", criterion: "Criterion 3", department: "ECE", uploadedBy: "Dr. S. Nair", date: "2026-03-11", status: "Under Review" },
  { id: "doc3", title: "Lab Infrastructure Audit Sheet", criterion: "Criterion 4", department: "MECH", uploadedBy: "Prof. K. Mehta", date: "2026-03-08", status: "Pending" },
  { id: "doc4", title: "Student Placement Data & Offer Letters", criterion: "Criterion 5", department: "CSE", uploadedBy: "Dr. A. Sharma", date: "2026-03-09", status: "Approved" },
  { id: "doc5", title: "E-Governance Implementation Report", criterion: "Criterion 6", department: "Admin", uploadedBy: "Admin User", date: "2026-03-12", status: "Submitted" },
];

export const MOCK_SUBMISSIONS = [
  { id: "sub1", title: "SSR Draft Criterion 1", criterion: "Criterion 1", department: "All Depts", submittedBy: "Coordinator", date: "2026-03-01", status: "Approved" },
  { id: "sub2", title: "AQAR Quantitative Metrics 2.3", criterion: "Criterion 2", department: "CSE", submittedBy: "Dept Coordinator", date: "2026-03-05", status: "Under Review" },
  { id: "sub3", title: "Extension Activities Audit Report", criterion: "Criterion 3", department: "CIVIL", submittedBy: "Committee Member", date: "2026-03-09", status: "Pending" },
  { id: "sub4", title: "Green Audit & Energy Certificate", criterion: "Criterion 7", department: "Admin", submittedBy: "Admin User", date: "2026-03-11", status: "Submitted" },
];

export const MOCK_REVIEWS = [
  { id: "rev1", submissionTitle: "AQAR Quantitative Metrics 2.3", reviewer: "Dr. External Reviewer", assignedDate: "2026-03-06", status: "Pending", comments: "Awaiting verification of sample size." },
  { id: "rev2", submissionTitle: "SSR Draft Criterion 1", reviewer: "Dr. Internal Reviewer", assignedDate: "2026-03-02", status: "Approved", comments: "All statutory metrics validated." },
  { id: "rev3", submissionTitle: "Lab Infrastructure Audit Sheet", reviewer: "Data Approver", assignedDate: "2026-03-09", status: "Returned", comments: "Missing signature on page 4." },
];

export const MOCK_REPORTS = [
  { id: "rep1", name: "Institutional Executive SSR Dossier", format: "PDF / Executive Packet", generatedDate: "2026-03-12", type: "Full SSR" },
  { id: "rep2", name: "Departmental Criteria Progress Matrix", format: "XLSX Data Sheet", generatedDate: "2026-03-10", type: "Analytics" },
  { id: "rep3", name: "DVV Clarification Readiness Summary", format: "PDF Report", generatedDate: "2026-03-08", type: "Audit" },
];

export const MOCK_USERS = [
  { id: "u1", name: "Dr. S. Kulkarni", email: "admin@university.edu", role: "Admin", department: "Central Administration", status: "Active" },
  { id: "u2", name: "Dr. A. Sharma", email: "coordinator@university.edu", role: "Coordinator", department: "IQAC Cell", status: "Active" },
  { id: "u3", name: "Prof. R. Verma", email: "dept.cse@university.edu", role: "Dept. Coordinator", department: "Computer Science", status: "Active" },
  { id: "u4", name: "Dr. S. Nair", email: "reviewer@accreditation.org", role: "Reviewer", department: "External Audit Committee", status: "Active" },
  { id: "u5", name: "Dr. M. Patel", email: "approver@university.edu", role: "Data Approver", department: "Statutory Approvals", status: "Active" },
  { id: "u6", name: "Dr. P. Director", email: "director@university.edu", role: "Principal / Director", department: "Executive Board", status: "Active" },
];

export const MOCK_NOTIFICATIONS = [
  { id: "n1", title: "Criterion 3 Evidence Uploaded", text: "Dr. S. Nair uploaded research paper proofs for ECE department.", time: "12 min ago", unread: true },
  { id: "n2", title: "Review Required", text: "New submission 'AQAR Metrics 2.3' pending your evaluation.", time: "45 min ago", unread: true },
  { id: "n3", title: "SSR Packet Sync Completed", text: "Live sync completed with statutory cloud database.", time: "2 hrs ago", unread: false },
];

export const MOCK_INSTITUTIONS = [
  { id: "inst1", name: "EduVerse Institute of Technology & Science", code: "EITS-2026", city: "Mumbai", state: "Maharashtra", institution_type: "Autonomous College", status: "Verified" },
  { id: "inst2", name: "EduVerse Business School", code: "EBS-1002", city: "Pune", state: "Maharashtra", institution_type: "Affiliated Institute", status: "Verified" },
];
