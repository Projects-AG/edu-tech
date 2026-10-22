import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import criteriaService from "../services/criteriaService";
import accreditationCycleService, {
  pickActiveCycle,
} from "../services/accreditationCycleService";

import DataTable from "../components/common/DataTable";
import PageHeader from "../components/common/PageHeader";

import { useAuth } from "../context/AuthContext";
import {
  ROLES,
  normalizeRole,
} from "../config/roles";

// ============================================================
// CRITERIA PAGE
// ============================================================

const Criteria = () => {
  const navigate = useNavigate();

  const { user } = useAuth();

  const [criteria, setCriteria] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [cyclesLoaded, setCyclesLoaded] = useState(false);
  const [cycleLoadFailed, setCycleLoadFailed] = useState(false);
  const [cycleReloadToken, setCycleReloadToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // ROLE
  // ==========================================================

  const normalizedRole = normalizeRole(
    user?.role
  );

  const isDeptCoordinator =
    normalizedRole === ROLES.DEPT_COORDINATOR;

  const isNaacCoordinator =
    normalizedRole === ROLES.NAAC_COORDINATOR;

  const isAdmin =
    normalizedRole === ROLES.ADMIN;

  // ==========================================================
  // LOAD CRITERIA
  // ==========================================================

  const loadCriteria = useCallback(async (cycleId) => {
    try {
      setLoading(true);
      setError("");

      const response = await criteriaService.getCriteria(cycleId);
      if (!Array.isArray(response)) {
        throw new Error("The criteria API returned an invalid response.");
      }
      const backendCriteria = response;
      const formattedCriteria = backendCriteria.map((item) => ({
        id: item.framework_criterion_id ?? item.id,
        operationalCriterionId: item.operational_criterion_id ?? null,
        canViewCriterion: item.framework_criterion_id
          ? Boolean(item.operational_criterion_id)
          : true,
        number: item.number || item.code || "-",
        title: item.title || "Untitled criterion",
        score: item.weightage ?? null,
        maxScore: item.max_score ?? item.maxScore ?? item.weightage ?? null,
        status: item.status || "Not Started",
        weighted: Number(item.completion_percentage ?? 0),
        totalSubmissions: item.total_submissions ?? 0,
        approvedSubmissions: item.approved_submissions ?? 0,
        totalEvidence: item.total_evidence ?? 0,
        original: item,
      }));

      setCriteria(formattedCriteria);
    } catch (err) {
      console.error(
        "CRITERIA LOAD ERROR:",
        err?.response?.data || err
      );
      setCriteria([]);
      setError(
        err?.response?.data?.detail ||
          "Unable to load NAAC criteria."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadCycles = async () => {
      setCyclesLoaded(false);
      setCycleLoadFailed(false);
      setLoading(true);
      setError("");
      try {
        const response = await accreditationCycleService.getCycles();
        if (cancelled) return;
        setCycles(response);
        const activeCycle = pickActiveCycle(response);
        setSelectedCycleId(activeCycle ? String(activeCycle.id) : "");
        setCyclesLoaded(true);
      } catch (err) {
        if (cancelled) return;
        console.error(
          "ACCREDITATION CYCLES LOAD ERROR:",
          err?.response?.data || err
        );
        setCycles([]);
        setSelectedCycleId("");
        setCycleLoadFailed(true);
        setCyclesLoaded(true);
        setError(
          err?.response?.data?.detail ||
            "Unable to load accreditation cycles."
        );
        setLoading(false);
      }
    };
    loadCycles();
    return () => {
      cancelled = true;
    };
  }, [user?.institution_id, cycleReloadToken]);

  useEffect(() => {
    if (!cyclesLoaded) return;
    if (!selectedCycleId) {
      setCriteria([]);
      if (!cycleLoadFailed) setError("");
      setLoading(false);
      return;
    }
    loadCriteria(Number(selectedCycleId));
  }, [cyclesLoaded, selectedCycleId, cycleLoadFailed, loadCriteria]);

  // ==========================================================
  // OPEN CRITERION
  // ==========================================================

  const handleViewCriterion = (
    criterionId
  ) => {
    if (!criterionId) {
      return;
    }

    navigate(
      `/criteria/${criterionId}?cycle_id=${selectedCycleId}`
    );
  };

  // ==========================================================
  // TABLE COLUMNS
  // ==========================================================

  const columns = [
    {
      title: "Criterion",
      dataIndex: "number",

      render: (value) => (
        <strong
          style={{
            color: "#2563eb",
          }}
        >
          {value}
        </strong>
      ),
    },

    {
      title: "Title",
      dataIndex: "title",

      render: (value) => (
        <span
          style={{
            fontWeight: 600,
            color: "#1e293b",
          }}
        >
          {value}
        </span>
      ),
    },

    {
      title: "Score Points",
      dataIndex: "score",

      render: (
        value,
        row
      ) => (
        <span>
          {value ?? "-"} /{" "}
          {row.maxScore ?? "-"}
        </span>
      ),
    },

    {
      title: "Status",
      dataIndex: "status",

      render: (value) => {
        const styles = {
          Complete: {
            background: "#dcfce7",
            color: "#166534",
            border: "#bbf7d0",
          },

          "In Progress": {
            background: "#fef3c7",
            color: "#92400e",
            border: "#fde68a",
          },

          "Not Started": {
            background: "#f1f5f9",
            color: "#475569",
            border: "#cbd5e1",
          },
        };

        const style =
          styles[value] ||
          styles["Not Started"];

        return (
          <span
            style={{
              display: "inline-block",
              padding:
                "5px 10px",
              borderRadius:
                "999px",
              fontSize: "12px",
              fontWeight: 700,
              background:
                style.background,
              color:
                style.color,
              border:
                `1px solid ${style.border}`,
            }}
          >
            {value}
          </span>
        );
      },
    },

    {
      title: "Completion",
      dataIndex: "weighted",

      render: (value) => {
        const percentage =
          Math.min(
            100,
            Math.max(
              0,
              Number(value || 0)
            )
          );

        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "90px",
                height: "7px",
                background:
                  "#e2e8f0",
                borderRadius:
                  "999px",
                overflow:
                  "hidden",
              }}
            >
              <div
                style={{
                  width:
                    `${percentage}%`,
                  height: "100%",
                  background:
                    "#2563eb",
                  borderRadius:
                    "999px",
                }}
              />
            </div>

            <strong>
              {percentage}%
            </strong>
          </div>
        );
      },
    },

    {
      title: "Action",

      render: (
        _,
        row
      ) => (
        <button
          type="button"
          disabled={!row.canViewCriterion}
          onClick={() =>
            handleViewCriterion(
              row.operationalCriterionId || (row.canViewCriterion ? row.id : null)
            )
          }
          style={{
            border:
              "1px solid #bfdbfe",
            background: row.canViewCriterion ? "#eff6ff" : "#f1f5f9",
            color: row.canViewCriterion ? "#2563eb" : "#94a3b8",
            borderRadius:
              "7px",
            padding:
              "7px 13px",
            cursor: row.canViewCriterion ? "pointer" : "not-allowed",
            fontWeight:
              600,
          }}
        >
          {row.canViewCriterion ? "View →" : "Unavailable"}
        </button>
      ),
    },
  ];

  // ==========================================================
  // DESCRIPTION
  // ==========================================================

  const description =
    isDeptCoordinator
      ? "Select a criterion from the current list to view its metrics and upload the required evidence."
      : "Manage and track metrics across criteria available for your institution and accreditation cycle.";

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div
        style={{
          color: "#1e293b",
        }}
      >
        <PageHeader
          eyebrow="NAAC FRAMEWORK"
          title="NAAC Criteria"
          description={description}
        />

        <div
          style={{
            padding: "25px",
            background:
              "#fef2f2",
            border:
              "1px solid #fecaca",
            borderRadius:
              "10px",
            color:
              "#991b1b",
          }}
        >
          {error}
          <div>
            <button
              type="button"
              onClick={() =>
                cycleLoadFailed
                  ? setCycleReloadToken((token) => token + 1)
                  : loadCriteria(Number(selectedCycleId))
              }
              style={{
                marginTop: "12px",
                padding: "8px 14px",
                border: "1px solid #fecaca",
                borderRadius: "7px",
                background: "#ffffff",
                color: "#991b1b",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN
  // ==========================================================

  return (
    <div
      style={{
        color: "#1e293b",
      }}
    >
      <PageHeader
        eyebrow="NAAC FRAMEWORK"
        title="NAAC Criteria"
        description={description}
      />

      <div style={{ marginBottom: "18px" }}>
        <label
          htmlFor="criteria-cycle"
          style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}
        >
          Accreditation cycle
        </label>
        <select
          id="criteria-cycle"
          value={selectedCycleId}
          disabled={!cyclesLoaded || cycles.length === 0 || loading}
          onChange={(event) => setSelectedCycleId(event.target.value)}
          style={{ minWidth: "280px", padding: "9px 12px" }}
        >
          {cycles.length === 0 ? (
            <option value="">No accreditation cycles available</option>
          ) : null}
          {cycles.map((cycle) => (
            <option key={cycle.id} value={String(cycle.id)}>
              {cycle.name} — {cycle.framework_name || "Legacy working catalogue"}
            </option>
          ))}
        </select>
      </div>

      {!loading && criteria[0]?.original?.uses_catalog_fallback ? (
        <div
          style={{
            marginBottom: "18px",
            padding: "15px 18px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "10px",
            color: "#92400e",
            fontSize: "13px",
          }}
        >
          {criteria[0].original.progress_cycle_id
            ? "Applicability is not configured for the current accreditation cycle. Progress uses the global metric catalog."
            : "No active accreditation cycle is configured. Progress uses the global metric catalog."}
        </div>
      ) : null}

      {/* ======================================================
          DEPARTMENT COORDINATOR INFORMATION
      ====================================================== */}

      {isDeptCoordinator && (
        <div
          style={{
            marginBottom:
              "18px",
            padding:
              "15px 18px",
            background:
              "#eff6ff",
            border:
              "1px solid #bfdbfe",
            borderRadius:
              "10px",
            color:
              "#1e40af",
          }}
        >
          <strong>
            Department Evidence Workflow
          </strong>

          <div
            style={{
              marginTop:
                "5px",
              fontSize:
                "13px",
            }}
          >
            Select a criterion to view its metrics, requirements and evidence submission options.
          </div>
        </div>
      )}

      {/* ======================================================
          NAAC COORDINATOR INFORMATION
      ====================================================== */}

      {(isNaacCoordinator ||
        isAdmin) && (
        <div
          style={{
            marginBottom:
              "18px",
            padding:
              "15px 18px",
            background:
              "#f0fdf4",
            border:
              "1px solid #bbf7d0",
            borderRadius:
              "10px",
            color:
              "#166534",
          }}
        >
          <strong>
            NAAC Framework Management
          </strong>

          <div
            style={{
              marginTop:
                "5px",
              fontSize:
                "13px",
            }}
          >
            Manage criteria, sections,
            metrics and evidence
            requirements.
          </div>
        </div>
      )}

      {/* ======================================================
          CRITERIA TABLE
      ====================================================== */}

      <div
        className="panel"
        style={{
          background:
            "#ffffff",
          border:
            "1px solid #e2e8f0",
          borderRadius:
            "12px",
          padding:
            "20px",
        }}
      >
        {!loading && !error && (
          <p
            aria-live="polite"
            style={{
              margin: "0 0 14px",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            {criteria.length} {criteria.length === 1 ? "criterion" : "criteria"} returned for the current scope.
          </p>
        )}
        {loading ? (
          <div
            style={{
              padding:
                "40px",
              textAlign:
                "center",
              color:
                "#64748b",
            }}
          >
            Loading NAAC criteria...
          </div>
        ) : (
          <DataTable
            columns={
              columns
            }
            data={
              criteria
            }
            keyField="id"
            emptyMessage={
              cycles.length === 0
                ? "No accreditation cycle is available for this institution."
                : "No criteria are defined for the selected framework."
            }
          />
        )}
      </div>
    </div>
  );
};

export default Criteria;