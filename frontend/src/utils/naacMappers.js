/** Map backend snake_case NAAC API responses to frontend camelCase props. */

function mapDashboardStat(stat) {
  return {
    id: stat.id,
    label: stat.label,
    value: stat.value,
    delta: stat.delta ?? undefined,
    deltaUp: stat.delta_up ?? undefined,
    badge: stat.badge ?? undefined,
    hint: stat.hint,
    tone: stat.tone,
  };
}

function mapInstitution(inst) {
  return {
    name: inst.name,
    aishe: inst.aishe ?? '',
    track: inst.track ?? '',
    cycle: inst.cycle,
    academicYear: inst.academic_year ?? '',
    expectedSubmission: inst.expected_submission ?? '',
    ssrTargetPercent: inst.ssr_target_percent,
    ssrCurrentPercent: inst.ssr_current_percent,
    preparationStatus: inst.preparation_status,
  };
}

function mapCriteriaProgress(item) {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    lead: item.lead ?? '—',
    evidenceCollected: item.evidence_collected,
    evidenceTotal: item.evidence_total,
    percent: item.percent,
    status: item.status,
  };
}

function mapAttentionItem(item) {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    actionLabel: item.action_label,
    actionPath: item.action_path,
  };
}

function mapRecentSubmission(item) {
  return {
    id: item.id,
    title: item.title,
    criterion: item.criterion,
    department: item.department,
    status: item.status,
    path: item.path,
  };
}

function mapDepartment(dept) {
  return {
    id: dept.id,
    code: dept.code,
    name: dept.name,
    coordinator: dept.coordinator ?? '—',
    email: dept.email ?? '',
    progress: dept.progress,
    target: dept.target,
    status: dept.status,
    evidenceUploaded: dept.evidence_uploaded,
    evidenceTotal: dept.evidence_total,
    criteriaDone: dept.criteria_done,
    criteriaTotal: dept.criteria_total,
    submissionsDone: dept.submissions_done,
    submissionsTotal: dept.submissions_total,
    pendingTasks: dept.pending_tasks,
  };
}

function mapCriterionCard(item) {
  return {
    id: item.id,
    code: item.code,
    title: item.title,
    description: item.description ?? '',
    status: item.status,
    percent: item.percent,
    evidence: item.evidence,
    pending: item.pending,
    departments: item.departments,
    leadLabel: item.lead_label ?? undefined,
  };
}

export function mapEvidenceDocument(doc) {
  return {
    id: doc.id,
    name: doc.name,
    meta: doc.meta,
    type: doc.type,
    criterion: doc.criterion,
    department: doc.department,
    unit: doc.unit ?? '',
    uploadedBy: doc.uploaded_by,
    role: doc.role ?? '',
    uploadedAt: doc.uploaded_at,
    status: doc.status,
    metricCode: doc.metric_code ?? undefined,
    fileUploadId: doc.file_upload_id,
    cycleId: doc.cycle_id,
  };
}

export function mapSubmission(row) {
  return {
    id: row.id,
    title: row.title,
    criterion: row.criterion,
    department: row.department,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at ?? '—',
    updatedAt: row.updated_at,
    status: row.status,
    files: row.files,
    size: row.size,
    correctionNote: row.correction_note ?? undefined,
    correctionBy: row.correction_by ?? undefined,
    correctionAt: row.correction_at ?? undefined,
    refCode: row.ref_code ?? undefined,
    workflow: row.workflow ?? [],
    cycleId: row.cycle_id,
    criterionId: row.criterion_id,
    departmentId: row.department_id,
  };
}

function mapReviewQueueItem(row) {
  return {
    id: row.id,
    ref: row.ref,
    title: row.title,
    metric: row.metric,
    department: row.department,
    stage: row.stage,
    assignedTo: row.assigned_to ?? '—',
    status: row.status,
    criterion: row.criterion,
    description: row.description ?? '',
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at ?? '—',
    updatedAt: row.updated_at,
    alert: row.alert ?? undefined,
    alertAt: row.alert_at ?? undefined,
    workflow: row.workflow ?? [],
  };
}

export function mapCoordinatorDashboard(data) {
  return {
    cycleId: data.cycle_id,
    institution: mapInstitution(data.institution),
    stats: (data.stats ?? []).map(mapDashboardStat),
    criteriaProgress: (data.criteria_progress ?? []).map(mapCriteriaProgress),
    attentionItems: (data.attention_items ?? []).map(mapAttentionItem),
    recentSubmissions: (data.recent_submissions ?? []).map(mapRecentSubmission),
  };
}

export function mapCoordinatorDepartments(data) {
  return {
    stats: data.stats ?? [],
    departments: (data.departments ?? []).map(mapDepartment),
  };
}

export function mapCriteriaList(data) {
  return {
    stats: data.stats ?? [],
    items: (data.items ?? []).map(mapCriterionCard),
  };
}

export function mapEvidenceList(data) {
  return {
    stats: data.stats ?? [],
    documents: (data.documents ?? []).map(mapEvidenceDocument),
  };
}

export function mapSubmissionList(data) {
  return {
    stats: data.stats ?? [],
    submissions: (data.submissions ?? []).map(mapSubmission),
  };
}

export function mapReviewList(data) {
  return {
    stats: data.stats ?? [],
    queue: (data.queue ?? []).map(mapReviewQueueItem),
  };
}

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
  return fallback;
}
