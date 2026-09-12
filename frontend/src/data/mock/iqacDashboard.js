/**
 * Mock data for the NAAC Coordinator (IQAC) dashboard.
 * Replace with API responses when backend endpoints are ready.
 */

export const IQAC_INSTITUTION = {
  name: 'Autonomous Engineering Institute',
  aishe: 'C-24180',
  track: 'Autonomous',
  cycle: 'Cycle 3 (2026-27)',
  academicYear: '2026-27',
  expectedSubmission: 'December 2026',
  ssrTargetPercent: 85,
  ssrCurrentPercent: 78,
  preparationStatus: 'In Progress',
};

export const IQAC_STATS = [
  {
    id: 'overall',
    label: 'Overall Progress',
    value: '78%',
    delta: '+4.2%',
    deltaUp: true,
    hint: 'SSR target 85% by Oct',
    tone: 'primary',
  },
  {
    id: 'criteria',
    label: 'Criteria Completed',
    value: '2 / 7',
    badge: '2 Ready',
    hint: '5 in active progress',
    tone: 'success',
  },
  {
    id: 'evidence',
    label: 'Evidence Collected',
    value: '186 / 248',
    badge: '74.8%',
    hint: 'Compliance ready files',
    tone: 'info',
  },
  {
    id: 'reviews',
    label: 'Pending Reviews',
    value: '18',
    badge: 'Action Req',
    hint: 'Awaiting coordinator sign-off',
    tone: 'warning',
  },
  {
    id: 'attention',
    label: 'Needs Attention',
    value: '7',
    badge: 'Critical',
    hint: 'Action required immediately',
    tone: 'error',
  },
];

export const IQAC_CRITERIA_PROGRESS = [
  {
    id: 'c1',
    code: 'C1',
    name: 'Criterion I: Curricular Aspects',
    lead: 'Academics',
    evidenceCollected: 42,
    evidenceTotal: 45,
    percent: 92,
    status: 'Completed',
  },
  {
    id: 'c2',
    code: 'C2',
    name: 'Criterion II: Teaching-Learning & Evaluation',
    lead: 'Academics',
    evidenceCollected: 38,
    evidenceTotal: 52,
    percent: 68,
    status: 'In Progress',
  },
  {
    id: 'c3',
    code: 'C3',
    name: 'Criterion III: Research, Innovations & Extension',
    lead: 'Research Cell',
    evidenceCollected: 28,
    evidenceTotal: 40,
    percent: 63,
    status: 'Needs Attention',
  },
  {
    id: 'c4',
    code: 'C4',
    name: 'Criterion IV: Infrastructure & Learning Resources',
    lead: 'Infrastructure',
    evidenceCollected: 22,
    evidenceTotal: 30,
    percent: 75,
    status: 'In Progress',
  },
  {
    id: 'c5',
    code: 'C5',
    name: 'Criterion V: Student Support & Progression',
    lead: 'Student Affairs',
    evidenceCollected: 18,
    evidenceTotal: 28,
    percent: 55,
    status: 'Needs Correction',
  },
  {
    id: 'c6',
    code: 'C6',
    name: 'Criterion VI: Governance, Leadership & Management',
    lead: 'IQAC',
    evidenceCollected: 24,
    evidenceTotal: 30,
    percent: 80,
    status: 'In Progress',
  },
  {
    id: 'c7',
    code: 'C7',
    name: 'Criterion VII: Institutional Values & Best Practices',
    lead: 'IQAC',
    evidenceCollected: 14,
    evidenceTotal: 23,
    percent: 48,
    status: 'Needs Attention',
  },
];

export const IQAC_ATTENTION_ITEMS = [
  {
    id: 'a1',
    title: 'Criterion III: Research evidence pending verification',
    status: 'Needs Attention',
    actionLabel: 'Review',
    actionPath: '/app/reviews',
  },
  {
    id: 'a2',
    title: 'Criterion V: Student progression data needs correction',
    status: 'Needs Correction',
    actionLabel: 'Resolve',
    actionPath: '/app/criteria/c5',
  },
  {
    id: 'a3',
    title: 'Metric 2.2.1 attendance dossier awaiting sign-off',
    status: 'Pending',
    actionLabel: 'View',
    actionPath: '/app/tasks',
  },
  {
    id: 'a4',
    title: 'Criterion VII: Best practices evidence overdue',
    status: 'Critical',
    actionLabel: 'Review',
    actionPath: '/app/criteria/c7',
  },
];

export const IQAC_RECENT_SUBMISSIONS = [
  {
    id: 's1',
    title: 'Research Publication & Scopus',
    criterion: 'C3',
    department: 'Info Tech',
    status: 'Under Review',
    path: '/app/reviews',
  },
  {
    id: 's2',
    title: 'BoS Minutes & Curriculum Revision',
    criterion: 'C1',
    department: 'Academics',
    status: 'Submitted',
    path: '/app/evidence',
  },
  {
    id: 's3',
    title: 'Library Usage Statistics 2025-26',
    criterion: 'C4',
    department: 'Library',
    status: 'Under Review',
    path: '/app/reviews',
  },
  {
    id: 's4',
    title: 'Alumni Engagement Report',
    criterion: 'C5',
    department: 'Computer Engg',
    status: 'Draft',
    path: '/app/evidence',
  },
];
