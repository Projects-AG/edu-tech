import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import criteriaService from "../services/criteriaService";

import DataTable from "../components/common/DataTable";
import PageHeader from "../components/common/PageHeader";

import { useAuth } from "../context/AuthContext";
import {
  ROLES,
  normalizeRole,
} from "../config/roles";

// ============================================================
// STANDARD NAAC CRITERIA
// ============================================================

const NAAC_CRITERIA = [
  {
    code: "C1",
    number: "C1",
    title: "Curricular Aspects",
  },
  {
    code: "C2",
    number: "C2",
    title: "Teaching-Learning & Evaluation",
  },
  {
    code: "C3",
    number: "C3",
    title: "Research, Innovations & Extension",
  },
  {
    code: "C4",
    number: "C4",
    title: "Infrastructure & Learning Resources",
  },
  {
    code: "C5",
    number: "C5",
    title: "Student Support & Progression",
  },
  {
    code: "C6",
    number: "C6",
    title: "Governance, Leadership & Management",
  },
  {
    code: "C7",
    number: "C7",
    title: "Institutional Values & Best Practices",
  },
  {
    code: "C8",
    number: "C8",
    title: "Outreach & Community Engagement",
  },
  {
    code: "C9",
    number: "C9",
    title: "Health Practices & Sustainability",
  },
  {
    code: "C10",
    number: "C10",
    title: "Overall Institutional Performance",
  },
];

// ============================================================
// CRITERIA PAGE
// ============================================================

const Criteria = () => {
  const navigate = useNavigate();

  const { user } = useAuth();

  const [criteria, setCriteria] = useState([]);
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

  useEffect(() => {
    const loadCriteria = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await criteriaService.getCriteria();

        const backendCriteria =
          Array.isArray(response)
            ? response
            : [];

        console.log(
          "CRITERIA RESPONSE:",
          backendCriteria
        );

        // ----------------------------------------------------
        // Match backend criteria with standard C1-C10 list.
        // ----------------------------------------------------

        const formattedCriteria =
          NAAC_CRITERIA.map(
            (standardCriterion, index) => {
              const backendCriterion =
                backendCriteria.find(
                  (item) => {
                    const number =
                      String(
                        item.number ||
                          item.code ||
                          ""
                      )
                        .trim()
                        .toUpperCase();

                    return (
                      number ===
                      standardCriterion.code
                    );
                  }
                ) ||
                backendCriteria.find(
                  (item) =>
                    Number(item.id) ===
                    index + 1
                );

              const completion =
                Number(
                  backendCriterion
                    ?.completion_percentage ??
                    backendCriterion
                      ?.completionPercentage ??
                    0
                );

              let status = "Draft";

              if (completion >= 80) {
                status = "Approved";
              } else if (completion > 0) {
                status = "Under Review";
              }

              return {
                id:
                  backendCriterion?.id ??
                  index + 1,

                number:
                  standardCriterion.number,

                title:
                  standardCriterion.title,

                score:
                  backendCriterion?.weightage ??
                  100,

                maxScore:
                  backendCriterion?.max_score ??
                  backendCriterion?.maxScore ??
                  100,

                status,

                weighted: completion,

                original:
                  backendCriterion || null,
              };
            }
          );

        setCriteria(
          formattedCriteria
        );
      } catch (err) {
        console.error(
          "CRITERIA LOAD ERROR:",
          err?.response?.data || err
        );

        setError(
          err?.response?.data?.detail ||
            "Unable to load NAAC criteria."
        );
      } finally {
        setLoading(false);
      }
    };

    loadCriteria();
  }, []);

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
      `/criteria/${criterionId}`
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
          {value ?? 100} /{" "}
          {row.maxScore ?? 100}
        </span>
      ),
    },

    {
      title: "Status",
      dataIndex: "status",

      render: (value) => {
        const styles = {
          Approved: {
            background: "#dcfce7",
            color: "#166534",
            border: "#bbf7d0",
          },

          "Under Review": {
            background: "#fef3c7",
            color: "#92400e",
            border: "#fde68a",
          },

          Draft: {
            background: "#f1f5f9",
            color: "#475569",
            border: "#cbd5e1",
          },
        };

        const style =
          styles[value] ||
          styles.Draft;

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
          onClick={() =>
            handleViewCriterion(
              row.id
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
              "7px",
            padding:
              "7px 13px",
            cursor:
              "pointer",
            fontWeight:
              600,
          }}
        >
          View →
        </button>
      ),
    },
  ];

  // ==========================================================
  // DESCRIPTION
  // ==========================================================

  const description =
    isDeptCoordinator
      ? "Select a criterion to view its metrics and upload the required evidence."
      : "Manage and track metrics across Criteria 1 through 10.";

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
            Select one of the 10 NAAC
            criteria to view its metrics,
            requirements and evidence
            submission options.
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
            emptyMessage="No NAAC criteria found."
          />
        )}
      </div>
    </div>
  );
};

export default Criteria;