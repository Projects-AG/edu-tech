import React, {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import criteriaService from "../services/criteriaService";
import accreditationCycleService, {
  OFFICIAL_WORKING_CATALOGUE_MESSAGE,
  isOfficialCycleCatalog,
  pickActiveCycle,
} from "../services/accreditationCycleService";

import {
  useAuth,
} from "../context/AuthContext";

import {
  ROLES,
  normalizeRole,
} from "../config/roles";

const formatApiDetail = (detail) => {
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || JSON.stringify(item))
      .join(", ");
  }

  if (detail && typeof detail === "object") {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  return detail || "Unable to create section.";
};

const nextSectionFields = (criterion, currentSections) => {
  const prefix = String(
    criterion?.number || criterion?.code || "S"
  ).replace(/^C/i, "");

  const usedCodes = new Set(
    (currentSections || []).map((section) => String(section.code || ""))
  );

  let sequence = (currentSections || []).length + 1;
  let code = `${prefix}.${sequence}`;

  while (usedCodes.has(code)) {
    sequence += 1;
    code = `${prefix}.${sequence}`;
  }

  const nextOrder =
    (currentSections || []).reduce((max, section) => {
      const order = Number(section.display_order);
      return Number.isFinite(order) ? Math.max(max, order) : max;
    }, 0) + 1;

  return {
    code,
    display_order: nextOrder,
  };
};

