import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Building2,
  X,
  AlertCircle,
  UserCheck,
  ShieldCheck,
} from "lucide-react";

import api from "../../services/api";
import "./RegistrationRequests.css";

const APPROVAL_ROLES = [
  "Admin",
  "Principal / Director",
  "NAAC Coordinator",
  "Dept. Coordinator",
];

const ROLE_AUTHORITY = {
  "Committee Member": "Dept. Coordinator",
  "Dept. Coordinator": "NAAC Coordinator",
  "NAAC Coordinator": "Principal / Director",
  "Principal / Director": "Admin",
  Reviewer: "Admin",
  "Data Approver": "Admin",
};

const normalizeRole = (role) => {
  if (!role) return "";

  const value = String(role)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (value === "admin") return "Admin";

  if (
    value === "principal" ||
    value === "principal director" ||
    value === "principal / director"
  ) {
    return "Principal / Director";
  }

  if (
    value === "coordinator" ||
    value === "naac coordinator"
  ) {
    return "NAAC Coordinator";
  }

  if (
    value === "department coordinator" ||
    value === "dept coordinator" ||
    value === "dept. coordinator"
  ) {
    return "Dept. Coordinator";
  }

  if (value === "committee member") {
    return "Committee Member";
  }

  if (value === "reviewer") {
    return "Reviewer";
  }

  if (value === "data approver") {
    return "Data Approver";
  }

  return String(role).trim();
};

