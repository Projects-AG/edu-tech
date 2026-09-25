import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Building2,
  Users,
  ClipboardList,
  Landmark,
  FileCheck2,
  UserCog,
  ArrowRight,
  Check,
  Lock,
  LogOut,
  Info,
} from "lucide-react";

import api from "../services/api";
import "./SelectRole.css";


/* =====================================================
   ALL 7 EDUVERSE NAAC ROLES
===================================================== */

const roles = [
  {
    id: 1,
    key: "admin",
    title: "Admin",
    badge: "SYSTEM ADMIN",
    backendName: "Admin",
    description:
      "Manage institutions, users, roles, permissions, accreditation settings, and overall system configuration.",
    summary:
      "You'll enter the Admin workspace with system-wide management, user administration, permissions, and institutional configuration access.",
    color: "blue",
    icon: UserCog,
  },

  {
    id: 2,
    key: "coordinator",
    title: "NAAC Coordinator",
    badge: "ACCREDITATION",
    backendName: "NAAC Coordinator",
    description:
      "Coordinate institution-wide NAAC activities, monitor accreditation progress, manage criteria-level work and oversee submissions.",
    summary:
      "You'll enter the Coordinator workspace with institution-wide accreditation management, criteria, evidence, and submission access.",
    color: "indigo",
    icon: ShieldCheck,
  },

  {
    id: 3,
    key: "committee-member",
    title: "Committee Member",
    badge: "COMMITTEE",
    backendName: "Committee Member",
    description:
      "Participate in committees, review criteria, evaluate evidence, and contribute to accreditation activities.",
    summary:
      "You'll enter the Committee Member workspace to participate in assigned committees, review criteria, and evaluate institutional evidence.",
    color: "teal",
    icon: Users,
  },

  {
    id: 4,
    key: "dept-coordinator",
    title: "Dept. Coordinator",
    badge: "DEPARTMENT",
    backendName: "Dept. Coordinator",
    description:
      "Manage department-level criteria, metrics, evidence, faculty contributions, and departmental submissions.",
    summary:
      "You'll enter the Department Coordinator workspace to manage departmental criteria, metrics, evidence, and submissions.",
    color: "purple",
    icon: Building2,
  },

  {
    id: 5,
    key: "reviewer",
    title: "Reviewer",
    badge: "REVIEW",
    backendName: "Reviewer",
    description:
      "Review submitted evidence, provide comments, evaluate information, and track review status.",
    summary:
      "You'll enter the Reviewer workspace to review assigned evidence, provide feedback, and track review activities.",
    color: "amber",
    icon: ClipboardList,
  },

  {
    id: 6,
    key: "data-approver",
    title: "Data Approver",
    badge: "APPROVAL",
    backendName: "Data Approver",
    description:
      "Validate institutional data and approve evidence and submissions before final processing.",
    summary:
      "You'll enter the Data Approver workspace to validate institutional information and approve authorized submissions.",
    color: "cyan",
    icon: FileCheck2,
  },

  {
    id: 7,
    key: "principal-director",
    title: "Principal / Director",
    badge: "LEADERSHIP",
    backendName: "Principal / Director",
    description:
      "Provide institutional oversight, review accreditation progress, monitor performance, and handle final approvals.",
    summary:
      "You'll enter the Executive Leadership workspace with institutional performance, accreditation status, reports, and approval access.",
    color: "rose",
    icon: Landmark,
  },
];


/* =====================================================
   SELECT ROLE PAGE
===================================================== */