const CriterionDetail = () => {
  const {
    criterionId,
  } = useParams();

  const navigate =
    useNavigate();
  const [searchParams] = useSearchParams();
  const selectedCycleId = searchParams.get("cycle_id");

  const {
    user,
  } = useAuth();

  // ==========================================================
  // ROLE
  // ==========================================================

  const normalizedRole =
    normalizeRole(
      user?.role
    );

  const isDeptCoordinator =
    normalizedRole ===
    ROLES.DEPT_COORDINATOR;

  const canManageCriteria =
    normalizedRole ===
      ROLES.NAAC_COORDINATOR ||
    normalizedRole ===
      ROLES.ADMIN;

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    criterion,
    setCriterion,
  ] = useState(null);

  const [
    sections,
    setSections,
  ] = useState([]);

  const [
    metrics,
    setMetrics,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    retryCount,
    setRetryCount,
  ] = useState(0);

  const [
    officialCatalogMessage,
    setOfficialCatalogMessage,
  ] = useState("");

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {
    const loadData =
      async () => {
        try {
          setLoading(true);
          setError("");

          // --------------------------------------------------
          // GET CRITERIA
          // --------------------------------------------------

          const criteria =
            await criteriaService.getCriteria(
              selectedCycleId ? Number(selectedCycleId) : undefined
            );

          const selectedCriterion =
            Array.isArray(
              criteria
            )
              ? criteria.find(
                  (item) =>
                    String(
                      item.operational_criterion_id ?? item.id
                    ) ===
                    String(
                      criterionId
                    )
                )
              : null;

          if (
            !selectedCriterion
          ) {
            setError(
              "Criterion not found."
            );

            return;
          }

          setCriterion(
            selectedCriterion
          );

          // --------------------------------------------------
          // GET SECTIONS
          // --------------------------------------------------

          const loadedSections =
            await criteriaService.getSections();
          if (!Array.isArray(loadedSections)) {
            throw new Error("The sections API returned an invalid response.");
          }

          // --------------------------------------------------
          // FILTER SECTIONS
          // --------------------------------------------------

          const criterionSections =
            loadedSections.filter(
              (section) =>
                String(
                  section.criterion_id ??
                    section.criterionId
                ) ===
                String(
                  criterionId
                )
            );

          setSections(
            criterionSections
          );

          const cycles =
            await accreditationCycleService.getCycles();
          const activeCycle = selectedCycleId
            ? cycles.find(
                (cycle) => String(cycle.id) === String(selectedCycleId)
              )
            : pickActiveCycle(cycles);
          if (isOfficialCycleCatalog(activeCycle)) {
            setOfficialCatalogMessage(
              OFFICIAL_WORKING_CATALOGUE_MESSAGE
            );
            setMetrics([]);
            return;
          }
          setOfficialCatalogMessage("");

          // --------------------------------------------------
          // GET METRICS
          // --------------------------------------------------

          const metricResponse =
            await criteriaService.getMetrics(activeCycle?.id);

          const allMetrics =
            Array.isArray(metricResponse)
              ? metricResponse
              : null;
          if (!allMetrics) {
            throw new Error("The metrics API returned an invalid response.");
          }

          // --------------------------------------------------
          // FILTER METRICS
          //
          // A metric may be connected to:
          // section_id
          // sectionId
          // criterion_id
          // criterionId
          // --------------------------------------------------

          const sectionIds =
            criterionSections.map(
              (section) =>
                String(
                  section.id
                )
            );

          const criterionMetrics =
            allMetrics.filter(
              (metric) => {
                const metricSectionId =
                  metric.section_id ??
                  metric.sectionId;

                const metricCriterionId =
                  metric.criterion_id ??
                  metric.criterionId;

                // ------------------------------------------
                // Direct criterion relationship
                // ------------------------------------------

                if (
                  metricCriterionId !==
                    undefined &&
                  metricCriterionId !==
                    null
                ) {
                  return (
                    String(
                      metricCriterionId
                    ) ===
                    String(
                      criterionId
                    )
                  );
                }

                // ------------------------------------------
                // Section relationship
                // ------------------------------------------

                if (
                  metricSectionId !==
                    undefined &&
                  metricSectionId !==
                    null
                ) {
                  return sectionIds.includes(
                    String(
                      metricSectionId
                    )
                  );
                }

                return false;
              }
            );

          setMetrics(
            criterionMetrics
          );

          console.log(
            "SELECTED CRITERION:",
            selectedCriterion
          );

          console.log(
            "CRITERION SECTIONS:",
            criterionSections
          );

          console.log(
            "CRITERION METRICS:",
            criterionMetrics
          );
        } catch (err) {
          console.error(
            "CRITERION DETAIL ERROR:",
            err
              ?.response
              ?.data ||
              err
          );

          setError(
            err
              ?.response
              ?.data
              ?.detail ||
              "Unable to load criterion details."
          );
        } finally {
          setLoading(
            false
          );
        }
      };

    loadData();
  }, [
    criterionId,
    selectedCycleId,
    retryCount,
  ]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div
        style={{
          padding:
            "30px",
          color:
            "#1e293b",
        }}
      >
        Loading criterion...
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error ||
    !criterion
  ) {
    return (
      <div
        style={{
          padding:
            "30px",
          color:
            "#1e293b",
        }}
      >
        <button
          onClick={() =>
            navigate(
              "/criteria"
            )
          }
          style={{
            border:
              "none",
            background:
              "transparent",
            color:
              "#2563eb",
            cursor:
              "pointer",
            fontWeight:
              600,
            marginBottom:
              "20px",
          }}
        >
          ← Back to Criteria
        </button>

        <h2>
          {error ||
            "Criterion not found."}
        </h2>
        {error ? (
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            style={{
              padding: "8px 14px",
              border: "1px solid #bfdbfe",
              borderRadius: "7px",
              background: "#eff6ff",
              color: "#1d4ed8",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  // ==========================================================
  // OPEN METRIC
  // ==========================================================

  const handleMetricClick =
    (metricId) => {
      navigate(
        `/criteria/${criterionId}/metrics/${metricId}`
      );
    };

  // ==========================================================
  // ADD SECTION
  // ==========================================================

  const handleAddSection =
    async () => {
      if (
        !canManageCriteria
      ) {
        return;
      }

      const title =
        window.prompt(
          "Enter section title:"
        );

      if (
        !title ||
        !title.trim()
      ) {
        return;
      }

      try {
        const sectionFields =
          nextSectionFields(
            criterion,
            sections
          );

        await criteriaService.createSection(
          {
            criterion_id:
              Number(
                criterionId
              ),
            title:
              title.trim(),
            code:
              sectionFields.code,
            description:
              null,
            weightage: 0,
            display_order:
              sectionFields.display_order,
          }
        );

        const sectionResponse =
          await criteriaService.getSections(
            Number(criterionId)
          );

        const loadedSections =
          Array.isArray(
            sectionResponse
          )
            ? sectionResponse
            : [];

        setSections(
          loadedSections.filter(
            (section) =>
              String(
                section.criterion_id ??
                  section.criterionId
              ) ===
              String(criterionId)
          )
        );
      } catch (err) {
        console.error(
          "CREATE SECTION ERROR:",
          err
              ?.response
              ?.data ||
            err
        );

        alert(
          formatApiDetail(
            err
              ?.response
              ?.data
              ?.detail
          )
        );
      }
    };

  // ==========================================================
  // MAIN
  // ==========================================================

  return (
    <div
      style={{
        color:
          "#1e293b",
        maxWidth:
          "1100px",
      }}
    >
      {/* ======================================================
          BACK
      ====================================================== */}

      <button
        onClick={() =>
          navigate(
            "/criteria"
          )
        }
        style={{
          border:
            "none",
          background:
            "transparent",
          color:
            "#2563eb",
          cursor:
            "pointer",
          fontWeight:
            600,
          marginBottom:
            "20px",
        }}
      >
        ← Back to Criteria
      </button>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          marginBottom:
            "24px",
        }}
      >
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "12px",
            marginBottom:
              "10px",
          }}
        >
          <span
            style={{
              background:
                "#eff6ff",
              color:
                "#2563eb",
              padding:
                "7px 12px",
              borderRadius:
                "7px",
              fontWeight:
                700,
            }}
          >
            {criterion.number ||
              `C${criterion.id}`}
          </span>

          <span
            style={{
              color:
                "#64748b",
              fontSize:
                "14px",
            }}
          >
            Criterion
          </span>
        </div>

        <h1
          style={{
            margin:
              0,
          }}
        >
          {criterion.title}
        </h1>

        {criterion.description && (
          <p
            style={{
              color:
                "#64748b",
              marginTop:
                "10px",
              lineHeight:
                1.6,
            }}
          >
            {
              criterion.description
            }
          </p>
        )}
      </div>

      {/* ======================================================
          DEPARTMENT COORDINATOR MESSAGE
      ====================================================== */}

      {isDeptCoordinator && (
        <div
          style={{
            marginBottom:
              "20px",
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

          <p
            style={{
              margin:
                "6px 0 0",
              fontSize:
                "13px",
            }}
          >
            Select a metric below to view
            its evidence requirements and
            create a submission.
          </p>
        </div>
      )}

      {/* ======================================================
          NAAC MANAGEMENT MESSAGE
      ====================================================== */}

      {canManageCriteria && (
        <div
          style={{
            marginBottom:
              "20px",
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

          <p
            style={{
              margin:
                "6px 0 0",
              fontSize:
                "13px",
            }}
          >
            Manage the sections and
            metrics associated with this
            criterion.
          </p>
        </div>
      )}

      {officialCatalogMessage ? (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px 18px",
            background: "#fff7ed",
            border: "1px solid #fdba74",
            borderRadius: "10px",
            color: "#9a3412",
            fontSize: "13px",
          }}
        >
          {officialCatalogMessage}
        </div>
      ) : null}

      {/* ======================================================
          METRICS
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
          marginBottom:
            "20px",
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap:
              "15px",
            marginBottom:
              "20px",
          }}
        >
          <div>
            <h2
              style={{
                margin:
                  0,
              }}
            >
              Metrics
            </h2>

            <p
              style={{
                margin:
                  "6px 0 0",
                color:
                  "#64748b",
                fontSize:
                  "13px",
              }}
            >
              Metrics available under this
              criterion.
            </p>
          </div>

          {canManageCriteria && (
            <button
              onClick={
                handleAddSection
              }
              style={{
                padding:
                  "9px 14px",
                border:
                  "none",
                borderRadius:
                  "8px",
                background:
                  "#2563eb",
                color:
                  "#ffffff",
                cursor:
                  "pointer",
                fontWeight:
                  600,
              }}
            >
              + Add Section
            </button>
          )}
        </div>

        {/* ====================================================
            NO METRICS
        ==================================================== */}

        {metrics.length ===
          0 && (
          <div
            style={{
              padding:
                "35px",
              textAlign:
                "center",
              color:
                "#64748b",
              border:
                "1px dashed #cbd5e1",
              borderRadius:
                "10px",
            }}
          >
            {officialCatalogMessage ||
              "No metrics found for this criterion."}
          </div>
        )}

        {/* ====================================================
            METRIC CARDS
        ==================================================== */}

        {metrics.map(
          (metric) => (
            <div
              key={
                metric.id
              }
              style={{
                border:
                  "1px solid #e2e8f0",
                borderRadius:
                  "10px",
                padding:
                  "18px",
                marginBottom:
                  "12px",
                transition:
                  "0.2s",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap:
                    "20px",
                  flexWrap:
                    "wrap",
                }}
              >
                <div
                  style={{
                    flex:
                      1,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap:
                        "10px",
                      marginBottom:
                        "7px",
                    }}
                  >
                    <span
                      style={{
                        background:
                          "#eff6ff",
                        color:
                          "#2563eb",
                        padding:
                          "5px 9px",
                        borderRadius:
                          "6px",
                        fontSize:
                          "12px",
                        fontWeight:
                          700,
                      }}
                    >
                      {metric.code ||
                        metric.number ||
                        `Metric ${metric.id}`}
                    </span>
                  </div>

                  <h3
                    style={{
                      margin:
                        0,
                      color:
                        "#1e293b",
                    }}
                  >
                    {metric.title ||
                      "Untitled Metric"}
                  </h3>

                  {metric.description && (
                    <p
                      style={{
                        margin:
                          "7px 0 0",
                        color:
                          "#64748b",
                        fontSize:
                          "13px",
                        lineHeight:
                          1.5,
                      }}
                    >
                      {
                        metric.description
                      }
                    </p>
                  )}
                </div>

                <button
                  onClick={() =>
                    handleMetricClick(
                      metric.id
                    )
                  }
                  style={{
                    border:
                      "1px solid #bfdbfe",
                    background:
                      "#eff6ff",
                    color:
                      "#2563eb",
                    borderRadius:
                      "8px",
                    padding:
                      "9px 14px",
                    cursor:
                      "pointer",
                    fontWeight:
                      600,
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  View Metric →
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* ======================================================
          SECTIONS
          Visible to authorized viewers.
          Create remains coordinator/admin only.
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
          <h2
            style={{
              marginTop:
                0,
              marginBottom:
                "18px",
            }}
          >
            Sections
          </h2>

          {sections.length ===
            0 ? (
            <div
              style={{
                padding:
                  "30px",
                textAlign:
                  "center",
                color:
                  "#64748b",
                border:
                  "1px dashed #cbd5e1",
                borderRadius:
                  "10px",
              }}
            >
              No sections configured
              for this criterion.
            </div>
          ) : (
            sections.map(
              (section) => (
                <div
                  key={
                    section.id
                  }
                  style={{
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      "9px",
                    padding:
                      "15px",
                    marginBottom:
                      "10px",
                  }}
                >
                  <strong>
                    {section.title ||
                      section.name ||
                      `Section ${section.id}`}
                  </strong>

                  {section.description && (
                    <p
                      style={{
                        margin:
                          "5px 0 0",
                        color:
                          "#64748b",
                        fontSize:
                          "13px",
                      }}
                    >
                      {
                        section.description
                      }
                    </p>
                  )}
                </div>
              )
            )
          )}
        </div>
    </div>
  );
};

export default CriterionDetail;