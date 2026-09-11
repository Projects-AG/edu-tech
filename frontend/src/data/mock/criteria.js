export const CRITERIA = [
  {
    id: 'c1',
    code: 'C1',
    name: 'Curricular Aspects',
    percent: 85,
    obtained: 85,
    total: 100,
    inCharge: 'Dr. Anita Desai',
    indicators: [
      {
        id: 'ki-1-1',
        code: '1.1',
        name: 'Curriculum Design and Development',
        metrics: [
          {
            id: 'm-1-1-1',
            code: '1.1.1',
            name: 'Curricula developed and implemented',
            weightage: 20,
            status: 'Approved',
            description: 'Describe the curricula developed and implemented through relevant boards.',
            fields: [
              { key: 'programs', label: 'No. of programmes revised', type: 'number', value: 12 },
              { key: 'year', label: 'Academic Year', type: 'text', value: '2024-25' },
            ],
          },
          {
            id: 'm-1-1-2',
            code: '1.1.2',
            name: 'Percentage of programmes with CBCS / elective',
            weightage: 15,
            status: 'Under Review',
            description: 'Percentage of programmes where Choice Based Credit System is implemented.',
            fields: [
              { key: 'total_programs', label: 'Total programmes', type: 'number', value: 18 },
              { key: 'cbcs_programs', label: 'CBCS programmes', type: 'number', value: 15 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'c2',
    code: 'C2',
    name: 'Teaching-Learning & Evaluation',
    percent: 68,
    obtained: 238,
    total: 350,
    inCharge: 'Prof. Ramesh Kulkarni',
    indicators: [
      {
        id: 'ki-2-2',
        code: '2.2',
        name: 'Catering to Student Diversity',
        metrics: [
          {
            id: 'm-2-2-1',
            code: '2.2.1',
            name: 'Student Attendance data',
            weightage: 20,
            status: 'Pending',
            description: 'Provide student attendance and mentoring records.',
            fields: [
              { key: 'avg_attendance', label: 'Average attendance %', type: 'number', value: 86 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'c3',
    code: 'C3',
    name: 'Research, Innovations & Extension',
    percent: 63,
    obtained: 76,
    total: 120,
    inCharge: 'Dr. Meera Joshi',
    indicators: [
      {
        id: 'ki-3-2',
        code: '3.2',
        name: 'Resource Mobilization for Research',
        metrics: [
          {
            id: 'm-3-2-2',
            code: '3.2.2',
            name: 'Patent Filed',
            weightage: 10,
            status: 'Submitted',
            description: 'Number of patents filed / published / granted.',
            fields: [
              { key: 'filed', label: 'Patents filed', type: 'number', value: 4 },
              { key: 'granted', label: 'Patents granted', type: 'number', value: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'c4',
    code: 'C4',
    name: 'Infrastructure & Learning Resources',
    percent: 75,
    obtained: 75,
    total: 100,
    inCharge: 'Mr. Suresh Patil',
    indicators: [],
  },
  {
    id: 'c5',
    code: 'C5',
    name: 'Student Support & Progression',
    percent: 70,
    obtained: 91,
    total: 130,
    inCharge: 'Ms. Kavita Shah',
    indicators: [],
  },
  {
    id: 'c6',
    code: 'C6',
    name: 'Governance, Leadership & Management',
    percent: 80,
    obtained: 80,
    total: 100,
    inCharge: 'Dr. Nitin Rao',
    indicators: [],
  },
  {
    id: 'c7',
    code: 'C7',
    name: 'Institutional Values & Best Practices',
    percent: 82,
    obtained: 82,
    total: 100,
    inCharge: 'Prof. Sunita More',
    indicators: [],
  },
  {
    id: 'c8',
    code: 'C8',
    name: 'Innovation & Skill Development',
    percent: 60,
    obtained: 30,
    total: 50,
    inCharge: 'Dr. Ajay Pawar',
    indicators: [],
  },
  {
    id: 'c9',
    code: 'C9',
    name: 'Digital & NEP Initiatives',
    percent: 65,
    obtained: 33,
    total: 50,
    inCharge: 'Ms. Pooja Nair',
    indicators: [],
  },
  {
    id: 'c10',
    code: 'C10',
    name: 'Global Engagement & Collaboration',
    percent: 55,
    obtained: 28,
    total: 50,
    inCharge: 'Dr. Farhan Ali',
    indicators: [],
  },
];

export function getCriterion(id) {
  return CRITERIA.find((c) => c.id === id || c.code.toLowerCase() === id?.toLowerCase());
}

export function getMetric(metricId) {
  for (const c of CRITERIA) {
    for (const ki of c.indicators || []) {
      const metric = (ki.metrics || []).find((m) => m.id === metricId || m.code === metricId);
      if (metric) return { criterion: c, indicator: ki, metric };
    }
  }
  return null;
}
