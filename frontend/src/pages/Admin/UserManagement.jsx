import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock3,
  ArrowRight,
  AlertCircle,
  UserCheck,
  UserX,
  ShieldCheck,
  X,
  Building2,
  Save,
} from "lucide-react";

import api from "../../services/api";
import "./UserManagement.css";

export const UserManagement = () => {
  const navigate = useNavigate();

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------

  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState("USERS");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [error, setError] = useState("");

  // --------------------------------------------------
  // CREATE USER STATE
  // --------------------------------------------------

  const [showCreateUser, setShowCreateUser] = useState(false);

  const [creatingUser, setCreatingUser] = useState(false);

  const [createUserError, setCreateUserError] = useState("");

  const [createUserSuccess, setCreateUserSuccess] =
    useState("");

  const [roles, setRoles] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loadingCreateData, setLoadingCreateData] =
    useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role_id: "",
    institution_id: "",
    department_id: "",
    is_active: true,
  });

  // --------------------------------------------------
  // EDIT USER STATE
  // --------------------------------------------------

  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingUserLoading, setEditingUserLoading] = useState(false);
  const [editingUserSaving, setEditingUserSaving] = useState(false);
  const [editUserError, setEditUserError] = useState("");
  const [editUserSuccess, setEditUserSuccess] = useState("");

  const [editUser, setEditUser] = useState({
    name: "",
    email: "",
    role_id: "",
    institution_id: "",
    department_id: "",
    is_active: true,
  });

  // --------------------------------------------------
  // ROLE HIERARCHY
  // --------------------------------------------------

  const REGISTRATION_AUTHORITY = {
    "Committee Member": "Dept. Coordinator",
    "Dept. Coordinator": "NAAC Coordinator",
    "NAAC Coordinator": "Principal / Director",
    "Principal / Director": "Admin",
    Reviewer: "Admin",
    "Data Approver": "Admin",
  };

  const getAuthorityForRole = (roleName) => {
    return REGISTRATION_AUTHORITY[roleName] || null;
  };

  // --------------------------------------------------
  // LOAD CURRENT USER
  // --------------------------------------------------

  const loadCurrentUser = async () => {
    try {
      const response = await api.get("/auth/me");

      const data = response.data;

      console.log("CURRENT USER:", data);

      setCurrentUser(data?.user || null);
      setCurrentRole(data?.role?.name || "");
    } catch (err) {
      console.error(
        "Failed to load current user:",
        err
      );
    }
  };

  // --------------------------------------------------
  // LOAD USERS + REGISTRATION REQUESTS
  // --------------------------------------------------

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        usersResponse,
        requestsResponse,
      ] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/registration-requests"),
      ]);

      const usersData = usersResponse.data;
      const requestsData = requestsResponse.data;

      console.log(
        "USER MANAGEMENT - USERS:",
        usersData
      );

      console.log(
        "USER MANAGEMENT - REGISTRATION REQUESTS:",
        requestsData
      );

      if (Array.isArray(usersData)) {
        setUsers(usersData);
      } else {
        setUsers(
          usersData?.users ||
            usersData?.data ||
            []
        );
      }

      if (Array.isArray(requestsData)) {
        setRequests(requestsData);
      } else {
        setRequests(
          requestsData?.requests ||
            requestsData?.data ||
            []
        );
      }
    } catch (err) {
      console.error(
        "Failed to load user management data:",
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Unable to load user management data.";

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --------------------------------------------------
  // LOAD CREATE USER DATA
  // --------------------------------------------------

  const loadCreateUserData = async () => {
    try {
      setLoadingCreateData(true);
      setCreateUserError("");

      const [
        rolesResponse,
        institutionsResponse,
      ] = await Promise.all([
        api.get("/admin/roles"),
        api.get("/admin/institutions"),
      ]);

      const rolesData = rolesResponse.data;
      const institutionsData =
        institutionsResponse.data;

      console.log(
        "CREATE USER - ROLES:",
        rolesData
      );

      console.log(
        "CREATE USER - INSTITUTIONS:",
        institutionsData
      );

      const rolesList = Array.isArray(rolesData)
        ? rolesData
        : rolesData?.roles ||
          rolesData?.data ||
          [];

      const institutionsList =
        Array.isArray(institutionsData)
          ? institutionsData
          : institutionsData?.institutions ||
            institutionsData?.data ||
            [];

      setRoles(rolesList);
      setInstitutions(institutionsList);

      // If Institution Admin is logged in,
      // automatically select their institution.
      const loggedInInstitutionId =
        currentUser?.institution_id;

      if (
        currentRole === "Institution Admin" &&
        loggedInInstitutionId
      ) {
        setNewUser((previous) => ({
          ...previous,
          institution_id:
            String(loggedInInstitutionId),
        }));
      }
    } catch (err) {
      console.error(
        "Failed to load create-user data:",
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Unable to load roles and institutions.";

      setCreateUserError(message);
    } finally {
      setLoadingCreateData(false);
    }
  };

  // --------------------------------------------------
  // LOAD DEPARTMENTS
  // --------------------------------------------------

  const loadDepartments = async (institutionId) => {
    if (!institutionId) {
      setDepartments([]);
      return;
    }

    try {
      const response = await api.get(
        `/departments?institution_id=${institutionId}`
      );

      const data = response.data;

      const departmentList = Array.isArray(data)
        ? data
        : data?.departments ||
          data?.data ||
          [];

      setDepartments(departmentList);
    } catch (err) {
      console.error(
        "Failed to load departments:",
        err
      );

      // Department loading should not block
      // Institution Admin creation.
      setDepartments([]);
    }
  };

  // --------------------------------------------------
  // EDIT USER
  // --------------------------------------------------

  const selectedRoleNameForEdit = (rolesList, roleId) => {
    return (
      rolesList.find(
        (role) => String(role.id) === String(roleId)
      )?.name || ""
    );
  };

  const openEditUser = async (user) => {
    try {
      setEditingUser(user);
      setShowEditUser(true);
      setEditingUserLoading(true);
      setEditUserError("");
      setEditUserSuccess("");

      let rolesList = roles;
      let institutionsList = institutions;

      if (rolesList.length === 0 || institutionsList.length === 0) {
        const [rolesResponse, institutionsResponse] = await Promise.all([
          api.get("/admin/roles"),
          api.get("/admin/institutions"),
        ]);

        const rolesData = rolesResponse.data;
        const institutionsData = institutionsResponse.data;

        rolesList = Array.isArray(rolesData)
          ? rolesData
          : rolesData?.roles || rolesData?.data || [];

        institutionsList = Array.isArray(institutionsData)
          ? institutionsData
          : institutionsData?.institutions || institutionsData?.data || [];

        setRoles(rolesList);
        setInstitutions(institutionsList);
      }

      const roleId =
        user.role_id ||
        rolesList.find(
          (role) =>
            String(role.name) ===
            String(user.role_name || user.role)
        )?.id ||
        "";

      const institutionId = user.institution_id || "";

      setEditUser({
        name: user.name || "",
        email: user.email || "",
        role_id: roleId ? String(roleId) : "",
        institution_id: institutionId ? String(institutionId) : "",
        department_id: user.department_id ? String(user.department_id) : "",
        is_active: user.is_active !== false,
      });

      if (institutionId) {
        await loadDepartments(institutionId);
      } else {
        setDepartments([]);
      }
    } catch (err) {
      console.error("Failed to open edit user:", err);
      setEditUserError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load user details."
      );
    } finally {
      setEditingUserLoading(false);
    }
  };

  const closeEditUser = () => {
    if (editingUserSaving) return;

    setShowEditUser(false);
    setEditingUser(null);
    setEditUserError("");
    setEditUserSuccess("");
    setDepartments([]);
  };

  const handleEditUserChange = (field, value) => {
    setEditUser((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (field === "institution_id") {
      setEditUser((previous) => ({
        ...previous,
        institution_id: value,
        department_id: "",
      }));

      loadDepartments(value);
    }

    if (field === "role_id") {
      const roleName = selectedRoleNameForEdit(roles, value);

      if (roleName === "Institution Admin") {
        setEditUser((previous) => ({
          ...previous,
          role_id: value,
          department_id: "",
        }));
      }
    }

    setEditUserError("");
    setEditUserSuccess("");
  };

  const handleEditUser = async (event) => {
    event.preventDefault();

    if (!editingUser?.id) {
      setEditUserError("Invalid user selected.");
      return;
    }

    if (!editUser.name.trim()) {
      setEditUserError("Please enter the user's name.");
      return;
    }

    if (!editUser.email.trim()) {
      setEditUserError("Please enter the user's email.");
      return;
    }

    if (!editUser.role_id) {
      setEditUserError("Please select a role.");
      return;
    }

    if (!editUser.institution_id) {
      setEditUserError("Please select an institution.");
      return;
    }

    const selectedRole = roles.find(
      (role) => String(role.id) === String(editUser.role_id)
    );

    const selectedRoleName = selectedRole?.name || "";

    const payload = {
      name: editUser.name.trim(),
      email: editUser.email.trim(),
      role_id: Number(editUser.role_id),
      institution_id: Number(editUser.institution_id),
      department_id:
        selectedRoleName === "Institution Admin"
          ? null
          : editUser.department_id
          ? Number(editUser.department_id)
          : null,
      is_active: editUser.is_active,
    };

    try {
      setEditingUserSaving(true);
      setEditUserError("");
      setEditUserSuccess("");

      console.log("UPDATE USER PAYLOAD:", payload);

      await api.put(`/admin/users/${editingUser.id}`, payload);

      setEditUserSuccess(
        `User "${editUser.name}" was updated successfully.`
      );

      await loadData(true);

      setTimeout(() => {
        closeEditUser();
      }, 1000);
    } catch (err) {
      console.error("Failed to update user:", err);

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Unable to update user.";

      setEditUserError(message);
    } finally {
      setEditingUserSaving(false);
    }
  };

  // --------------------------------------------------
  // OPEN CREATE USER
  // --------------------------------------------------

  const openCreateUser = async () => {
    setShowCreateUser(true);

    setCreateUserError("");
    setCreateUserSuccess("");

    setNewUser({
      name: "",
      email: "",
      password: "",
      role_id: "",
      institution_id:
        currentRole === "Institution Admin" &&
        currentUser?.institution_id
          ? String(currentUser.institution_id)
          : "",
      department_id: "",
      is_active: true,
    });

    await loadCreateUserData();

    if (
      currentRole === "Institution Admin" &&
      currentUser?.institution_id
    ) {
      await loadDepartments(
        currentUser.institution_id
      );
    }
  };

  // --------------------------------------------------
  // CLOSE CREATE USER
  // --------------------------------------------------

  const closeCreateUser = () => {
    if (creatingUser) return;

    setShowCreateUser(false);
    setCreateUserError("");
    setCreateUserSuccess("");
    setDepartments([]);
  };

  // --------------------------------------------------
  // FORM CHANGE
  // --------------------------------------------------

  const handleCreateUserChange = (field, value) => {
    setNewUser((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (field === "institution_id") {
      setNewUser((previous) => ({
        ...previous,
        institution_id: value,
        department_id: "",
      }));

      loadDepartments(value);
    }

    setCreateUserError("");
    setCreateUserSuccess("");
  };

  // --------------------------------------------------
  // CREATE USER
  // --------------------------------------------------

  const handleCreateUser = async (event) => {
    event.preventDefault();

    setCreateUserError("");
    setCreateUserSuccess("");

    const name = newUser.name.trim();
    const email = newUser.email.trim();
    const password = newUser.password;

    if (!name) {
      setCreateUserError(
        "Please enter the user's name."
      );
      return;
    }

    if (!email) {
      setCreateUserError(
        "Please enter the user's email."
      );
      return;
    }

    if (!password) {
      setCreateUserError(
        "Please enter a password."
      );
      return;
    }

    if (password.length < 6) {
      setCreateUserError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (!newUser.role_id) {
      setCreateUserError(
        "Please select a role."
      );
      return;
    }

    if (!newUser.institution_id) {
      setCreateUserError(
        "Please select an institution."
      );
      return;
    }

    const selectedRole = roles.find(
      (role) =>
        String(role.id) ===
        String(newUser.role_id)
    );

    const selectedRoleName =
      selectedRole?.name || "";

    // Institution Admin must always belong
    // to an institution.
    if (
      selectedRoleName ===
        "Institution Admin" &&
      !newUser.institution_id
    ) {
      setCreateUserError(
        "Institution Admin must be assigned to an institution."
      );
      return;
    }

    // Institution Admin should not be assigned
    // to a department.
    if (
      selectedRoleName ===
      "Institution Admin"
    ) {
      newUser.department_id = "";
    }

    try {
      setCreatingUser(true);

      const payload = {
        name,
        email,
        password,
        role_id: Number(newUser.role_id),
        institution_id: Number(
          newUser.institution_id
        ),
        department_id:
          newUser.department_id
            ? Number(newUser.department_id)
            : null,
        is_active: newUser.is_active,
      };

      console.log(
        "CREATE USER PAYLOAD:",
        payload
      );

      await api.post(
        "/admin/users",
        payload
      );

      setCreateUserSuccess(
        `User "${name}" was created successfully.`
      );

      await loadData(true);

      setTimeout(() => {
        setShowCreateUser(false);
        setCreateUserSuccess("");
      }, 1000);
    } catch (err) {
      console.error(
        "Failed to create user:",
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Unable to create user.";

      setCreateUserError(message);
    } finally {
      setCreatingUser(false);
    }
  };

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    loadCurrentUser();
    loadData();
  }, []);

  // --------------------------------------------------
  // REQUEST COUNTS
  // --------------------------------------------------

  const requestCounts = useMemo(() => {
    return {
      total: requests.length,

      pending: requests.filter(
        (request) =>
          String(
            request.status || ""
          ).toUpperCase() === "PENDING"
      ).length,

      approved: requests.filter(
        (request) =>
          String(
            request.status || ""
          ).toUpperCase() === "APPROVED"
      ).length,

      rejected: requests.filter(
        (request) =>
          String(
            request.status || ""
          ).toUpperCase() === "REJECTED"
      ).length,
    };
  }, [requests]);

  // --------------------------------------------------
  // USER COUNTS
  // --------------------------------------------------

  const userCounts = useMemo(() => {
    const active = users.filter(
      (user) => user.is_active === true
    ).length;

    const inactive = users.filter(
      (user) => user.is_active === false
    ).length;

    return {
      total: users.length,
      active,
      inactive,
    };
  }, [users]);

  // --------------------------------------------------
  // FILTER USERS
  // --------------------------------------------------

  const filteredUsers = useMemo(() => {
    const search = searchTerm
      .toLowerCase()
      .trim();

    return users.filter((user) => {
      const isActive =
        user.is_active === true;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" &&
          isActive) ||
        (statusFilter === "INACTIVE" &&
          !isActive);

      const matchesSearch =
        !search ||
        String(user.name || "")
          .toLowerCase()
          .includes(search) ||
        String(user.email || "")
          .toLowerCase()
          .includes(search) ||
        String(user.institution_name || "")
          .toLowerCase()
          .includes(search) ||
        String(user.institution || "")
          .toLowerCase()
          .includes(search) ||
        String(user.faculty_name || "")
          .toLowerCase()
          .includes(search) ||
        String(user.faculty || "")
          .toLowerCase()
          .includes(search) ||
        String(user.department_name || "")
          .toLowerCase()
          .includes(search) ||
        String(user.department || "")
          .toLowerCase()
          .includes(search) ||
        String(user.role_name || "")
          .toLowerCase()
          .includes(search) ||
        String(user.role || "")
          .toLowerCase()
          .includes(search);

      return (
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    users,
    searchTerm,
    statusFilter,
  ]);

  // --------------------------------------------------
  // FILTER REQUESTS
  // --------------------------------------------------

  const filteredRequests = useMemo(() => {
    const search = searchTerm
      .toLowerCase()
      .trim();

    return requests.filter((request) => {
      const status = String(
        request.status || ""
      ).toUpperCase();

      const matchesStatus =
        statusFilter === "ALL" ||
        status === statusFilter;

      const matchesSearch =
        !search ||
        String(request.full_name || "")
          .toLowerCase()
          .includes(search) ||
        String(request.email || "")
          .toLowerCase()
          .includes(search) ||
        String(request.institution || "")
          .toLowerCase()
          .includes(search) ||
        String(request.institution_name || "")
          .toLowerCase()
          .includes(search) ||
        String(request.department || "")
          .toLowerCase()
          .includes(search) ||
        String(request.department_name || "")
          .toLowerCase()
          .includes(search) ||
        String(request.designation || "")
          .toLowerCase()
          .includes(search) ||
        String(
          request.requested_role_name ||
            request.requested_role ||
            request.role_name ||
            request.role ||
            ""
        )
          .toLowerCase()
          .includes(search);

      return (
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    requests,
    searchTerm,
    statusFilter,
  ]);

  // --------------------------------------------------
  // DATE
  // --------------------------------------------------

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // --------------------------------------------------
  // USER STATUS
  // --------------------------------------------------

  const getUserStatus = (isActive) => {
    if (isActive) {
      return (
        <span className="um-status approved">
          <CheckCircle2 size={14} />
          Active
        </span>
      );
    }

    return (
      <span className="um-status rejected">
        <XCircle size={14} />
        Inactive
      </span>
    );
  };

  // --------------------------------------------------
  // REQUEST STATUS
  // --------------------------------------------------

  const getRequestStatus = (status) => {
    const normalized = String(
      status || ""
    ).toUpperCase();

    if (normalized === "APPROVED") {
      return (
        <span className="um-status approved">
          <CheckCircle2 size={14} />
          Approved
        </span>
      );
    }

    if (normalized === "REJECTED") {
      return (
        <span className="um-status rejected">
          <XCircle size={14} />
          Rejected
        </span>
      );
    }

    return (
      <span className="um-status pending">
        <Clock3 size={14} />
        Pending
      </span>
    );
  };

  // --------------------------------------------------
  // REQUESTED ROLE
  // --------------------------------------------------

  const getRequestedRole = (request) => {
    return (
      request.requested_role_name ||
      request.requested_role ||
      request.role_name ||
      request.role ||
      "—"
    );
  };

  // --------------------------------------------------
  // AUTHORITY LABEL
  // --------------------------------------------------

  const getAuthorityLabel = () => {
    if (!currentRole) {
      return "Loading authorization...";
    }

    if (currentRole === "Admin") {
      return "Admin can authorize all registration requests.";
    }

    const authority =
      getAuthorityForRole(currentRole);

    if (!authority) {
      return `${currentRole} does not have registration authorization.`;
    }

    return `${currentRole} authorizes requests assigned to this level.`;
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="user-management-page">
        <div className="um-loading">
          <div className="um-spinner"></div>
          <p>
            Loading user management...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="user-management-page">

      {/* HEADER */}

      <div className="um-header">

        <div>
          <div className="um-eyebrow">
            ADMINISTRATION
          </div>

          <h1>User Management</h1>

          <p>
            Manage users, registration
            requests, roles, and
            institutional access.
          </p>
        </div>

        <div className="um-header-actions">

          <button
            className="um-refresh-btn"
            onClick={() =>
              loadData(true)
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "um-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          {/* CREATE USER */}

          <button
            className="um-primary-btn"
            onClick={openCreateUser}
          >
            <UserPlus size={17} />
            Create User
          </button>

          <button
            className="um-primary-btn"
            onClick={() =>
              navigate(
                "/admin/registration-requests"
              )
            }
          >
            <UserPlus size={17} />
            Registration Requests
          </button>

        </div>

      </div>

      {/* ERROR */}

      {error && (
        <div className="um-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* AUTHORITY INFORMATION */}

      <div
        className="um-alert"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <ShieldCheck size={18} />

        <span>
          <strong>
            Authorization:
          </strong>{" "}
          {getAuthorityLabel()}
        </span>
      </div>

      {/* USER STATS */}

      <div className="um-stats">

        <div className="um-stat-card">
          <div className="um-stat-icon total">
            <Users size={20} />
          </div>

          <div>
            <span>Total Users</span>
            <strong>
              {userCounts.total}
            </strong>
          </div>
        </div>

        <div className="um-stat-card">
          <div className="um-stat-icon approved">
            <UserCheck size={20} />
          </div>

          <div>
            <span>Active Users</span>
            <strong>
              {userCounts.active}
            </strong>
          </div>
        </div>

        <div className="um-stat-card">
          <div className="um-stat-icon pending">
            <Clock3 size={20} />
          </div>

          <div>
            <span>Pending Requests</span>
            <strong>
              {requestCounts.pending}
            </strong>
          </div>
        </div>

        <div className="um-stat-card">
          <div className="um-stat-icon rejected">
            <UserX size={20} />
          </div>

          <div>
            <span>Inactive Users</span>
            <strong>
              {userCounts.inactive}
            </strong>
          </div>
        </div>

      </div>

      {/* TABS */}

      <div className="um-tabs">

        <button
          className={
            activeTab === "USERS"
              ? "um-tab active"
              : "um-tab"
          }
          onClick={() => {
            setActiveTab("USERS");
            setSearchTerm("");
            setStatusFilter("ALL");
          }}
        >
          <Users size={16} />
          Users
          <span>
            {userCounts.total}
          </span>
        </button>

        <button
          className={
            activeTab === "REQUESTS"
              ? "um-tab active"
              : "um-tab"
          }
          onClick={() => {
            setActiveTab("REQUESTS");
            setSearchTerm("");
            setStatusFilter("ALL");
          }}
        >
          <UserPlus size={16} />
          Registration Requests
          <span>
            {requestCounts.total}
          </span>
        </button>

      </div>

      {/* MAIN PANEL */}

      <div className="um-panel">

        {/* USERS */}

        {activeTab === "USERS" && (
          <>
            <div className="um-panel-header">

              <div>
                <h2>
                  Platform Users
                </h2>

                <p>
                  Manage approved users and
                  their institutional access.
                </p>
              </div>

              <button
                className="um-view-all"
                onClick={() =>
                  navigate(
                    "/admin/registration-requests"
                  )
                }
              >
                Registration Requests
                <ArrowRight size={16} />
              </button>

            </div>

            {/* FILTER BAR */}

            <div className="um-toolbar">

              <div className="um-search">

                <Search size={17} />

                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                />

              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
              >
                <option value="ALL">
                  All Users
                </option>

                <option value="ACTIVE">
                  Active
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>
              </select>

            </div>

            {/* USER TABLE */}

            <div className="um-table-wrapper">

              {filteredUsers.length ===
              0 ? (
                <div className="um-empty">

                  <Users size={40} />

                  <h3>
                    No users found
                  </h3>

                  <p>
                    No users match your
                    current filters.
                  </p>

                </div>
              ) : (
                <table className="um-table">

                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Institution</th>
                      <th>Faculty</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {filteredUsers.map(
                      (user) => {

                        const initial =
                          String(
                            user.name ||
                              "U"
                          )
                            .charAt(0)
                            .toUpperCase();

                        return (
                          <tr
                            key={user.id}
                          >

                            <td>
                              <div className="um-user">

                                <div className="um-avatar">
                                  {initial}
                                </div>

                                <div>
                                  <strong>
                                    {user.name ||
                                      "—"}
                                  </strong>

                                  <span>
                                    {user.email ||
                                      "—"}
                                  </span>
                                </div>

                              </div>
                            </td>

                            <td>
                              {user.institution_name ||
                                user.institution ||
                                "—"}
                            </td>

                            <td>
                              {user.faculty_name ||
                                user.faculty ||
                                "—"}
                            </td>

                            <td>
                              {user.department_name ||
                                user.department ||
                                "—"}
                            </td>

                            <td>
                              {user.role_name ||
                                user.role ||
                                "—"}
                            </td>

                            <td>
                              {getUserStatus(
                                user.is_active
                              )}
                            </td>

                            <td>
                              <button
                                type="button"
                                className="um-view-btn"
                                onClick={() => openEditUser(user)}
                              >
                                <Edit2
                                  size={15}
                                />
                                Edit
                              </button>
                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>
              )}

            </div>

            <div className="um-footer">
              Showing{" "}
              {filteredUsers.length} of{" "}
              {users.length} users
            </div>
          </>
        )}

        {/* REGISTRATION REQUESTS */}

        {activeTab === "REQUESTS" && (
          <>
            <div className="um-panel-header">

              <div>
                <h2>
                  Registration Requests
                </h2>

                <p>
                  Requests are routed to the
                  authorized role according to
                  the registration hierarchy.
                </p>
              </div>

              <button
                className="um-view-all"
                onClick={() =>
                  navigate(
                    "/admin/registration-requests"
                  )
                }
              >
                Manage Requests
                <ArrowRight size={16} />
              </button>

            </div>

            {/* REQUEST FILTER BAR */}

            <div className="um-toolbar">

              <div className="um-search">

                <Search size={17} />

                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                />

              </div>

              <select
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

            {/* REQUEST TABLE */}

            <div className="um-table-wrapper">

              {filteredRequests.length ===
              0 ? (
                <div className="um-empty">

                  <UserPlus size={40} />

                  <h3>
                    No requests found
                  </h3>

                  <p>
                    There are no registration
                    requests matching your
                    filters.
                  </p>

                </div>
              ) : (
                <table className="um-table">

                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Institution</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Requested Role</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {filteredRequests.map(
                      (request) => {

                        const initial =
                          String(
                            request.full_name ||
                              "U"
                          )
                            .charAt(0)
                            .toUpperCase();

                        const requestedRole =
                          getRequestedRole(
                            request
                          );

                        const requiredAuthority =
                          getAuthorityForRole(
                            requestedRole
                          );

                        return (
                          <tr
                            key={request.id}
                          >

                            <td>
                              <div className="um-user">

                                <div className="um-avatar">
                                  {initial}
                                </div>

                                <div>

                                  <strong>
                                    {request.full_name ||
                                      "—"}
                                  </strong>

                                  <span>
                                    {request.email ||
                                      "—"}
                                  </span>

                                </div>

                              </div>
                            </td>

                            <td>
                              {request.institution ||
                                request.institution_name ||
                                "—"}
                            </td>

                            <td>
                              {request.department ||
                                request.department_name ||
                                "—"}
                            </td>

                            <td>
                              {request.designation ||
                                "—"}
                            </td>

                            <td>
                              <div>

                                <strong>
                                  {requestedRole}
                                </strong>

                                {requiredAuthority && (
                                  <span
                                    style={{
                                      display:
                                        "block",
                                      fontSize:
                                        "11px",
                                      marginTop:
                                        "4px",
                                      opacity:
                                        0.7,
                                    }}
                                  >
                                    Authority:{" "}
                                    {
                                      requiredAuthority
                                    }
                                  </span>
                                )}

                              </div>
                            </td>

                            <td>
                              {getRequestStatus(
                                request.status
                              )}
                            </td>

                            <td>
                              {formatDate(
                                request.created_at
                              )}
                            </td>

                            <td>
                              <button
                                className="um-view-btn"
                                onClick={() =>
                                  navigate(
                                    "/admin/registration-requests"
                                  )
                                }
                              >
                                <Eye
                                  size={15}
                                />
                                View
                              </button>
                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>
              )}

            </div>

            <div className="um-footer">
              Showing{" "}
              {filteredRequests.length} of{" "}
              {requests.length} registration
              requests
            </div>

          </>
        )}

      </div>

      {/* ==================================================
          CREATE USER MODAL
         ================================================== */}

      {showCreateUser && (
        <div
          className="um-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreateUser();
            }
          }}
        >

          <div className="um-modal">

            {/* MODAL HEADER */}

            <div className="um-modal-header">

              <div>
                <div className="um-modal-icon">
                  <UserPlus size={20} />
                </div>

                <div>
                  <h2>
                    Create User
                  </h2>

                  <p>
                    Create an account and assign
                    institutional access.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="um-modal-close"
                onClick={closeCreateUser}
                disabled={creatingUser}
              >
                <X size={20} />
              </button>

            </div>

            {/* MODAL BODY */}

            <form
              className="um-create-form"
              onSubmit={
                handleCreateUser
              }
            >

              {createUserError && (
                <div className="um-alert um-modal-alert">
                  <AlertCircle
                    size={17}
                  />
                  <span>
                    {createUserError}
                  </span>
                </div>
              )}

              {createUserSuccess && (
                <div className="um-alert um-modal-success">
                  <CheckCircle2
                    size={17}
                  />
                  <span>
                    {createUserSuccess}
                  </span>
                </div>
              )}

              {loadingCreateData ? (
                <div className="um-create-loading">
                  <div className="um-spinner"></div>
                  <p>
                    Loading roles and
                    institutions...
                  </p>
                </div>
              ) : (
                <>
                  {/* NAME */}

                  <div className="um-form-group">

                    <label>
                      Full Name
                    </label>

                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={newUser.name}
                      onChange={(e) =>
                        handleCreateUserChange(
                          "name",
                          e.target.value
                        )
                      }
                      required
                    />

                  </div>

                  {/* EMAIL */}

                  <div className="um-form-group">

                    <label>
                      Email
                    </label>

                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={(e) =>
                        handleCreateUserChange(
                          "email",
                          e.target.value
                        )
                      }
                      required
                    />

                  </div>

                  {/* PASSWORD */}

                  <div className="um-form-group">

                    <label>
                      Password
                    </label>

                    <input
                      type="password"
                      placeholder="Enter password"
                      value={newUser.password}
                      onChange={(e) =>
                        handleCreateUserChange(
                          "password",
                          e.target.value
                        )
                      }
                      required
                    />

                  </div>

                  {/* ROLE */}

                  <div className="um-form-group">

                    <label>
                      Role
                    </label>

                    <select
                      value={newUser.role_id}
                      onChange={(e) =>
                        handleCreateUserChange(
                          "role_id",
                          e.target.value
                        )
                      }
                      required
                    >
                      <option value="">
                        Select Role
                      </option>

                      {roles.map(
                        (role) => (
                          <option
                            key={role.id}
                            value={role.id}
                          >
                            {role.name}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  {/* INSTITUTION */}

                  <div className="um-form-group">

                    <label>
                      <Building2
                        size={14}
                      />
                      Institution
                    </label>

                    <select
                      value={
                        newUser.institution_id
                      }
                      onChange={(e) =>
                        handleCreateUserChange(
                          "institution_id",
                          e.target.value
                        )
                      }
                      required
                      disabled={
                        currentRole ===
                          "Institution Admin" &&
                        Boolean(
                          currentUser?.institution_id
                        )
                      }
                    >
                      <option value="">
                        Select Institution
                      </option>

                      {institutions.map(
                        (institution) => (
                          <option
                            key={
                              institution.id
                            }
                            value={
                              institution.id
                            }
                          >
                            {institution.name}
                          </option>
                        )
                      )}

                    </select>

                    {currentRole ===
                      "Institution Admin" && (
                      <small>
                        Your institution is
                        automatically selected.
                      </small>
                    )}

                  </div>

                  {/* DEPARTMENT */}

                  <div className="um-form-group">

                    <label>
                      Department
                      <span className="um-optional">
                        Optional
                      </span>
                    </label>

                    <select
                      value={
                        newUser.department_id
                      }
                      onChange={(e) =>
                        handleCreateUserChange(
                          "department_id",
                          e.target.value
                        )
                      }
                      disabled={
                        !newUser.institution_id ||
                        roles.find(
                          (role) =>
                            String(
                              role.id
                            ) ===
                            String(
                              newUser.role_id
                            )
                        )?.name ===
                          "Institution Admin"
                      }
                    >
                      <option value="">
                        Select Department
                      </option>

                      {departments.map(
                        (department) => (
                          <option
                            key={
                              department.id
                            }
                            value={
                              department.id
                            }
                          >
                            {department.name}
                          </option>
                        )
                      )}

                    </select>

                    {roles.find(
                      (role) =>
                        String(role.id) ===
                        String(
                          newUser.role_id
                        )
                    )?.name ===
                      "Institution Admin" && (
                      <small>
                        Institution Admin does not
                        require a department.
                      </small>
                    )}

                  </div>

                  {/* ACTIVE */}

                  <div className="um-checkbox-row">

                    <input
                      id="create-user-active"
                      type="checkbox"
                      checked={
                        newUser.is_active
                      }
                      onChange={(e) =>
                        handleCreateUserChange(
                          "is_active",
                          e.target.checked
                        )
                      }
                    />

                    <label htmlFor="create-user-active">
                      Create account as active
                    </label>

                  </div>

                  {/* ACTIONS */}

                  <div className="um-modal-actions">

                    <button
                      type="button"
                      className="um-cancel-btn"
                      onClick={
                        closeCreateUser
                      }
                      disabled={
                        creatingUser
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="um-primary-btn"
                      disabled={
                        creatingUser
                      }
                    >
                      {creatingUser ? (
                        <>
                          <RefreshCw
                            size={16}
                            className="um-spin"
                          />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Create User
                        </>
                      )}
                    </button>

                  </div>
                </>
              )}

            </form>

          </div>

        </div>
      )}


      {/* ==================================================
          EDIT USER MODAL
         ================================================== */}

      {showEditUser && (
        <div
          className="um-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditUser();
            }
          }}
        >
          <div className="um-modal">

            <div className="um-modal-header">
              <div>
                <div className="um-modal-icon">
                  <Edit2 size={20} />
                </div>

                <div>
                  <h2>Edit User</h2>
                  <p>
                    Update user details and institutional assignment.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="um-modal-close"
                onClick={closeEditUser}
                disabled={editingUserSaving}
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="um-create-form"
              onSubmit={handleEditUser}
            >
              {editUserError && (
                <div className="um-alert um-modal-alert">
                  <AlertCircle size={17} />
                  <span>{editUserError}</span>
                </div>
              )}

              {editUserSuccess && (
                <div className="um-alert um-modal-success">
                  <CheckCircle2 size={17} />
                  <span>{editUserSuccess}</span>
                </div>
              )}

              {editingUserLoading ? (
                <div className="um-create-loading">
                  <div className="um-spinner"></div>
                  <p>Loading user details...</p>
                </div>
              ) : (
                <>
                  <div className="um-form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={editUser.name}
                      onChange={(e) =>
                        handleEditUserChange("name", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="um-form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={editUser.email}
                      onChange={(e) =>
                        handleEditUserChange("email", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="um-form-group">
                    <label>Role</label>
                    <select
                      value={editUser.role_id}
                      onChange={(e) =>
                        handleEditUserChange("role_id", e.target.value)
                      }
                      required
                    >
                      <option value="">Select Role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="um-form-group">
                    <label>
                      <Building2 size={14} />
                      Institution
                    </label>

                    <select
                      value={editUser.institution_id}
                      onChange={(e) =>
                        handleEditUserChange(
                          "institution_id",
                          e.target.value
                        )
                      }
                      required
                      disabled={
                        currentRole === "Institution Admin" &&
                        Boolean(currentUser?.institution_id)
                      }
                    >
                      <option value="">Select Institution</option>
                      {institutions.map((institution) => (
                        <option
                          key={institution.id}
                          value={institution.id}
                        >
                          {institution.name}
                        </option>
                      ))}
                    </select>

                    {currentRole === "Institution Admin" && (
                      <small>
                        Your institution is automatically selected.
                      </small>
                    )}
                  </div>

                  <div className="um-form-group">
                    <label>
                      Department
                      <span className="um-optional">Optional</span>
                    </label>

                    <select
                      value={editUser.department_id}
                      onChange={(e) =>
                        handleEditUserChange(
                          "department_id",
                          e.target.value
                        )
                      }
                      disabled={
                        !editUser.institution_id ||
                        selectedRoleNameForEdit(
                          roles,
                          editUser.role_id
                        ) === "Institution Admin"
                      }
                    >
                      <option value="">Select Department</option>
                      {departments.map((department) => (
                        <option
                          key={department.id}
                          value={department.id}
                        >
                          {department.name}
                        </option>
                      ))}
                    </select>

                    {selectedRoleNameForEdit(
                      roles,
                      editUser.role_id
                    ) === "Institution Admin" && (
                      <small>
                        Institution Admin does not require a department.
                      </small>
                    )}
                  </div>

                  <div className="um-checkbox-row">
                    <input
                      id="edit-user-active"
                      type="checkbox"
                      checked={editUser.is_active}
                      onChange={(e) =>
                        handleEditUserChange(
                          "is_active",
                          e.target.checked
                        )
                      }
                    />
                    <label htmlFor="edit-user-active">
                      Account is active
                    </label>
                  </div>

                  <div className="um-modal-actions">
                    <button
                      type="button"
                      className="um-cancel-btn"
                      onClick={closeEditUser}
                      disabled={editingUserSaving}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="um-primary-btn"
                      disabled={editingUserSaving}
                    >
                      {editingUserSaving ? (
                        <>
                          <RefreshCw size={16} className="um-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagement;