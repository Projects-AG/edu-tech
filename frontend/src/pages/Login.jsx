import { useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  ShieldCheck,
  Users,
  ChevronDown,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();

  const { syncAuthFromStorage } = useAuth();

  // =========================================================
  // STATE
  // =========================================================

  const [email, setEmail] = useState(
    localStorage.getItem("rememberedEmail") || ""
  );

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  // =========================================================
  // ROLE SELECTION
  // =========================================================

  const [selectedRole, setSelectedRole] = useState("");

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const roles = [
    "Admin",
    "Institution Admin",
    "NAAC Coordinator",
    "Committee Member",
    "Dept. Coordinator",
    "Reviewer",
    "Data Approver",
    "Principal / Director",
  ];

  // =========================================================
  // ROLE NORMALIZATION
  // =========================================================

  const normalizeRole = (role) => {
    if (!role) {
      return "";
    }

    const clean = role
      .trim()
      .toLowerCase()
      .replace(/[./_\\-\s]/g, "");

    // IMPORTANT:
    // Institution Admin MUST be checked before Admin.
    // Otherwise "Institution Admin" could be treated as "Admin".

    if (
      clean === "institutionadmin" ||
      clean === "institutionadministrator"
    ) {
      return "institutionadmin";
    }

    if (
      clean === "departmentcoordinator" ||
      clean === "deptcoordinator"
    ) {
      return "deptcoordinator";
    }

    if (
      clean === "principaldirector" ||
      clean === "principal"
    ) {
      return "principaldirector";
    }

    if (
      clean === "naaccoordinator" ||
      clean === "coordinator"
    ) {
      return "naaccoordinator";
    }

    if (clean === "committeemember") {
      return "committeemember";
    }

    if (clean === "dataapprover") {
      return "dataapprover";
    }

    if (clean === "reviewer") {
      return "reviewer";
    }

    if (clean === "admin" || clean === "platformadmin") {
      return "admin";
    }

    return clean;
  };

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");

    // ---------------------------------------------------------
    // Check role selection
    // ---------------------------------------------------------

    if (!selectedRole) {
      setError("Please select your user type.");
      return;
    }

    // ---------------------------------------------------------
    // Check email and password
    // ---------------------------------------------------------

    const loginEmail = email.trim();

    if (!loginEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    // ---------------------------------------------------------
    // Development log
    // Never log the password.
    // ---------------------------------------------------------

    console.log("Login attempt:", {
      email: loginEmail,
      role: selectedRole,
    });

    try {
      // =======================================================
      // LOGIN REQUEST
      // =======================================================

      const response = await api.post("/auth/login", {
        email: loginEmail,
        password: password,
        role: selectedRole,
      });

      const data = response.data;

      console.log("LOGIN RESPONSE:", data);

      console.log(
        "AUTHENTICATED ROLE:",
        data.user?.role
      );

      console.log("TOKEN RECEIVED: YES");

      const authenticatedRole = data.user?.role;

      // =======================================================
      // CHECK AUTHENTICATED ROLE
      // =======================================================

      if (
        normalizeRole(selectedRole) !==
        normalizeRole(authenticatedRole)
      ) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("selectedRole");

        setError(
          "Selected role does not match your account role."
        );

        return;
      }

      // =======================================================
      // SAVE JWT TOKEN
      // =======================================================

      localStorage.setItem(
        "accessToken",
        data.access_token
      );

      // =======================================================
      // SAVE USER
      // =======================================================

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      // =======================================================
      // SAVE VERIFIED ROLE
      // =======================================================

      localStorage.setItem(
        "selectedRole",
        authenticatedRole || selectedRole
      );

      // =======================================================
      // SYNC AUTH CONTEXT
      // =======================================================

      syncAuthFromStorage();

      // =======================================================
      // REMEMBER EMAIL
      // =======================================================

      if (rememberMe) {
        localStorage.setItem(
          "rememberedEmail",
          loginEmail
        );
      } else {
        localStorage.removeItem(
          "rememberedEmail"
        );
      }

      // =======================================================
      // REDIRECT
      // =======================================================

      if (authenticatedRole === "Admin") {
        console.log(
          "REDIRECTING TO ADMIN DASHBOARD"
        );

        navigate("/admin-dashboard");
      } else {
        console.log(
          "REDIRECTING TO NORMAL DASHBOARD"
        );

        navigate("/dashboard");
      }

    } catch (error) {
      // =======================================================
      // LOGIN ERROR
      // =======================================================

      console.error("LOGIN FAILED:", error);

      if (error.response) {
        console.error(
          "Backend status:",
          error.response.status
        );

        console.error(
          "Backend response:",
          error.response.data
        );

        const detail =
          error.response.data?.detail;

        // -----------------------------------------------------
        // FastAPI validation errors
        // -----------------------------------------------------

        if (Array.isArray(detail)) {
          setError(
            detail
              .map(
                (item) =>
                  item?.msg ||
                  "Invalid login details."
              )
              .join(", ")
          );
        }

        // -----------------------------------------------------
        // Normal FastAPI HTTPException
        // -----------------------------------------------------

        else if (
          typeof detail === "string"
        ) {
          setError(detail);
        }

        // -----------------------------------------------------
        // Unknown backend error
        // -----------------------------------------------------

        else {
          setError(
            "Invalid email, password, or user type."
          );
        }

      } else {
        setError(
          "Unable to connect to the backend server."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="login-page">

      {/* =====================================================
          LEFT SIDE
      ===================================================== */}

      <section className="login-brand-section">

        {/* Brand */}

        <div className="brand-header">

          <div className="brand-logo">
            <span>◆</span>
          </div>

          <div className="brand-name">

            <div className="brand-title">
              EduVerse

              <span className="enterprise-badge">
                ENTERPRISE
              </span>
            </div>

            <div className="brand-subtitle">
              Accreditation | Analytics | Growth
            </div>

          </div>

        </div>

        {/* Main Content */}

        <div className="brand-content">

          <div className="suite-badge">
            ✦ &nbsp; NAAC Accreditation Management Suite
          </div>

          <h1>
            Smarter Accreditation.
            <br />
            <span>
              Stronger Institutions.
            </span>
          </h1>

          <p className="brand-description">
            Empowering institutions to manage
            accreditation, evidence, reviews, and
            institutional growth through one
            intelligent platform.
          </p>

          {/* Feature 1 */}

          <div className="feature-item">

            <div className="feature-icon">
              <Check size={15} />
            </div>

            <div>
              <strong>
                Centralized Accreditation Management
              </strong>

              <span>
                (Criteria 1–7)
              </span>
            </div>

          </div>

          {/* Feature 2 */}

          <div className="feature-item">

            <div className="feature-icon">
              <Check size={15} />
            </div>

            <div>
              <strong>
                Evidence & Document Tracking
              </strong>

              <span>
                with verifiable audit logs
              </span>
            </div>

          </div>

          {/* Feature 3 */}

          <div className="feature-item">

            <div className="feature-icon green">
              <Check size={15} />
            </div>

            <div>
              <strong>
                Secure Role-Based Access
              </strong>

              <span>
                verified during authentication
              </span>
            </div>

          </div>

          {/* Stats */}

          <div className="stats-card">

            <div>
              <small>
                Accreditation Cycle
              </small>

              <strong>
                SSR & AQAR Ready
              </strong>
            </div>

            <div>
              <small>
                Compliance Standard
              </small>

              <strong className="green-text">
                NAAC RAF 2024–26
              </strong>
            </div>

            <div>
              <small>
                Data Integrity
              </small>

              <strong>
                256-bit Encrypted
              </strong>
            </div>

          </div>

        </div>

        {/* Footer */}

        <div className="brand-footer">

          <span>
            © 2026 EduVerse Systems
          </span>

          <span>
            <i></i>
            Institutional Cloud Architecture •
            ISO/IEC 27001
          </span>

        </div>

      </section>

      {/* =====================================================
          RIGHT SIDE
      ===================================================== */}

      <section className="login-form-section">

        {/* Top Status */}

        <div className="portal-status">

          <span className="status-dot"></span>

          <span>
            Institutional Portal Active
          </span>

          <small>
            v4.8.2-ent
          </small>

        </div>

        {/* Login Card */}

        <div className="login-card">

          <div className="login-heading">

            <h2>
              Welcome Back
            </h2>

            <p>
              Sign in to continue to your EduVerse
              workspace.
            </p>

          </div>

          {/* =================================================
              LOGIN FORM
          ================================================= */}

          <form onSubmit={handleLogin}>

            {/* =================================================
                SIGN IN AS
            ================================================= */}

            <div className="field">

              <div
                className="field-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >

                <label>
                  SIGN IN AS *
                </label>

                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 9px",
                    border: "1px solid #cdd8ff",
                    borderRadius: "7px",
                    background: "#f4f6ff",
                    color: "#5268c9",
                    fontSize: "11px",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                  }}
                >
                  <ShieldCheck size={13} />
                  Active RBAC Routing
                </span>

              </div>

              {/* Role Dropdown */}

              <div
                style={{
                  position: "relative",
                }}
              >

                <button
                  type="button"
                  onClick={() =>
                    setRoleDropdownOpen(
                      !roleDropdownOpen
                    )
                  }
                  className="input-container"
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >

                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "11px",
                      color: selectedRole
                        ? "#172033"
                        : "#64748b",
                    }}
                  >

                    <Users
                      size={17}
                      style={{
                        color: "#64748b",
                        flexShrink: 0,
                      }}
                    />

                    <span>
                      {selectedRole ||
                        "Select institutional role"}
                    </span>

                  </span>

                  <ChevronDown
                    size={18}
                    style={{
                      color: "#64748b",
                      transform: roleDropdownOpen
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition:
                        "transform 0.2s ease",
                    }}
                  />

                </button>

                {/* Dropdown Options */}

                {roleDropdownOpen && (

                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      background: "#ffffff",
                      border: "1px solid #d7deea",
                      borderRadius: "10px",
                      padding: "6px",
                      boxShadow:
                        "0 10px 25px rgba(15, 23, 42, 0.12)",
                    }}
                  >

                    {roles.map((role) => (

                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setSelectedRole(role);
                          setRoleDropdownOpen(false);
                          setError("");
                        }}
                        style={{
                          width: "100%",
                          border: "none",
                          background:
                            selectedRole === role
                              ? "#f1f5ff"
                              : "transparent",
                          borderRadius: "7px",
                          padding: "10px 12px",
                          textAlign: "left",
                          cursor: "pointer",
                          color:
                            selectedRole === role
                              ? "#4058b8"
                              : "#172033",
                          fontSize: "14px",
                          fontWeight:
                            selectedRole === role
                              ? "600"
                              : "400",
                          fontFamily: "inherit",
                          transition:
                            "background 0.15s ease",
                        }}
                        onMouseEnter={(event) => {
                          if (
                            selectedRole !== role
                          ) {
                            event.currentTarget.style.background =
                              "#f8fafc";
                          }
                        }}
                        onMouseLeave={(event) => {
                          if (
                            selectedRole !== role
                          ) {
                            event.currentTarget.style.background =
                              "transparent";
                          }
                        }}
                      >
                        {role}
                      </button>

                    ))}

                  </div>

                )}

              </div>

            </div>

            {/* =================================================
                EMAIL
            ================================================= */}

            <div className="field">

              <div className="field-label">

                <label>
                  EMAIL ADDRESS
                </label>

                <span>
                  Institutional Domain
                </span>

              </div>

              <div className="input-container">

                <Mail size={17} />

                <input
                  type="email"
                  placeholder="coordinator@university.edu"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                />

              </div>

            </div>

            {/* =================================================
                PASSWORD
            ================================================= */}

            <div className="field">

              <div className="field-label">

                <label>
                  PASSWORD
                </label>

                <span>
                  Standard SSO / Password
                </span>

              </div>

              <div className="input-container">

                <Lock size={17} />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="eye-button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >

                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}

                </button>

              </div>

            </div>

            {/* =================================================
                OPTIONS
            ================================================= */}

            <div className="login-options">

              <label className="remember-label">

                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(
                      event.target.checked
                    )
                  }
                />

                <span>
                  Remember me
                </span>

              </label>

              <button
                type="button"
                onClick={() =>
                  navigate("/forgot-password")
                }
                className="forgot-button"
              >
                Forgot Password?
              </button>

            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

              <div className="login-error">
                {error}
              </div>

            )}

            {/* =================================================
                SIGN IN
            ================================================= */}

            <button
              type="submit"
              className="sign-in-button"
              disabled={loading}
            >

              {loading
                ? "Signing In..."
                : "Sign In"}

              {!loading && (
                <ArrowRight size={19} />
              )}

            </button>

          </form>

          {/* =================================================
              SECURITY
          ================================================= */}

          <div className="secure-message">

            <ShieldCheck size={15} />

            <span>
              Secure access powered by
              role-based permissions
            </span>

          </div>

          {/* =================================================
              OR
          ================================================= */}

          <div className="or-divider">

            <span></span>

            <small>
              OR
            </small>

            <span></span>

          </div>

          {/* =================================================
              GOOGLE WORKSPACE
          ================================================= */}

          <button
            type="button"
            className="google-button"
          >

            <span className="google-icon">
              G
            </span>

            Continue with Google Workspace

          </button>

          {/* =================================================
              REGISTRATION
          ================================================= */}

          <div className="contact-text">

            Don't have an account?

            <Link to="/register">
              Create an account
            </Link>

          </div>

        </div>

        {/* =====================================================
            ROLE INFORMATION
        ===================================================== */}

        <div className="role-info-box">

          <div className="info-icon">
            ⓘ
          </div>

          <p>

            <strong>
              Role-Based Access:
            </strong>{" "}

            Your selected user type is verified
            against your institutional account
            and assigned permissions before
            access is granted.

          </p>

        </div>

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <div className="form-footer">

          <span>
            © 2026 EduVerse
          </span>

          <span>
            Secure Institutional Accreditation Platform
          </span>

        </div>

      </section>

    </div>
  );
}

export default Login;