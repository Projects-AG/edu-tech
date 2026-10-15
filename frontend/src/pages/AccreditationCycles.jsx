import React, { useEffect, useMemo, useState } from "react";
import { Award, Plus, Save } from "lucide-react";

import PageHeader from "../components/common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { ROLES, normalizeRole } from "../config/roles";
import accreditationCycleService from "../services/accreditationCycleService";
import {
  FRAMEWORK_REQUIRED_MESSAGE,
  LIVE_CYCLE_STATUSES,
  PRODUCTION_STATUSES,
  buildCycleCreatePayload,
  cycleStatusesForFramework,
  cycleStatusesForLiveConstraint,
  eligibleFrameworksForCycle,
  institutionHasOtherLiveCycle,
  noEligibleFrameworkReason,
} from "../services/cycleCreatePayload";
import {
  NAAC_REQUIRED_OPTIONAL_UNVERIFIED,
  buildOfficialApplicabilityItems,
  groupOfficialOperationalMetrics,
  metricApplicabilityLabel,
} from "../services/cycleApplicabilityPayload";
import criteriaService from "../services/criteriaService";
import frameworkService from "../services/frameworkService";
import {
  frameworkOptionLabel,
  frameworkReadinessText,
} from "../services/frameworkReadiness";
import institutionService from "../services/institutionService";

const CYCLE_STATUSES = [
  "Draft",
  "Active",
  "In Progress",
  "Completed",
  "Archived",
];

const fieldStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  fontSize: "13px",
};

const panelStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "20px",
};

const groupCatalogMetrics = (criteria, sections, metrics) => {
  const sectionsById = Object.fromEntries(
    (sections || []).map((section) => [section.id, section])
  );
  const criteriaById = Object.fromEntries(
    (criteria || []).map((criterion) => [criterion.id, criterion])
  );
  const groups = {};

  (metrics || []).forEach((metric) => {
    const section = sectionsById[metric.section_id];
    const criterion = section ? criteriaById[section.criterion_id] : null;
    // GET /criteria is cycle-scoped progress, so criteria without applicable
    // metrics are absent; fall back to the section's own criterion link.
    const criterionId = criterion?.id || section?.criterion_id || 0;
    const sectionPrefix = String(section?.code || "").split(".")[0];
    if (!groups[criterionId]) {
      groups[criterionId] = {
        id: criterionId,
        number:
          criterion?.number ||
          (section && sectionPrefix ? `C${sectionPrefix}` : "Unmapped"),
        title: criterion?.title || (section ? "" : "Unmapped metrics"),
        metrics: [],
      };
    }
    groups[criterionId].metrics.push(metric);
  });

  return Object.values(groups).sort((a, b) =>
    String(a.number).localeCompare(String(b.number), undefined, {
      numeric: true,
    })
  );
};