function SelectRole() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState("");

  /* =====================================================
     FETCH AUTHENTICATED USER
  ===================================================== */

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoadingUser(true);
        setError("");

        const response = await api.get("/auth/me");

        setUser(response.data);

        /*
         * Backend is the source of truth.
         *
         * /auth/me returns:
         *
         * response.data.role.name
         *
         * Example:
         * "Admin"
         * "Coordinator"
         * "Reviewer"
         */

        const backendRoleName =
          response.data?.role?.name;

        const assignedRole = roles.find(
          (role) =>
            role.backendName === backendRoleName
        );

        if (assignedRole) {
          setSelectedRole(assignedRole);
        } else {
          setError(
            `Your assigned role "${backendRoleName || "Unknown"}" is not configured in the frontend.`
          );
        }

      } catch (error) {
        console.error(
          "Unable to fetch current user:",
          error
        );

        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("selectedRole");

        navigate("/");
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, [navigate]);


  /* =====================================================
     SELECT ROLE
  ===================================================== */

  const selectRole = (role) => {
    /*
     * The role is already assigned by the backend.
     *
     * We allow the card to be displayed,
     * but only the authenticated backend role
     * can actually be selected.
     */

    const backendRoleName =
      user?.role?.name;

    if (role.backendName !== backendRoleName) {
      return;
    }

    setSelectedRole(role);
    setError("");
  };


  /* =====================================================
     RESET ROLE
  ===================================================== */

  const resetRoleSelection = () => {
    /*
     * Since the backend controls the user's role,
     * do not allow switching to another role.
     *
     * We simply restore the authenticated role.
     */

    const backendRoleName =
      user?.role?.name;

    const assignedRole = roles.find(
      (role) =>
        role.backendName === backendRoleName
    );

    if (assignedRole) {
      setSelectedRole(assignedRole);
    }
  };


  /* =====================================================
     GO TO DASHBOARD
  ===================================================== */

  const navigateToDashboard = () => {
    if (!selectedRole || loading) {
      return;
    }

    /*
     * Final frontend verification.
     */

    const backendRoleName =
      user?.role?.name;

    if (
      selectedRole.backendName !==
      backendRoleName
    ) {
      setError(
        "Unauthorized role selection."
      );

      return;
    }

    setLoading(true);

    /*
     * Save verified role information.
     */

    localStorage.setItem(
      "selectedRole",
      JSON.stringify(selectedRole)
    );

    /*
     * Save permissions received from backend.
     */

    localStorage.setItem(
      "permissions",
      JSON.stringify(
        user?.permissions || []
      )
    );

    setTimeout(() => {
      navigate("/dashboard");
    }, 700);
  };


  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedRole");
    localStorage.removeItem("permissions");

    navigate("/");
  };


  /* =====================================================
     USER INITIALS
  ===================================================== */

  const initials = user?.user?.name
    ? user.user.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "EU";


  /* =====================================================
     LOADING SCREEN
  ===================================================== */

  if (loadingUser) {
    return (
      <div className="select-role-page">

        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial, sans-serif",
          }}
        >

          <div
            style={{
              textAlign: "center",
            }}
          >

            <div className="loading-spinner"></div>

            <p
              style={{
                marginTop: "16px",
                color: "#64748b",
              }}
            >
              Verifying your role...
            </p>

          </div>

        </div>

      </div>
    );
  }


  return (
    <div className="select-role-page">


      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="role-header">

        <div className="header-inner">


          {/* BRAND */}

          <div className="brand-section">

            <div className="brand-logo">
              <ShieldCheck
                size={23}
                strokeWidth={2.2}
              />
            </div>

            <div className="brand-text">

              <div className="brand-title-row">

                <span className="brand-name">
                  EduVerse
                </span>

                <span className="naac-badge">
                  NAAC PORTAL
                </span>

              </div>

              <p className="brand-subtitle">
                Accreditation & Quality Management Platform
              </p>

            </div>

          </div>


          {/* HEADER RIGHT */}

          <div className="header-right">


            {/* INSTITUTION */}

            <div className="institution-info">

              <div className="institution-name">

                <span className="online-dot"></span>

                St. Xavier's Autonomous Institute

              </div>

              <div className="institution-domain">
                Institutional Domain: stxaviers.edu
              </div>

            </div>


            <div className="header-divider"></div>


            {/* USER */}

            <div className="user-section">

              <div className="user-capsule">

                <div className="user-avatar">
                  {initials}
                </div>

                <div className="user-details">

                  <div className="user-name">

                    {user?.user?.name ||
                      "Authenticated User"}

                    <span className="sso-badge">
                      SSO
                    </span>

                  </div>

                  <div className="active-session">
                    Active Session
                  </div>

                </div>

              </div>


              <button
                className="logout-button"
                onClick={handleLogout}
                title="Sign Out of Session"
              >

                <LogOut size={17} />

              </button>

            </div>

          </div>

        </div>

      </header>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="role-main">


        {/* HERO */}

        <section className="role-hero">

          <div className="gateway-badge">

            <ShieldCheck size={13} />

            Authenticated Role Gateway • Step 2 of 2

          </div>


          <h1>
            Choose Your Role
          </h1>


          <p className="hero-description">
            Select your role to continue to your personalized NAAC workspace.
          </p>


          <p className="hero-subdescription">

            Your access, permissions, criteria modules, and analytical
            dashboards are customized according to your assigned role.

          </p>

        </section>


        {/* ERROR */}

        {error && (

          <div
            style={{
              maxWidth: "1100px",
              margin: "0 auto 20px",
              padding: "14px 18px",
              borderRadius: "10px",
              background: "#fff1f2",
              color: "#be123c",
              border: "1px solid #fecdd3",
            }}
          >

            {error}

          </div>

        )}


        {/* =====================================================
            ROLE CARDS
        ===================================================== */}

        <section className="roles-container">


          {/* ROW 1 — 3 ROLES */}

          <div className="roles-row-three">

            {roles.slice(0, 3).map((role) => (

              <RoleCard
                key={role.id}
                role={role}
                selected={
                  selectedRole?.id === role.id
                }
                authenticatedRole={
                  user?.role?.name
                }
                onSelect={selectRole}
              />

            ))}

          </div>


          {/* ROW 2 — 2 ROLES */}

          <div className="roles-row-two">

            {roles.slice(3, 5).map((role) => (

              <RoleCard
                key={role.id}
                role={role}
                selected={
                  selectedRole?.id === role.id
                }
                authenticatedRole={
                  user?.role?.name
                }
                onSelect={selectRole}
              />

            ))}

          </div>


          {/* ROW 3 — 2 ROLES */}

          <div className="roles-row-two">

            {roles.slice(5, 7).map((role) => (

              <RoleCard
                key={role.id}
                role={role}
                selected={
                  selectedRole?.id === role.id
                }
                authenticatedRole={
                  user?.role?.name
                }
                onSelect={selectRole}
              />

            ))}

          </div>

        </section>


        {/* =====================================================
            SELECTION SUMMARY
        ===================================================== */}

        <section className="selection-summary">

          {selectedRole ? (

            <div className="summary-active">


              <div className="summary-left">

                <div className="summary-icon">

                  <Check
                    size={21}
                    strokeWidth={2.5}
                  />

                </div>


                <div className="summary-content">

                  <div className="summary-title-row">

                    <span className="summary-label">
                      SELECTED ROLE:
                    </span>

                    <span className="summary-role">
                      {selectedRole.title}
                    </span>

                    <button
                      className="change-button"
                      onClick={resetRoleSelection}
                    >
                      Change
                    </button>

                  </div>


                  <p>
                    {selectedRole.summary}
                  </p>

                </div>

              </div>


              <button
                className="continue-button"
                onClick={navigateToDashboard}
                disabled={loading}
              >

                {loading ? (

                  <>

                    <span className="loading-spinner"></span>

                    Redirecting...

                  </>

                ) : (

                  <>

                    Continue to Dashboard

                    <ArrowRight size={17} />

                  </>

                )}

              </button>

            </div>

          ) : (

            <div className="summary-empty">

              <Info size={16} />

              <span>
                Your authenticated role will unlock your personalized
                accreditation dashboard.
              </span>

            </div>

          )}

        </section>


        {/* =====================================================
            RBAC BANNER
        ===================================================== */}

        <section className="rbac-banner">

          <div className="rbac-icon">

            <Lock size={15} />

          </div>


          <div>

            <h4>
              ROLE-BASED ACCESS CONTROL (RBAC) ACTIVE
            </h4>

            <p>

              Your workspace is customized according to your assigned
              permissions. You can only view data, upload documents,
              and approve criteria authorized for your role under
              Institutional NAAC Guidelines.

            </p>

          </div>

        </section>

      </main>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="role-footer">

        <div>
          © 2026 EduVerse NAAC Management System • Institutional Quality Suite
        </div>


        <div className="footer-right">

          <span className="compliance">

            <span className="footer-dot"></span>

            NAAC RAF 2024–26 Compliant

          </span>

          <span>•</span>

          <span>
            256-bit AES Role Authorization
          </span>

        </div>

      </footer>

    </div>
  );
}


