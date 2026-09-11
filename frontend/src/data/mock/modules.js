export const DASHBOARD_KPIS = {
  overallProgress: { percent: 72.4, trend: '↓ 0.6% vs last month', trendUp: false },
  completedMetrics: { value: '236 / 326', label: 'Completed Metrics' },
  pendingEvidence: { value: 90, label: 'Pending Evidence' },
  overdueItems: { value: 32, label: 'Overdue Items' },
  approvalPending: { value: 18, label: 'Approval Pending' },
};

export const RECENT_ACTIVITY = [
  {
    id: 1,
    text: 'Criterion 2: 2.2.1 Student Attendance data updated by Dept. Contributor',
    time: '2 hrs ago',
  },
  {
    id: 2,
    text: 'Evidence uploaded for Metric 3.2.2 (Patent Filed)',
    time: '5 hrs ago',
  },
  {
    id: 3,
    text: 'Reviewer approved evidence for Metric 1.1.1',
    time: 'Yesterday',
  },
  {
    id: 4,
    text: 'Task assigned: C8 Innovation metrics to Mechanical Dept.',
    time: 'Yesterday',
  },
  {
    id: 5,
    text: 'AQAR draft generated for Cycle IV',
    time: '2 days ago',
  },
];

export const QUICK_REPORTS = [
  { id: 'ssr', name: 'SSR (Self Study Report)', status: 'Draft' },
  { id: 'aqar', name: 'AQAR (Annual Quality Assurance Report)', status: 'Ready' },
  { id: 'dvv', name: 'DVV Clarification Report', status: 'In Progress' },
  { id: 'criterion', name: 'Criterion-wise Report', status: 'Ready' },
];

export const EVIDENCE_ITEMS = [
  {
    id: 'e1',
    fileName: 'Student_Satisfaction_Survey_2025.pdf',
    metricCode: '2.1.2',
    criterion: 'C2',
    department: 'Information Technology',
    status: 'Approved',
    uploadedBy: 'Rahul Mehta',
    uploadedAt: '2026-09-08',
    version: 2,
  },
  {
    id: 'e2',
    fileName: 'Patent_Filing_Proof.pdf',
    metricCode: '3.2.2',
    criterion: 'C3',
    department: 'Research Cell',
    status: 'Under Review',
    uploadedBy: 'Meera Joshi',
    uploadedAt: '2026-09-09',
    version: 1,
  },
  {
    id: 'e3',
    fileName: 'Curriculum_BoS_Minutes.docx',
    metricCode: '1.1.1',
    criterion: 'C1',
    department: 'Academics',
    status: 'Rejected',
    uploadedBy: 'Anita Desai',
    uploadedAt: '2026-09-05',
    version: 3,
    rejectionComment: 'Please attach signed BoS attendance sheet.',
  },
  {
    id: 'e4',
    fileName: 'Library_Usage_Stats.xlsx',
    metricCode: '4.2.1',
    criterion: 'C4',
    department: 'Library',
    status: 'Draft',
    uploadedBy: 'Suresh Patil',
    uploadedAt: '2026-09-10',
    version: 1,
  },
  {
    id: 'e5',
    fileName: 'Alumni_Engagement_Report.pdf',
    metricCode: '5.3.1',
    criterion: 'C5',
    department: 'Computer Engineering',
    status: 'Submitted',
    uploadedBy: 'Priya Sharma',
    uploadedAt: '2026-09-07',
    version: 1,
  },
];

export const TASKS = [
  {
    id: 't1',
    title: 'Complete Metric 2.2.1 attendance data',
    assignee: 'Dept. Contributor',
    due: '2026-09-12',
    status: 'Overdue',
    criterion: 'C2',
    priority: 'High',
  },
  {
    id: 't2',
    title: 'Upload evidence for C3 patents',
    assignee: 'Research Cell',
    due: '2026-09-14',
    status: 'Due Today',
    criterion: 'C3',
    priority: 'Medium',
  },
  {
    id: 't3',
    title: 'Review C1 curriculum submissions',
    assignee: 'Reviewer',
    due: '2026-09-16',
    status: 'Open',
    criterion: 'C1',
    priority: 'Medium',
  },
  {
    id: 't4',
    title: 'Assign owners for C8 & C10 gaps',
    assignee: 'IQAC Coordinator',
    due: '2026-09-18',
    status: 'Open',
    criterion: 'C8',
    priority: 'High',
  },
];

export const REVIEW_QUEUE = [
  {
    id: 'r1',
    title: 'Metric 3.2.2 – Patent Filed',
    submittedBy: 'Meera Joshi',
    type: 'Evidence Review',
    status: 'Pending Review',
    version: 1,
    submittedAt: '2026-09-09',
  },
  {
    id: 'r2',
    title: 'Metric 1.1.2 – CBCS programmes',
    submittedBy: 'Anita Desai',
    type: 'Data Review',
    status: 'Pending Review',
    version: 2,
    submittedAt: '2026-09-08',
  },
  {
    id: 'r3',
    title: 'Criterion 6 – Governance pack',
    submittedBy: 'Nitin Rao',
    type: 'Final Sign-off',
    status: 'Awaiting Final Approval',
    version: 1,
    submittedAt: '2026-09-06',
  },
];

export const REPORTS = [
  { id: 'ssr', name: 'SSR (Self Study Report)', type: 'SSR', status: 'Draft', cycle: '2024-25', updatedAt: '2026-09-09' },
  { id: 'aqar', name: 'AQAR', type: 'AQAR', status: 'Ready', cycle: '2024-25', updatedAt: '2026-09-01' },
  { id: 'dvv', name: 'DVV Clarification Report', type: 'DVV', status: 'In Progress', cycle: '2024-25', updatedAt: '2026-09-07' },
  { id: 'c1', name: 'Criterion 1 Report', type: 'Criterion', status: 'Ready', cycle: '2024-25', updatedAt: '2026-08-28' },
  { id: 'c2', name: 'Criterion 2 Report', type: 'Criterion', status: 'Draft', cycle: '2024-25', updatedAt: '2026-09-05' },
];

export const NOTIFICATIONS = [
  { id: 'n1', type: 'assignment', title: 'New task assigned', body: 'Complete Metric 2.2.1 attendance data', time: '1h ago', read: false },
  { id: 'n2', type: 'review', title: 'Evidence approved', body: 'Student Satisfaction Survey was approved', time: '3h ago', read: false },
  { id: 'n3', type: 'deadline', title: 'Deadline tomorrow', body: 'C3 patent evidence due on 12 Sep', time: '5h ago', read: true },
  { id: 'n4', type: 'system', title: 'Cycle reminder', body: 'NAAC Cycle IV freeze in 14 days', time: '1d ago', read: true },
  { id: 'n5', type: 'review', title: 'Revision requested', body: 'BoS minutes need signed attendance', time: '2d ago', read: false },
];

export const DEPT_PROGRESS = [
  { id: 'd1', name: 'Information Technology', progress: 86, pendingEvidence: 4, contributors: 6 },
  { id: 'd2', name: 'Computer Engineering', progress: 78, pendingEvidence: 7, contributors: 8 },
  { id: 'd3', name: 'Electronics & Telecommunication', progress: 64, pendingEvidence: 11, contributors: 5 },
  { id: 'd4', name: 'Mechanical Engineering', progress: 55, pendingEvidence: 14, contributors: 7 },
  { id: 'd5', name: 'Civil Engineering', progress: 48, pendingEvidence: 16, contributors: 4 },
];