export const AccreditationCycles = () => {
  const { user, activeRole } = useAuth();
  const role = normalizeRole(activeRole || user?.role);
  const canManage = [ROLES.NAAC_COORDINATOR, ROLES.ADMIN].includes(role);

  const [cycles, setCycles] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [catalogGroups, setCatalogGroups] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [applicability, setApplicability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [configSelections, setConfigSelections] = useState({});
  const [exceptionNotes, setExceptionNotes] = useState({});
  const [frameworks, setFrameworks] = useState([]);
  const [myInstitution, setMyInstitution] = useState(null);
  const [form, setForm] = useState({
    institution_id: user?.institution_id || "",
    name: "",
    code: "",
    academic_period: "",
    description: "",
    status: "Draft",
    framework_id: "",
  });

  const selectedCycle = useMemo(
    () => cycles.find((cycle) => cycle.id === selectedId) || null,
    [cycles, selectedId]
  );
  const isOfficialFramework = Boolean(
    selectedCycle?.framework_code &&
      selectedCycle.framework_code !== "EDUVERSE_INTERNAL_WORKING_CATALOG"
  );
  const officialCatalogueIncomplete = Boolean(
    isOfficialFramework &&
      (selectedCycle?.metric_catalogue_complete === false ||
        applicability?.has_official_operational_metrics === false)
  );
  const productionStatusesBlocked = Boolean(
    isOfficialFramework && selectedCycle?.allows_production_cycles === false
  );
  const canConfigureOfficial = Boolean(
    canManage &&
      isOfficialFramework &&
      applicability?.has_official_operational_metrics
  );
  const canConfigureWorking = Boolean(
    canManage && !isOfficialFramework && !officialCatalogueIncomplete
  );
  const selectedInstitution = useMemo(() => {
    if (role === ROLES.ADMIN) {
      return (
        institutions.find(
          (item) => String(item.id) === String(form.institution_id)
        ) || null
      );
    }
    return myInstitution;
  }, [form.institution_id, institutions, myInstitution, role]);
  const eligibleFrameworkId =
    selectedInstitution?.eligible_cycle_framework_id || null;
  const eligibleFrameworks = useMemo(
    () => eligibleFrameworksForCycle(frameworks, eligibleFrameworkId),
    [eligibleFrameworkId, frameworks]
  );
  const selectedFramework = useMemo(
    () =>
      eligibleFrameworks.find(
        (item) => String(item.id) === String(form.framework_id)
      ) || null,
    [eligibleFrameworks, form.framework_id]
  );
  const hasOtherLiveCycleForCreate = useMemo(
    () =>
      institutionHasOtherLiveCycle(
        cycles,
        form.institution_id || user?.institution_id
      ),
    [cycles, form.institution_id, user?.institution_id]
  );
  const hasOtherLiveCycleForSelected = useMemo(
    () =>
      institutionHasOtherLiveCycle(
        cycles,
        selectedCycle?.institution_id,
        selectedCycle?.id
      ),
    [cycles, selectedCycle]
  );
  const createStatuses = useMemo(
    () =>
      cycleStatusesForLiveConstraint(
        cycleStatusesForFramework(CYCLE_STATUSES, selectedFramework),
        hasOtherLiveCycleForCreate
      ),
    [hasOtherLiveCycleForCreate, selectedFramework]
  );

  const loadCycles = async () => {
    const data = await accreditationCycleService.getCycles();
    setCycles(data);
    return data;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [cycleData, criteria, sections, metrics] = await Promise.all([
          accreditationCycleService.getCycles(),
          criteriaService.getCriteria(),
          criteriaService.getSections(),
          criteriaService.getMetrics(),
        ]);
        setCycles(cycleData);
        setCatalogGroups(groupCatalogMetrics(criteria, sections, metrics));
        if (canManage) {
          try {
            const rows = await frameworkService.listFrameworks();
            setFrameworks(rows);
          } catch (frameworkErr) {
            setFrameworks([]);
            setError(
              frameworkErr?.response?.data?.detail ||
                frameworkErr?.message ||
                "Unable to load NAAC frameworks for cycle creation."
            );
          }
        }
        if (role === ROLES.ADMIN) {
          const inst = await institutionService.getInstitutions();
          setInstitutions(inst);
        } else if (canManage) {
          try {
            const mine = await institutionService.getMyInstitution();
            setMyInstitution(mine);
          } catch {
            setMyInstitution(null);
          }
        }
        if (cycleData.length > 0) {
          setSelectedId(cycleData[0].id);
        }
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Unable to load accreditation cycles."
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role]);

  useEffect(() => {
    const loadApplicability = async () => {
      if (!selectedId) {
        setApplicability(null);
        setConfigSelections({});
        return;
      }
      try {
        const data = await accreditationCycleService.getApplicableMetrics(
          selectedId
        );
        setApplicability(data);
        const next = {};
        (data.applicable_metrics || []).forEach((item) => {
          next[item.metric_id] = {
            selected: true,
            required: item.required !== false,
          };
        });
        setConfigSelections(next);
        const notes = {};
        (data.applicable_metrics || []).forEach((item) => {
          if (item.justification) {
            notes[item.metric_id] = item.justification;
          }
        });
        setExceptionNotes(notes);
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
            "Unable to load applicable metrics."
        );
      }
    };
    loadApplicability();
  }, [selectedId]);

  useEffect(() => {
    if (
      form.framework_id &&
      !eligibleFrameworks.some(
        (item) => String(item.id) === String(form.framework_id)
      )
    ) {
      setForm((prev) => ({ ...prev, framework_id: "", status: "Draft" }));
    }
  }, [eligibleFrameworks, form.framework_id]);

  useEffect(() => {
    if (form.status && !createStatuses.includes(form.status)) {
      setForm((prev) => ({ ...prev, status: "Draft" }));
    }
  }, [createStatuses, form.status]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!canManage) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = buildCycleCreatePayload({
        form,
        user,
        frameworkId: form.framework_id,
      });
      const created = await accreditationCycleService.createCycle(payload);
      const refreshed = await loadCycles();
      setSelectedId(created.id);
      setShowCreate(false);
      setForm({
        institution_id: user?.institution_id || "",
        name: "",
        code: "",
        academic_period: "",
        description: "",
        status: "Draft",
        framework_id: "",
      });
      setMessage(
        created.framework_name
          ? `Cycle "${created.name}" created on ${created.framework_name} (${created.framework_version}). Review permitted applicability next.`
          : `Cycle "${created.name}" created. Configure applicable metrics next.`
      );
      if (!refreshed.find((item) => item.id === created.id)) {
        setCycles((prev) => [created, ...prev]);
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to create the accreditation cycle."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (!canManage || !selectedCycle) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      const updated = await accreditationCycleService.updateCycle(
        selectedCycle.id,
        { status }
      );
      setCycles((prev) =>
        prev.map((cycle) => (cycle.id === updated.id ? updated : cycle))
      );
      setMessage(`Cycle status updated to ${updated.status}.`);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to update cycle status."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleMetric = (metricId) => {
    setConfigSelections((prev) => {
      const current = prev[metricId];
      if (current?.selected) {
        return {
          ...prev,
          [metricId]: { selected: false, required: true },
        };
      }
      return {
        ...prev,
        [metricId]: { selected: true, required: current?.required !== false },
      };
    });
  };

  const toggleRequired = (metricId) => {
    setConfigSelections((prev) => {
      const current = prev[metricId] || { selected: true, required: true };
      return {
        ...prev,
        [metricId]: {
          selected: true,
          required: !current.required,
        },
      };
    });
  };

  const handleSaveApplicability = async () => {
    if (!canManage || !selectedCycle) {
      return;
    }
    const metrics = canConfigureOfficial
      ? buildOfficialApplicabilityItems(
          Object.entries(configSelections)
            .filter(([, value]) => value.selected)
            .map(([metricId]) => metricId)
        )
      : Object.entries(configSelections).map(([metricId, value]) => {
          const id = Number(metricId);
          if (value.selected && value.required !== false) {
            return { metric_id: id, required: true };
          }
          const justification = (exceptionNotes[id] || "").trim();
          return {
            metric_id: id,
            required: false,
            exception_type: value.selected ? "OPTIONAL_OVERRIDE" : "EXCLUDED",
            justification,
          };
        });
    try {
      setSaving(true);
      setError("");
      const data = await accreditationCycleService.replaceApplicableMetrics(
        selectedCycle.id,
        metrics
      );
      setApplicability(data);
      setMessage(
        data.configured
          ? "Applicable metrics saved."
          : "Applicability cleared. Progress will use the global catalog until metrics are configured."
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to save applicable metrics."
      );
    } finally {
      setSaving(false);
    }
  };

  const visibleCatalogGroups = useMemo(() => {
    if (!applicability?.uses_seven_criteria) {
      return catalogGroups;
    }
    const allowed = new Set(["C1", "C2", "C3", "C4", "C5", "C6", "C7"]);
    return catalogGroups.filter((group) => allowed.has(String(group.number)));
  }, [applicability, catalogGroups]);

  const officialCatalogGroups = useMemo(
    () =>
      groupOfficialOperationalMetrics(
        applicability?.official_operational_metrics || []
      ),
    [applicability]
  );

  const groupedApplicable = useMemo(() => {
    const groups = {};
    (applicability?.applicable_metrics || []).forEach((item) => {
      const key = item.criterion_id || 0;
      if (!groups[key]) {
        groups[key] = {
          number: item.criterion_number || "Unmapped",
          title: item.criterion_title || "Unmapped metrics",
          metrics: [],
        };
      }
      groups[key].metrics.push(item);
    });
    return Object.values(groups);
  }, [applicability]);

  return (
    <div style={{ color: "#1e293b" }}>
      <PageHeader
        eyebrow="ACCREDITATION"
        title="Accreditation Cycles"
        description="Create, activate, and configure the metrics that apply to the current NAAC cycle."
        primaryAction={
          canManage
            ? {
                label: showCreate ? "Close form" : "Create Cycle",
                icon: Plus,
                onClick: () => setShowCreate((value) => !value),
              }
            : undefined
        }
      />

      {error ? (
        <div style={{ color: "#b91c1c", marginBottom: "12px", fontSize: "13px" }}>
          {error}
        </div>
      ) : null}
      {message ? (
        <div style={{ color: "#166534", marginBottom: "12px", fontSize: "13px" }}>
          {message}
        </div>
      ) : null}

      {showCreate && canManage ? (
        <form onSubmit={handleCreate} className="panel" style={{ ...panelStyle, marginBottom: "16px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "15px" }}>Create cycle</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            {role === ROLES.ADMIN ? (
              <label>
                Institution
                <select
                  required
                  value={form.institution_id}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, institution_id: event.target.value }))
                  }
                  style={fieldStyle}
                >
                  <option value="">Select institution</option>
                  {institutions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Institution
                <input
                  readOnly
                  value={user?.institution_name || `Institution #${user?.institution_id || ""}`}
                  style={{ ...fieldStyle, background: "#f8fafc" }}
                />
              </label>
            )}
            <label>
              Cycle Name
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                style={fieldStyle}
              />
            </label>
            <label>
              Code
              <input
                required
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value }))
                }
                style={fieldStyle}
              />
            </label>
            <label>
              Academic Period
              <input
                value={form.academic_period}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, academic_period: event.target.value }))
                }
                placeholder="2026-2031"
                style={fieldStyle}
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value }))
                }
                style={fieldStyle}
              >
                {createStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              NAAC Framework
              <select
                required
                value={form.framework_id}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    framework_id: event.target.value,
                    status: "Draft",
                  }))
                }
                style={fieldStyle}
              >
                <option value="">Select framework</option>
                {eligibleFrameworks.map((item) => (
                  <option key={item.id} value={item.id}>
                    {frameworkOptionLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {eligibleFrameworks.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#b91c1c", margin: "8px 0 0" }}>
              No verified NAAC framework matches this institution.
              INTERNAL is not assigned automatically.{" "}
              {noEligibleFrameworkReason(selectedInstitution)}
            </p>
          ) : (
            <p style={{ fontSize: "12px", color: "#9a3412", margin: "8px 0 0" }}>
              {FRAMEWORK_REQUIRED_MESSAGE} Draft is the default. Active / In
              Progress / Completed stay blocked until the selected framework
              allows production cycles.
            </p>
          )}
          {selectedFramework ? (
            <p style={{ fontSize: "13px", color: "#1e3a8a", margin: "8px 0 0" }}>
              Selected: {selectedFramework.name} (version{" "}
              {selectedFramework.version}).{" "}
              {frameworkReadinessText(selectedFramework)}
            </p>
          ) : null}
          <label style={{ display: "block", marginTop: "12px" }}>
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
              style={fieldStyle}
            />
          </label>
          <button
            type="submit"
            disabled={
              saving ||
              !form.framework_id ||
              eligibleFrameworks.length === 0
            }
            style={{
              marginTop: "12px",
              border: "none",
              background: "#2563eb",
              color: "#fff",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {saving ? "Creating..." : "Create Cycle"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <div className="panel" style={panelStyle}>Loading accreditation cycles...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 320px) 1fr", gap: "16px" }}>
          <div className="panel" style={panelStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>Cycles</h3>
            {cycles.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: "13px" }}>
                No accreditation cycles yet.
              </div>
            ) : (
              cycles.map((cycle) => (
                <button
                  key={cycle.id}
                  type="button"
                  onClick={() => setSelectedId(cycle.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    marginBottom: "8px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border:
                      cycle.id === selectedId
                        ? "1px solid #2563eb"
                        : "1px solid #e2e8f0",
                    background: cycle.id === selectedId ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{cycle.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {cycle.code} · {cycle.status}
                    {cycle.academic_period ? ` · ${cycle.academic_period}` : ""}
                  </div>
                  <div style={{ fontSize: "12px", color: cycle.framework_name ? "#1e3a8a" : "#92400e" }}>
                    {cycle.framework_name
                      ? `${cycle.framework_name} (${cycle.framework_version})`
                      : "No framework bound (legacy)"}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="panel" style={panelStyle}>
            {!selectedCycle ? (
              <div style={{ color: "#64748b" }}>Select a cycle to view details.</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <div className="welcome-eyebrow" style={{ color: "#64748b" }}>
                      <Award size={14} style={{ marginRight: "6px" }} />
                      Cycle detail
                    </div>
                    <h3 style={{ margin: "4px 0" }}>{selectedCycle.name}</h3>
                    <div style={{ color: "#64748b", fontSize: "13px" }}>
                      {selectedCycle.code}
                      {selectedCycle.academic_period
                        ? ` · ${selectedCycle.academic_period}`
                        : ""}
                    </div>
                    {selectedCycle.description ? (
                      <p style={{ fontSize: "13px" }}>{selectedCycle.description}</p>
                    ) : null}
                    {selectedCycle.framework_name ? (
                      <p style={{ fontSize: "13px", color: "#1e3a8a" }}>
                        Framework: {selectedCycle.framework_name} (version{" "}
                        {selectedCycle.framework_version}
                        {selectedCycle.catalog_kind
                          ? ` · ${selectedCycle.catalog_kind}`
                          : ""}
                        {selectedCycle.official_operational_metric_count
                          ? ` · ${selectedCycle.official_operational_metric_count} official metrics`
                          : ""}
                        )
                      </p>
                    ) : (
                      <p style={{ fontSize: "12px", color: "#92400e" }}>
                        This existing cycle has no stored framework version.
                        New cycles require an explicit eligible framework;
                        INTERNAL is not assigned automatically.
                      </p>
                    )}
                    {selectedCycle.metric_catalogue_complete === false ? (
                      <p style={{ fontSize: "12px", color: "#9a3412" }}>
                        Criterion structure can be shown, but the official metric
                        catalogue is incomplete. Metrics are not treated as
                        required, and this cycle cannot be activated as a
                        production NAAC cycle until official metric rows are
                        imported.
                      </p>
                    ) : null}
                  </div>
                  {hasOtherLiveCycleForSelected ? (
                    <p style={{ fontSize: "12px", color: "#9a3412", margin: "0 0 8px" }}>
                      Another Active or In Progress cycle already exists for this
                      institution. Activating this cycle is blocked until that
                      live cycle is completed or archived. Existing cycles are
                      not changed automatically.
                    </p>
                  ) : null}
                  <label>
                    Status
                    <select
                      value={selectedCycle.status}
                      disabled={!canManage || saving}
                      onChange={(event) => handleStatusChange(event.target.value)}
                      style={fieldStyle}
                    >
                      {CYCLE_STATUSES.map((status) => (
                        <option
                          key={status}
                          value={status}
                          disabled={
                            (productionStatusesBlocked &&
                              PRODUCTION_STATUSES.includes(status)) ||
                            (hasOtherLiveCycleForSelected &&
                              LIVE_CYCLE_STATUSES.includes(status) &&
                              status !== selectedCycle.status)
                          }
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div
                  style={{
                    margin: "16px 0",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: applicability?.configured ? "#ecfdf3" : "#fff7ed",
                    color: applicability?.configured ? "#166534" : "#9a3412",
                    fontSize: "13px",
                  }}
                >
                  {applicability?.configured
                    ? `Configured: ${applicability.applicable_metric_count || groupedApplicable.reduce((sum, group) => sum + group.metrics.length, 0)} metric(s) included for this cycle. Unselected official metrics are not treated as applicable.`
                    : officialCatalogueIncomplete
                      ? "Official metric catalogue is incomplete. The working catalog is not treated as this framework's required SSR metrics."
                      : isOfficialFramework
                        ? "Unconfigured: official metrics are listed for configuration only and are not treated as applicable until included."
                        : "Unconfigured: progress uses the global metric catalog until applicable metrics are saved."}
                </div>

                <h4 style={{ margin: "0 0 8px" }}>
                  {applicability?.uses_seven_criteria
                    ? "Official seven criteria for this framework"
                    : "Applicable criteria"}
                </h4>
                {((applicability?.framework_criteria || []).length
                  ? applicability.framework_criteria
                  : applicability?.applicable_criteria || []
                ).length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: "13px" }}>
                    No applicable criteria until metrics are configured.
                  </p>
                ) : (
                  <p style={{ fontSize: "13px" }}>
                    {(
                      (applicability.framework_criteria || []).length
                        ? applicability.framework_criteria
                        : applicability.applicable_criteria
                    )
                      .map((item) => `${item.number} — ${item.title}`)
                      .join(" · ")}
                  </p>
                )}

                <h4 style={{ margin: "16px 0 8px" }}>Current applicable metrics</h4>
                {groupedApplicable.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: "13px" }}>
                    No mappings saved.
                  </p>
                ) : (
                  groupedApplicable.map((group) => (
                    <div key={group.number} style={{ marginBottom: "12px" }}>
                      <strong>
                        {group.number} {group.title ? `— ${group.title}` : ""}
                      </strong>
                      <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "13px" }}>
                        {group.metrics.map((item) => (
                          <li key={item.metric_id}>
                            {item.metric_code} —{" "}
                            {metricApplicabilityLabel(item, applicability)}
                            {item.metric_title ? ` · ${item.metric_title}` : ""}
                            {item.metric_kind
                              ? ` · ${item.metric_kind}`
                              : item.catalog_kind === "OFFICIAL"
                                ? ""
                                : item.metric_type
                                  ? ` · ${item.metric_type}`
                                  : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}

                {canManage && officialCatalogueIncomplete ? (
                  <p style={{ color: "#9a3412", fontSize: "12px", marginTop: "16px" }}>
                    Working-catalogue metrics cannot be saved as the official
                    required set until verified metric rows are imported from
                    the matching NAAC manual.
                  </p>
                ) : null}

                {canConfigureOfficial ? (
                  <>
                    <h4 style={{ margin: "20px 0 8px" }}>
                      Configure official operational metrics
                    </h4>
                    <p style={{ color: "#64748b", fontSize: "12px" }}>
                      {NAAC_REQUIRED_OPTIONAL_UNVERIFIED} Include a metric to
                      make it applicable to this cycle. Unchecked metrics stay
                      unconfigured, not not-applicable.
                    </p>
                    {officialCatalogGroups.map((group) => (
                      <div key={group.id} style={{ marginBottom: "14px" }}>
                        <strong>
                          {group.number} — {group.title}
                        </strong>
                        {group.metrics.map((metric) => {
                          const state = configSelections[metric.metric_id] || {
                            selected: false,
                            required: false,
                          };
                          return (
                            <div
                              key={metric.metric_id}
                              style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center",
                                fontSize: "13px",
                                marginTop: "6px",
                              }}
                            >
                              <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(state.selected)}
                                  onChange={() => toggleMetric(metric.metric_id)}
                                />
                                {metric.metric_code} — {metric.metric_title}
                                {metric.metric_kind ? ` · ${metric.metric_kind}` : ""}
                                {metric.weightage != null
                                  ? ` · wt ${metric.weightage}`
                                  : ""}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleSaveApplicability}
                      disabled={saving}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        border: "none",
                        background: "#0f766e",
                        color: "#fff",
                        borderRadius: "8px",
                        padding: "8px 14px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Save size={16} />
                      {saving ? "Saving..." : "Save applicable metrics"}
                    </button>
                  </>
                ) : null}

                {canConfigureWorking ? (
                  <>
                    <h4 style={{ margin: "20px 0 8px" }}>Configure from metric catalog</h4>
                    <p style={{ color: "#64748b", fontSize: "12px" }}>
                      Select metrics from the live catalog. Do not hard-code the list.
                    </p>
                    {visibleCatalogGroups.map((group) => (
                      <div key={group.id} style={{ marginBottom: "14px" }}>
                        <strong>
                          {group.title ? `${group.number} — ${group.title}` : group.number}
                        </strong>
                        {group.metrics.map((metric) => {
                          const state = configSelections[metric.id] || {
                            selected: false,
                            required: true,
                          };
                          return (
                            <div
                              key={metric.id}
                              style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center",
                                fontSize: "13px",
                                marginTop: "6px",
                              }}
                            >
                              <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(state.selected)}
                                  onChange={() => toggleMetric(metric.id)}
                                />
                                {metric.code} — {metric.title}
                              </label>
                              {state.selected ? (
                                <button
                                  type="button"
                                  onClick={() => toggleRequired(metric.id)}
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    background: state.required ? "#dcfce7" : "#f8fafc",
                                    borderRadius: "999px",
                                    padding: "2px 8px",
                                    cursor: "pointer",
                                  }}
                                >
                                  {state.required ? "Required" : "Optional"}
                                </button>
                              ) : null}
                              {(!state.selected || state.required === false) &&
                              configSelections[metric.id] ? (
                                <input
                                  type="text"
                                  placeholder="Exception justification (required)"
                                  value={exceptionNotes[metric.id] || ""}
                                  onChange={(event) =>
                                    setExceptionNotes((prev) => ({
                                      ...prev,
                                      [metric.id]: event.target.value,
                                    }))
                                  }
                                  style={{ ...fieldStyle, minWidth: "220px" }}
                                />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleSaveApplicability}
                      disabled={saving}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        border: "none",
                        background: "#0f766e",
                        color: "#fff",
                        borderRadius: "8px",
                        padding: "8px 14px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Save size={16} />
                      {saving ? "Saving..." : "Save applicable metrics"}
                    </button>
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccreditationCycles;