/* =====================================================
   ROLE CARD
===================================================== */

function RoleCard({
  role,
  selected,
  authenticatedRole,
  onSelect,
}) {

  const Icon = role.icon;

  const isAuthenticatedRole =
    role.backendName === authenticatedRole;


  return (
    <div
      className={`role-card role-${role.color} ${
        selected ? "role-card-selected" : ""
      } ${
        !isAuthenticatedRole
          ? "role-card-disabled"
          : ""
      }`}
      onClick={() => onSelect(role)}
      title={
        !isAuthenticatedRole
          ? "This role is not assigned to your account"
          : "Select your assigned role"
      }
    >


      {/* TOP */}

      <div>

        <div className="role-card-top">

          <div className="role-icon">

            <Icon
              size={23}
              strokeWidth={2}
            />

          </div>


          <div className="radio-button">

            {selected && (
              <div className="radio-inner"></div>
            )}

          </div>

        </div>


        {/* TITLE */}

        <div className="role-title-row">

          <h3>
            {role.title}
          </h3>

          <span className="role-badge">
            {role.badge}
          </span>

        </div>


        {/* DESCRIPTION */}

        <p className="role-description">
          {role.description}
        </p>

      </div>


      {/* FOOTER */}

      <div className="role-card-footer">

        <span>

          {selected
            ? "Selected ✓"
            : isAuthenticatedRole
              ? "Select role"
              : "Not assigned"}

        </span>


        <ArrowRight
          size={16}
          className="role-arrow"
        />

      </div>

    </div>
  );
}


export default SelectRole;