const RegistrationRequests = () => {
  const navigate = useNavigate();

  // =========================
  // CURRENT USER
  // =========================

  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState("");

  // =========================
  // STATE
  // =========================

  const [requests, setRequests] = useState([]);
  const [roles, setRoles] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [selectedRole, setSelectedRole] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const [rejectReason, setRejectReason] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================
  // LOAD CURRENT USER
  // =========================

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
          const user = JSON.parse(storedUser);

          setCurrentUser(user);

          const role = normalizeRole(
            user?.role ||
              user?.role_name ||
              user?.roleName
          );

          setCurrentRole(role);

          if (!APPROVAL_ROLES.includes(role)) {
            navigate("/login");
            return;
          }

          return;
        }

        const response = await api.get("/auth/me");

        const user = response.data;

        setCurrentUser(user);

        const role = normalizeRole(
          user?.role ||
            user?.role_name ||
            user?.roleName
        );

        setCurrentRole(role);

        if (!APPROVAL_ROLES.includes(role)) {
          navigate("/login");
        }
      } catch (err) {
        console.error(
          "CURRENT USER LOAD ERROR:",
          err
        );

        navigate("/login");
      }
    };

    loadCurrentUser();
  }, [navigate]);

  // =========================
  // LOAD DATA
  // =========================

  const loadData = async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      /*
       * IMPORTANT:
       * Registration requests are available through the
       * hierarchical backend endpoint.
       *
       * /admin/roles is ONLY needed by Admin.
       *
       * Non-admin approval roles must NOT call /admin/roles.
       */

      const requestsPromise = api.get(
        "/admin/registration-requests"
      );

      const institutionsPromise = api.get(
        "/institutions"
      );

      const facultiesPromise = api.get(
        "/faculties"
      );

      const departmentsPromise = api.get(
        "/departments"
      );

      let rolesPromise = Promise.resolve({
        data: [],
      });

      if (currentRole === "Admin") {
        rolesPromise = api.get("/admin/roles");
      }

      const [
        requestsResult,
        rolesResult,
        institutionsResult,
        facultiesResult,
        departmentsResult,
      ] = await Promise.allSettled([
        requestsPromise,
        rolesPromise,
        institutionsPromise,
        facultiesPromise,
        departmentsPromise,
      ]);

      // =========================
      // REGISTRATION REQUESTS
      // =========================

      if (
        requestsResult.status === "fulfilled"
      ) {
        const data =
          requestsResult.value?.data;

        console.log(
          "REGISTRATION REQUESTS:",
          data
        );

        setRequests(
          Array.isArray(data)
            ? data
            : data?.requests ||
                data?.data ||
                []
        );
      } else {
        throw requestsResult.reason;
      }

      // =========================
      // ROLES
      // =========================

      if (
        rolesResult.status === "fulfilled"
      ) {
        const data =
          rolesResult.value?.data;

        console.log("ROLES:", data);

        setRoles(
          Array.isArray(data)
            ? data
            : data?.roles ||
                data?.data ||
                []
        );
      } else {
        /*
         * This is intentionally NOT treated as a page error.
         *
         * For Principal / Director,
         * NAAC Coordinator and Dept. Coordinator,
         * /admin/roles is not required.
         */
        console.log(
          "ROLE API NOT AVAILABLE FOR CURRENT USER:",
          currentRole
        );

        setRoles([]);
      }

      // =========================
      // INSTITUTIONS
      // =========================

      if (
        institutionsResult.status ===
        "fulfilled"
      ) {
        const data =
          institutionsResult.value?.data;

        console.log(
          "INSTITUTIONS:",
          data
        );

        setInstitutions(
          Array.isArray(data)
            ? data
            : data?.institutions ||
                data?.data ||
                []
        );
      } else {
        console.error(
          "INSTITUTIONS LOAD ERROR:",
          institutionsResult.reason
        );

        setInstitutions([]);
      }

      // =========================
      // FACULTIES
      // =========================

      if (
        facultiesResult.status === "fulfilled"
      ) {
        const data =
          facultiesResult.value?.data;

        console.log(
          "FACULTIES:",
          data
        );

        setFaculties(
          Array.isArray(data)
            ? data
            : data?.faculties ||
                data?.data ||
                []
        );
      } else {
        console.error(
          "FACULTIES LOAD ERROR:",
          facultiesResult.reason
        );

        setFaculties([]);
      }

      // =========================
      // DEPARTMENTS
      // =========================

      if (
        departmentsResult.status ===
        "fulfilled"
      ) {
        const data =
          departmentsResult.value?.data;

        console.log(
          "DEPARTMENTS:",
          data
        );

        setDepartments(
          Array.isArray(data)
            ? data
            : data?.departments ||
                data?.data ||
                []
        );
      } else {
        console.error(
          "DEPARTMENTS LOAD ERROR:",
          departmentsResult.reason
        );

        setDepartments([]);
      }
    } catch (err) {
      console.error(
        "LOAD REGISTRATION DATA ERROR:",
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load registration data.";

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!currentRole) {
      return;
    }

    if (!APPROVAL_ROLES.includes(currentRole)) {
      return;
    }

    loadData();
  }, [currentRole]);

  // =========================
  // COUNTS
  // =========================

  const pendingCount = requests.filter(
    (request) =>
      String(request.status || "").toUpperCase() ===
      "PENDING"
  ).length;

  const approvedCount = requests.filter(
    (request) =>
      String(request.status || "").toUpperCase() ===
      "APPROVED"
  ).length;

  const rejectedCount = requests.filter(
    (request) =>
      String(request.status || "").toUpperCase() ===
      "REJECTED"
  ).length;

  // =========================
  // FILTERED REQUESTS
  // =========================

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const search = searchTerm
        .toLowerCase()
        .trim();

      const matchesSearch =
        !search ||
        String(
          request.full_name || ""
        )
          .toLowerCase()
          .includes(search) ||
        String(request.email || "")
          .toLowerCase()
          .includes(search) ||
        String(request.institution || "")
          .toLowerCase()
          .includes(search) ||
        String(request.department || "")
          .toLowerCase()
          .includes(search) ||
        String(request.designation || "")
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "ALL" ||
        String(
          request.status || ""
        ).toUpperCase() === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    requests,
    searchTerm,
    statusFilter,
  ]);

  // =========================
  // FACULTY FILTER
  // =========================

  const filteredFaculties = useMemo(() => {
    if (!selectedInstitution) {
      return [];
    }

    return faculties.filter(
      (faculty) =>
        Number(
          faculty.institution_id
        ) === Number(selectedInstitution)
    );
  }, [
    faculties,
    selectedInstitution,
  ]);

  // =========================
  // DEPARTMENT FILTER
  // =========================

  const filteredDepartments = useMemo(() => {
    if (
      !selectedInstitution ||
      !selectedFaculty
    ) {
      return [];
    }

    return departments.filter(
      (department) =>
        Number(
          department.institution_id
        ) === Number(selectedInstitution) &&
        Number(
          department.faculty_id
        ) === Number(selectedFaculty)
    );
  }, [
    departments,
    selectedInstitution,
    selectedFaculty,
  ]);

  // =========================
  // GET ROLE NAME
  // =========================

  const getRoleName = (roleId) => {
    const role = roles.find(
      (item) =>
        Number(item.id) ===
        Number(roleId)
    );

    return role?.name || "";
  };

  // =========================
  // GET REQUESTED ROLE ID
  // =========================

  const getRequestedRoleId = (
    request
  ) => {
    return (
      request?.requested_role_id ??
      request?.role_id ??
      null
    );
  };

  // =========================
  // GET REQUESTED ROLE NAME
  // =========================

  const getRequestedRoleName = (
    request
  ) => {
    const roleId =
      getRequestedRoleId(request);

    if (roleId) {
      const roleName =
        getRoleName(roleId);

      if (roleName) {
        return roleName;
      }
    }

    return (
      request?.requested_role_name ||
      request?.role_name ||
      request?.requested_role ||
      ""
    );
  };

  // =========================
  // AUTHORIZATION CHECK
  // =========================

  const canApproveRequest = (
    request
  ) => {
    if (!request) {
      return false;
    }

    if (
      String(request.status || "").toUpperCase() !==
      "PENDING"
    ) {
      return false;
    }

    if (
      !APPROVAL_ROLES.includes(
        currentRole
      )
    ) {
      return false;
    }

    /*
     * Admin can approve all pending requests.
     */
    if (currentRole === "Admin") {
      return true;
    }

    /*
     * For non-admin approval roles,
     * the backend decides the actual authority.
     *
     * Frontend additionally checks the configured
     * hierarchy where possible.
     */
    const requestedRole =
      normalizeRole(
        getRequestedRoleName(request)
      );

    const requiredApprover =
      ROLE_AUTHORITY[
        requestedRole
      ];

    return (
      requiredApprover ===
      currentRole
    );
  };

  // =========================
  // OPEN VIEW MODAL
  // =========================

  const handleView = async (
    request
  ) => {
    try {
      setError("");

      const response =
        await api.get(
          `/admin/registration-requests/${request.id}`
        );

      console.log(
        "REGISTRATION REQUEST DETAILS:",
        response.data
      );

      setSelectedRequest(
        response.data
      );

      setShowViewModal(true);
    } catch (err) {
      console.error(
        "VIEW REQUEST ERROR:",
        err
      );

      const message =
        err?.response?.data?.detail ||
        "Failed to load registration details.";

      setError(message);
    }
  };

  // =========================
  // OPEN APPROVE MODAL
  // =========================

  const openApproveModal = (
    request
  ) => {
    if (!canApproveRequest(request)) {
      setError(
        "You are not authorized to approve this registration request."
      );
      return;
    }

    setSelectedRequest(request);

    /*
     * Admin:
     * Role can be selected manually.
     *
     * Other approval roles:
     * The requested role is automatically used.
     */
    if (currentRole === "Admin") {
      setSelectedRole(
        getRequestedRoleId(
          request
        )
          ? String(
              getRequestedRoleId(
                request
              )
            )
          : ""
      );
    } else {
      const requestedRoleId =
        getRequestedRoleId(
          request
        );

      setSelectedRole(
        requestedRoleId
          ? String(requestedRoleId)
          : ""
      );
    }

    setSelectedInstitution(
      request.institution_id
        ? String(
            request.institution_id
          )
        : ""
    );

    setSelectedFaculty(
      request.faculty_id
        ? String(
            request.faculty_id
          )
        : ""
    );

    setSelectedDepartment(
      request.department_id
        ? String(
            request.department_id
          )
        : ""
    );

    setError("");
    setSuccess("");

    setShowApproveModal(true);
  };

  // =========================
  // INSTITUTION CHANGE
  // =========================

  const handleInstitutionChange = (
    e
  ) => {
    const institutionId =
      e.target.value;

    setSelectedInstitution(
      institutionId
    );

    setSelectedFaculty("");
    setSelectedDepartment("");
  };

  // =========================
  // FACULTY CHANGE
  // =========================

  const handleFacultyChange = (
    e
  ) => {
    const facultyId =
      e.target.value;

    setSelectedFaculty(
      facultyId
    );

    setSelectedDepartment("");
  };

  // =========================
  // APPROVE REQUEST
  // =========================

  const handleApprove = async () => {
    if (!selectedRequest) {
      return;
    }

    setError("");
    setSuccess("");

    if (
      !canApproveRequest(
        selectedRequest
      )
    ) {
      setError(
        "You are not authorized to approve this registration request."
      );
      return;
    }

    // =========================
    // ROLE
    // =========================

    if (!selectedRole) {
      setError(
        "The requested role could not be determined."
      );
      return;
    }

    const selectedRoleName =
      normalizeRole(
        getRoleName(
          selectedRole
        ) ||
          getRequestedRoleName(
            selectedRequest
          )
      );

    /*
     * Non-admin users cannot change
     * the requested role.
     */
    if (currentRole !== "Admin") {
      const requestedRoleName =
        normalizeRole(
          getRequestedRoleName(
            selectedRequest
          )
        );

      if (
        requestedRoleName &&
        selectedRoleName &&
        requestedRoleName !==
          selectedRoleName
      ) {
        setError(
          "You cannot change the requested role."
        );
        return;
      }
    }

    // =========================
    // INSTITUTION
    // =========================

    if (!selectedInstitution) {
      setError(
        "Please select an institution."
      );
      return;
    }

    // =========================
    // FACULTY
    // =========================

    if (!selectedFaculty) {
      setError(
        "Please select a faculty."
      );
      return;
    }

    // =========================
    // DEPARTMENT
    // =========================

    const departmentRequired =
      selectedRoleName ===
        "Dept. Coordinator" ||
      selectedRoleName ===
        "Committee Member";

    if (
      departmentRequired &&
      !selectedDepartment
    ) {
      setError(
        "Please select a department."
      );
      return;
    }

    try {
      setActionLoading(true);

      const approvalPayload = {
        role_id: Number(
          selectedRole
        ),

        institution_id:
          selectedInstitution
            ? Number(
                selectedInstitution
              )
            : null,

        /*
         * Backend derives the faculty
         * from the selected department.
         *
         * We still send faculty_id for
         * compatibility with the current
         * approval schema.
         */
        faculty_id:
          selectedFaculty
            ? Number(
                selectedFaculty
              )
            : null,

        department_id:
          selectedDepartment
            ? Number(
                selectedDepartment
              )
            : null,
      };

      console.log(
        "CURRENT ROLE:",
        currentRole
      );

      console.log(
        "APPROVAL PAYLOAD:",
        approvalPayload
      );

      const response =
        await api.post(
          `/admin/registration-requests/${selectedRequest.id}/approve`,
          approvalPayload
        );

      console.log(
        "APPROVAL RESPONSE:",
        response.data
      );

      setSuccess(
        response.data?.message ||
          "Registration request approved successfully."
      );

      setShowApproveModal(false);
      setSelectedRequest(null);

      await loadData(true);
    } catch (err) {
      console.error(
        "APPROVE REQUEST ERROR:",
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to approve registration request.";

      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  // =========================
  // OPEN REJECT MODAL
  // =========================

  const openRejectModal = (
    request
  ) => {
    if (!canApproveRequest(request)) {
      setError(
        "You are not authorized to reject this registration request."
      );
      return;
    }

    setSelectedRequest(request);
    setRejectReason("");
    setError("");
    setSuccess("");
    setShowRejectModal(true);
  };

  // =========================
  // REJECT REQUEST
  // =========================

  const handleReject = async () => {
    if (!selectedRequest) {
      return;
    }

    if (
      !canApproveRequest(
        selectedRequest
      )
    ) {
      setError(
        "You are not authorized to reject this registration request."
      );
      return;
    }

    if (!rejectReason.trim()) {
      setError(
        "Please provide a rejection reason."
      );
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response =
        await api.post(
          `/admin/registration-requests/${selectedRequest.id}/reject`,
          {
            reason:
              rejectReason.trim(),
          }
        );

      console.log(
        "REJECTION RESPONSE:",
        response.data
      );

      setSuccess(
        response.data?.message ||
          "Registration request rejected successfully."
      );

      setShowRejectModal(false);
      setSelectedRequest(null);

      await loadData(true);
    } catch (err) {
      console.error(
        "REJECT REQUEST ERROR:",
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to reject registration request.";

      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  // =========================
  // CLOSE MODALS
  // =========================

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedRequest(null);
  };

  const closeApproveModal = () => {
    if (actionLoading) {
      return;
    }

    setShowApproveModal(false);
    setSelectedRequest(null);

    setSelectedRole("");
    setSelectedInstitution("");
    setSelectedFaculty("");
    setSelectedDepartment("");
  };

  const closeRejectModal = () => {
    if (actionLoading) {
      return;
    }

    setShowRejectModal(false);
    setSelectedRequest(null);
    setRejectReason("");
  };

  // =========================
  // GET INSTITUTION NAME
  // =========================

  const getInstitutionName = (
    institutionId
  ) => {
    const institution =
      institutions.find(
        (item) =>
          Number(item.id) ===
          Number(institutionId)
      );

    return (
      institution?.name ||
      "Not assigned"
    );
  };

  // =========================
  // GET FACULTY NAME
  // =========================

  const getFacultyName = (
    facultyId
  ) => {
    const faculty =
      faculties.find(
        (item) =>
          Number(item.id) ===
          Number(facultyId)
      );

    return (
      faculty?.name ||
      "Not assigned"
    );
  };

  // =========================
  // GET DEPARTMENT NAME
  // =========================

  const getDepartmentName = (
    departmentId
  ) => {
    const department =
      departments.find(
        (item) =>
          Number(item.id) ===
          Number(departmentId)
      );

    return (
      department?.name ||
      "Not assigned"
    );
  };

  // =========================
  // STATUS BADGE
  // =========================

  const renderStatus = (
    status
  ) => {
    const normalizedStatus =
      String(
        status || ""
      ).toUpperCase();

    if (
      normalizedStatus ===
      "APPROVED"
    ) {
      return (
        <span className="status-badge approved">
          <CheckCircle2 size={14} />
          Approved
        </span>
      );
    }

    if (
      normalizedStatus ===
      "REJECTED"
    ) {
      return (
        <span className="status-badge rejected">
          <XCircle size={14} />
          Rejected
        </span>
      );
    }

    return (
      <span className="status-badge pending">
        <Clock size={14} />
        Pending
      </span>
    );
  };

  // =========================
  // REQUESTED ROLE DISPLAY
  // =========================

  const renderRequestedRole = (
    request
  ) => {
    const roleName =
      getRequestedRoleName(
        request
      );

    return (
      roleName || "—"
    );
  };

  // =========================
  // LOADING
  // =========================

  if (
    loading ||
    !currentRole
  ) {
    return (
      <div className="registration-page">
        <div className="registration-loading">
          <RefreshCw
            size={32}
            className="spin"
          />

          <p>
            Loading registration requests...
          </p>
        </div>
      </div>
    );
  }

  // =========================
  // UI
  // =========================

  return (
    <div className="registration-page">

      {/* HEADER */}

      <div className="registration-header">

        <div className="header-left">

          <button
            className="back-button"
            onClick={() => {
              if (
                currentRole ===
                "Admin"
              ) {
                navigate(
                  "/admin/users"
                );
              } else {
                navigate(
                  "/dashboard"
                );
              }
            }}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="page-title-row">

              <h1>
                Registration Requests
              </h1>

              {pendingCount > 0 && (
                <span className="pending-count">
                  {pendingCount} Pending
                </span>
              )}

            </div>

            <p>
              Review and authorize new
              user registration requests.
            </p>
          </div>

        </div>

        <button
          className="refresh-button"
          onClick={() =>
            loadData(true)
          }
          disabled={refreshing}
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </div>

      {/* AUTHORITY INFO */}

      <div
        className="alert-message"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <ShieldCheck size={18} />

        <span>
          Logged in as{" "}
          <strong>
            {currentRole}
          </strong>
          {currentRole !==
            "Admin" &&
            " — only registration requests within your authorization level can be approved."}
        </span>
      </div>

      {/* ERROR */}

      {error && (
        <div className="alert-message error">

          <AlertCircle size={18} />

          <span>
            {error}
          </span>

          <button
            onClick={() =>
              setError("")
            }
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* SUCCESS */}

      {success && (
        <div className="alert-message success">

          <CheckCircle2 size={18} />

          <span>
            {success}
          </span>

          <button
            onClick={() =>
              setSuccess("")
            }
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* STAT CARDS */}

      <div className="stats-grid">

        <div className="stat-card">

          <div className="stat-icon total">
            <Users size={22} />
          </div>

          <div>
            <span>
              Total Requests
            </span>

            <strong>
              {requests.length}
            </strong>
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon pending">
            <Clock size={22} />
          </div>

          <div>
            <span>
              Pending
            </span>

            <strong>
              {pendingCount}
            </strong>
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon approved">
            <CheckCircle2 size={22} />
          </div>

          <div>
            <span>
              Approved
            </span>

            <strong>
              {approvedCount}
            </strong>
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon rejected">
            <XCircle size={22} />
          </div>

          <div>
            <span>
              Rejected
            </span>

            <strong>
              {rejectedCount}
            </strong>
          </div>

        </div>

      </div>

      {/* FILTER BAR */}

      <div className="filter-bar">

        <div className="search-box">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search by name, email, institution..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
          />

        </div>

        <select
          className="status-filter"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }
        >

          <option value="ALL">
            All Status
          </option>

          <option value="PENDING">
            Pending
          </option>

          <option value="APPROVED">
            Approved
          </option>

          <option value="REJECTED">
            Rejected
          </option>

        </select>

      </div>

      {/* TABLE */}

      <div className="table-card">

        <div className="table-header">

          <div>
            <h2>
              Registration Requests
            </h2>

            <p>
              {filteredRequests.length}{" "}
              request
              {filteredRequests.length !==
              1
                ? "s"
                : ""}{" "}
              found
            </p>
          </div>

        </div>

        {filteredRequests.length ===
        0 ? (
          <div className="empty-state">

            <Users size={40} />

            <h3>
              No registration requests found
            </h3>

            <p>
              There are no requests
              available for your current
              authorization level.
            </p>

          </div>
        ) : (
          <div className="table-wrapper">

            <table>

              <thead>

                <tr>
                  <th>
                    Applicant
                  </th>

                  <th>
                    Institution
                  </th>

                  <th>
                    Department
                  </th>

                  <th>
                    Requested Role
                  </th>

                  <th>
                    Designation
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Submitted
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>

              </thead>

              <tbody>

                {filteredRequests.map(
                  (request) => {

                    const canAct =
                      canApproveRequest(
                        request
                      );

                    return (
                      <tr
                        key={
                          request.id
                        }
                      >

                        <td>

                          <div className="applicant-cell">

                            <div className="applicant-avatar">
                              {request.full_name
                                ?.charAt(
                                  0
                                )
                                ?.toUpperCase() ||
                                "U"}
                            </div>

                            <div>

                              <strong>
                                {
                                  request.full_name
                                }
                              </strong>

                              <span>
                                {
                                  request.email
                                }
                              </span>

                            </div>

                          </div>

                        </td>

                        <td>

                          <div className="table-info">

                            <Building2
                              size={15}
                            />

                            <span>
                              {request.institution ||
                                getInstitutionName(
                                  request.institution_id
                                ) ||
                                "—"}
                            </span>

                          </div>

                        </td>

                        <td>
                          {request.department ||
                            getDepartmentName(
                              request.department_id
                            ) ||
                            "—"}
                        </td>

                        <td>
                          <strong>
                            {renderRequestedRole(
                              request
                            )}
                          </strong>
                        </td>

                        <td>
                          {request.designation ||
                            "—"}
                        </td>

                        <td>
                          {renderStatus(
                            request.status
                          )}
                        </td>

                        <td>
                          {request.created_at
                            ? new Date(
                                request.created_at
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "—"}
                        </td>

                        <td>

                          <div className="action-buttons">

                            <button
                              className="icon-action view"
                              title="View"
                              onClick={() =>
                                handleView(
                                  request
                                )
                              }
                            >
                              <Eye
                                size={16}
                              />
                            </button>

                            {canAct && (
                              <>
                                <button
                                  className="icon-action approve"
                                  title="Approve"
                                  onClick={() =>
                                    openApproveModal(
                                      request
                                    )
                                  }
                                >
                                  <CheckCircle2
                                    size={16}
                                  />
                                </button>

                                <button
                                  className="icon-action reject"
                                  title="Reject"
                                  onClick={() =>
                                    openRejectModal(
                                      request
                                    )
                                  }
                                >
                                  <XCircle
                                    size={16}
                                  />
                                </button>
                              </>
                            )}

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* =========================
          VIEW MODAL
          ========================= */}

      {showViewModal &&
        selectedRequest && (
          <div
            className="modal-overlay"
            onClick={
              closeViewModal
            }
          >

            <div
              className="modal-card view-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="modal-header">

                <div>

                  <h2>
                    Registration Details
                  </h2>

                  <p>
                    Request #
                    {
                      selectedRequest.id
                    }
                  </p>

                </div>

                <button
                  className="modal-close"
                  onClick={
                    closeViewModal
                  }
                >
                  <X size={20} />
                </button>

              </div>

              <div className="details-grid">

                <div className="detail-item">

                  <span>
                    Full Name
                  </span>

                  <strong>
                    {
                      selectedRequest.full_name ||
                      "—"
                    }
                  </strong>

                </div>

                <div className="detail-item">

                  <span>
                    Email
                  </span>

                  <strong>
                    {
                      selectedRequest.email ||
                      "—"
                    }
                  </strong>

                </div>

                <div className="detail-item">

                  <span>
                    Institution
                  </span>

                  <strong>
                    {
                      selectedRequest.institution ||
                      getInstitutionName(
                        selectedRequest.institution_id
                      ) ||
                      "—"
                    }
                  </strong>

                </div>

                <div className="detail-item">

                  <span>
                    Faculty
                  </span>

                  <strong>
                    {
                      selectedRequest.faculty ||
                      getFacultyName(
                        selectedRequest.faculty_id
                      ) ||
                      "Not assigned"
                    }
                  </strong>

                </div>

                <div className="detail-item">

                  <span>
                    Department
                  </span>

                  <strong>
                    {
                      selectedRequest.department ||
                      getDepartmentName(
                        selectedRequest.department_id
                      ) ||
                      "—"
                    }
                  </strong>

                </div>

                <div className="detail-item">

                  <span>
                    Requested Role
                  </span>

                  <strong>
                    {
                      getRequestedRoleName(
                        selectedRequest
                      ) ||
                      "—"
                    }
                  </strong>

                </div>

                <div className="detail-item">

                  <span>
                    Designation
                  </span>

                  <strong>
                    {
                      selectedRequest.designation ||
                      "—"
                    }
                  </strong>

                </div>

                <div className="detail-item">

                  <span>
                    Status
                  </span>

                  <div>
                    {renderStatus(
                      selectedRequest.status
                    )}
                  </div>

                </div>

                <div className="detail-item">

                  <span>
                    Submitted On
                  </span>

                  <strong>
                    {
                      selectedRequest.created_at
                        ? new Date(
                            selectedRequest.created_at
                          ).toLocaleString(
                            "en-IN"
                          )
                        : "—"
                    }
                  </strong>

                </div>

              </div>

              {selectedRequest.rejection_reason && (
                <div className="rejection-info">

                  <strong>
                    Rejection Reason
                  </strong>

                  <p>
                    {
                      selectedRequest.rejection_reason
                    }
                  </p>

                </div>
              )}

              <div className="modal-footer">

                <button
                  className="secondary-button"
                  onClick={
                    closeViewModal
                  }
                >
                  Close
                </button>

                {canApproveRequest(
                  selectedRequest
                ) && (
                  <>
                    <button
                      className="danger-button"
                      onClick={() => {
                        closeViewModal();

                        openRejectModal(
                          selectedRequest
                        );
                      }}
                    >
                      <XCircle
                        size={17}
                      />

                      Reject
                    </button>

                    <button
                      className="primary-button"
                      onClick={() => {
                        closeViewModal();

                        openApproveModal(
                          selectedRequest
                        );
                      }}
                    >
                      <CheckCircle2
                        size={17}
                      />

                      Approve
                    </button>
                  </>
                )}

              </div>

            </div>

          </div>
        )}

      {/* =========================
          APPROVE MODAL
          ========================= */}

      {showApproveModal &&
        selectedRequest && (
          <div
            className="modal-overlay"
            onClick={
              closeApproveModal
            }
          >

            <div
              className="modal-card approval-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="modal-header">

                <div>

                  <h2>
                    Approve Registration
                  </h2>

                  <p>
                    {currentRole ===
                    "Admin"
                      ? "Assign role and organizational access."
                      : `Authorize this registration as ${currentRole}.`}
                  </p>

                </div>

                <button
                  className="modal-close"
                  onClick={
                    closeApproveModal
                  }
                  disabled={
                    actionLoading
                  }
                >
                  <X size={20} />
                </button>

              </div>

              <div className="approval-applicant">

                <div className="applicant-avatar large">

                  {selectedRequest.full_name
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "U"}

                </div>

                <div>

                  <strong>
                    {
                      selectedRequest.full_name
                    }
                  </strong>

                  <span>
                    {
                      selectedRequest.email
                    }
                  </span>

                </div>

              </div>

              <div className="approval-form">

                {/* =========================
                    ROLE
                    ========================= */}

                <div className="form-group">

                  <label>
                    Role{" "}
                    <span>*</span>
                  </label>

                  {currentRole ===
                  "Admin" ? (
                    <select
                      value={
                        selectedRole
                      }
                      onChange={(e) =>
                        setSelectedRole(
                          e.target.value
                        )
                      }
                      disabled={
                        actionLoading
                      }
                    >

                      <option value="">
                        Select role
                      </option>

                      {roles.map(
                        (role) => (
                          <option
                            key={
                              role.id
                            }
                            value={
                              role.id
                            }
                          >
                            {
                              role.name
                            }
                          </option>
                        )
                      )}

                    </select>
                  ) : (
                    <>
                      <select
                        value={
                          selectedRole
                        }
                        disabled
                      >
                        <option value="">
                          {getRequestedRoleName(
                            selectedRequest
                          ) ||
                            "Requested role"}
                        </option>
                      </select>

                      <small
                        style={{
                          display:
                            "block",
                          marginTop:
                            "6px",
                          opacity:
                            0.7,
                        }}
                      >
                        The requested role
                        cannot be changed
                        by{" "}
                        {
                          currentRole
                        }.
                      </small>
                    </>
                  )}

                </div>

                {/* =========================
                    INSTITUTION
                    ========================= */}

                <div className="form-group">

                  <label>
                    Institution{" "}
                    <span>*</span>
                  </label>

                  <select
                    value={
                      selectedInstitution
                    }
                    onChange={
                      handleInstitutionChange
                    }
                    disabled={
                      actionLoading
                    }
                  >

                    <option value="">
                      Select institution
                    </option>

                    {institutions.map(
                      (
                        institution
                      ) => (
                        <option
                          key={
                            institution.id
                          }
                          value={
                            institution.id
                          }
                        >
                          {
                            institution.name
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>

                {/* =========================
                    FACULTY
                    ========================= */}

                <div className="form-group">

                  <label>
                    Faculty{" "}
                    <span>*</span>
                  </label>

                  <select
                    value={
                      selectedFaculty
                    }
                    onChange={
                      handleFacultyChange
                    }
                    disabled={
                      actionLoading ||
                      !selectedInstitution
                    }
                  >

                    <option value="">
                      {!selectedInstitution
                        ? "Select institution first"
                        : filteredFaculties.length ===
                          0
                        ? "No faculty available"
                        : "Select faculty"}
                    </option>

                    {filteredFaculties.map(
                      (
                        faculty
                      ) => (
                        <option
                          key={
                            faculty.id
                          }
                          value={
                            faculty.id
                          }
                        >
                          {
                            faculty.name
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>

                {/* =========================
                    DEPARTMENT
                    ========================= */}

                <div className="form-group">

                  <label>
                    Department

                    <span>
                      {selectedRole &&
                      (
                        getRoleName(
                          selectedRole
                        ) ||
                        getRequestedRoleName(
                          selectedRequest
                        )
                      ) &&
                      (
                        normalizeRole(
                          getRoleName(
                            selectedRole
                          ) ||
                            getRequestedRoleName(
                              selectedRequest
                            )
                        ) ===
                          "Dept. Coordinator" ||
                        normalizeRole(
                          getRoleName(
                            selectedRole
                          ) ||
                            getRequestedRoleName(
                              selectedRequest
                            )
                        ) ===
                          "Committee Member"
                      )
                        ? " *"
                        : ""}
                    </span>
                  </label>

                  <select
                    value={
                      selectedDepartment
                    }
                    onChange={(e) =>
                      setSelectedDepartment(
                        e.target.value
                      )
                    }
                    disabled={
                      actionLoading ||
                      !selectedFaculty
                    }
                  >

                    <option value="">
                      {!selectedFaculty
                        ? "Select faculty first"
                        : filteredDepartments.length ===
                          0
                        ? "No department available"
                        : "Select department"}
                    </option>

                    {filteredDepartments.map(
                      (
                        department
                      ) => (
                        <option
                          key={
                            department.id
                          }
                          value={
                            department.id
                          }
                        >
                          {
                            department.name
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>

              </div>

              <div className="approval-info">

                <UserCheck
                  size={17}
                />

                <span>
                  {currentRole ===
                  "Admin"
                    ? "Admin can assign the final role and organizational access."
                    : `Your approval authorizes the requested role. Final role assignment cannot be changed by ${currentRole}.`}
                </span>

              </div>

              <div className="modal-footer">

                <button
                  className="secondary-button"
                  onClick={
                    closeApproveModal
                  }
                  disabled={
                    actionLoading
                  }
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  onClick={
                    handleApprove
                  }
                  disabled={
                    actionLoading
                  }
                >

                  {actionLoading ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="spin"
                      />

                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={17}
                      />

                      Approve Registration
                    </>
                  )}

                </button>

              </div>

            </div>

          </div>
        )}

      {/* =========================
          REJECT MODAL
          ========================= */}

      {showRejectModal &&
        selectedRequest && (
          <div
            className="modal-overlay"
            onClick={
              closeRejectModal
            }
          >

            <div
              className="modal-card reject-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="modal-header">

                <div>

                  <h2>
                    Reject Registration
                  </h2>

                  <p>
                    Please provide a reason
                    for rejection.
                  </p>

                </div>

                <button
                  className="modal-close"
                  onClick={
                    closeRejectModal
                  }
                  disabled={
                    actionLoading
                  }
                >
                  <X size={20} />
                </button>

              </div>

              <div className="reject-applicant">

                <div className="applicant-avatar large">

                  {selectedRequest.full_name
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "U"}

                </div>

                <div>

                  <strong>
                    {
                      selectedRequest.full_name
                    }
                  </strong>

                  <span>
                    {
                      selectedRequest.email
                    }
                  </span>

                </div>

              </div>

              <div className="form-group">

                <label>
                  Rejection Reason{" "}
                  <span>*</span>
                </label>

                <textarea
                  rows="5"
                  value={
                    rejectReason
                  }
                  onChange={(e) =>
                    setRejectReason(
                      e.target.value
                    )
                  }
                  placeholder="Enter the reason for rejecting this registration request..."
                  disabled={
                    actionLoading
                  }
                />

              </div>

              <div className="modal-footer">

                <button
                  className="secondary-button"
                  onClick={
                    closeRejectModal
                  }
                  disabled={
                    actionLoading
                  }
                >
                  Cancel
                </button>

                <button
                  className="danger-button"
                  onClick={
                    handleReject
                  }
                  disabled={
                    actionLoading
                  }
                >

                  {actionLoading ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="spin"
                      />

                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle
                        size={17}
                      />

                      Reject Registration
                    </>
                  )}

                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
};

export default RegistrationRequests;