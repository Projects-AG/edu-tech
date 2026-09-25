import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./Register.css";

function Register() {
  /* =========================================================
     REGISTRATION FORM
  ========================================================= */

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    institution_id: "",
    faculty_id: "",
    department_id: "",
    role_id: "",
    designation: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  /* =========================================================
     DROPDOWN DATA
  ========================================================= */

  const [institutions, setInstitutions] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);

  /* =========================================================
     LOADING
  ========================================================= */

  const [loadingInstitutions, setLoadingInstitutions] =
    useState(true);

  const [loadingFaculties, setLoadingFaculties] =
    useState(false);

  const [loadingDepartments, setLoadingDepartments] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  /* =========================================================
     MESSAGES
  ========================================================= */

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  /* =========================================================
     REQUEST NEW INSTITUTION
  ========================================================= */

  const [showInstitutionRequest, setShowInstitutionRequest] =
    useState(false);

  const [institutionRequest, setInstitutionRequest] =
    useState({
      institution_name: "",
      institution_code: "",
      official_email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      institution_type: "",
      website: "",
    });

  const [requestSubmitting, setRequestSubmitting] =
    useState(false);

  const [requestSuccess, setRequestSuccess] =
    useState(false);

  const [requestError, setRequestError] =
    useState("");

  /* =========================================================
     ROLES
  ========================================================= */

  const roles = [
    { id: 1, name: "NAAC Coordinator" },
    { id: 2, name: "Committee Member" },
    { id: 3, name: "Dept. Coordinator" },
    { id: 4, name: "Reviewer" },
    { id: 5, name: "Data Approver" },
    { id: 6, name: "Principal / Director" },
  ];

  /* =========================================================
     HELPER - EXTRACT API ERROR
  ========================================================= */

  const getApiErrorMessage = (
    err,
    fallbackMessage
  ) => {
    const detail = err?.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          if (item?.msg) {
            return item.msg;
          }

          return "Validation error";
        })
        .join(", ");
    }

    if (typeof detail === "string") {
      return detail;
    }

    if (
      typeof err?.response?.data === "string"
    ) {
      return err.response.data;
    }

    return fallbackMessage;
  };

  /* =========================================================
     LOAD INSTITUTIONS
  ========================================================= */

  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        setLoadingInstitutions(true);
        setError("");

        const response = await api.get(
          "/auth/institutions"
        );

        console.log(
          "INSTITUTIONS RESPONSE:",
          response.data
        );

        setInstitutions(
          Array.isArray(response.data)
            ? response.data
            : []
        );
      } catch (err) {
        console.error(
          "INSTITUTIONS ERROR:",
          err
        );

        setInstitutions([]);

        setError(
          getApiErrorMessage(
            err,
            "Unable to load institutions."
          )
        );
      } finally {
        setLoadingInstitutions(false);
      }
    };

    loadInstitutions();
  }, []);

  /* =========================================================
     LOAD FACULTIES
  ========================================================= */

  const loadFaculties = async (
    institutionId
  ) => {
    if (!institutionId) {
      setFaculties([]);
      return;
    }

    try {
      setLoadingFaculties(true);
      setError("");

      const response = await api.get(
        "/auth/faculties",
        {
          params: {
            institution_id:
              Number(institutionId),
          },
        }
      );

      console.log(
        "FACULTIES RESPONSE:",
        response.data
      );

      setFaculties(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      console.error(
        "FACULTIES ERROR:",
        err
      );

      setFaculties([]);

      setError(
        getApiErrorMessage(
          err,
          "Unable to load faculties."
        )
      );
    } finally {
      setLoadingFaculties(false);
    }
  };

  /* =========================================================
     LOAD DEPARTMENTS
  ========================================================= */

  const loadDepartments = async (
    institutionId,
    facultyId
  ) => {
    if (!institutionId || !facultyId) {
      setDepartments([]);
      return;
    }

    try {
      setLoadingDepartments(true);
      setError("");

      const response = await api.get(
        "/auth/departments",
        {
          params: {
            institution_id:
              Number(institutionId),

            faculty_id:
              Number(facultyId),
          },
        }
      );

      console.log(
        "DEPARTMENTS RESPONSE:",
        response.data
      );

      setDepartments(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      console.error(
        "DEPARTMENTS ERROR:",
        err
      );

      setDepartments([]);

      setError(
        getApiErrorMessage(
          err,
          "Unable to load departments."
        )
      );
    } finally {
      setLoadingDepartments(false);
    }
  };

  /* =========================================================
     HANDLE REGISTRATION FORM CHANGES
  ========================================================= */

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setError("");

    /* -------------------------------------------------------
       INSTITUTION
    ------------------------------------------------------- */

    if (name === "institution_id") {
      setFormData((previous) => ({
        ...previous,
        institution_id: value,
        faculty_id: "",
        department_id: "",
      }));

      setFaculties([]);
      setDepartments([]);

      if (value) {
        loadFaculties(value);
      }

      return;
    }

    /* -------------------------------------------------------
       FACULTY
    ------------------------------------------------------- */

    if (name === "faculty_id") {
      setFormData((previous) => ({
        ...previous,
        faculty_id: value,
        department_id: "",
      }));

      setDepartments([]);

      if (
        value &&
        formData.institution_id
      ) {
        loadDepartments(
          formData.institution_id,
          value
        );
      }

      return;
    }

    /* -------------------------------------------------------
       CHECKBOX
    ------------------------------------------------------- */

    if (type === "checkbox") {
      setFormData((previous) => ({
        ...previous,
        [name]: checked,
      }));

      return;
    }

    /* -------------------------------------------------------
       NORMAL INPUT
    ------------------------------------------------------- */

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =========================================================
     VALIDATE REGISTRATION
  ========================================================= */

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      return "Please enter your full name.";
    }

    if (!formData.email.trim()) {
      return "Please enter your email address.";
    }

    if (!formData.institution_id) {
      return "Please select an institution.";
    }

    if (!formData.faculty_id) {
      return "Please select a faculty.";
    }

    if (!formData.department_id) {
      return "Please select a department.";
    }

    if (!formData.role_id) {
      return "Please select a role.";
    }

    if (!formData.designation.trim()) {
      return "Please enter your designation.";
    }

    if (!formData.password) {
      return "Please enter a password.";
    }

    if (formData.password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      return "Passwords do not match.";
    }

    if (!formData.terms) {
      return "Please accept the terms and conditions.";
    }

    return "";
  };

  /* =========================================================
     SUBMIT REGISTRATION
  ========================================================= */

  const handleSubmit = async () => {
    setError("");
    setSuccess(null);

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const selectedInstitution =
      institutions.find(
        (institution) =>
          Number(institution.id) ===
          Number(formData.institution_id)
      );

    const selectedFaculty =
      faculties.find(
        (faculty) =>
          Number(faculty.id) ===
          Number(formData.faculty_id)
      );

    const selectedDepartment =
      departments.find(
        (department) =>
          Number(department.id) ===
          Number(formData.department_id)
      );

    if (!selectedInstitution) {
      setError(
        "Selected institution could not be found."
      );
      return;
    }

    if (!selectedFaculty) {
      setError(
        "Selected faculty could not be found."
      );
      return;
    }

    if (!selectedDepartment) {
      setError(
        "Selected department could not be found."
      );
      return;
    }

    try {
      setSubmitting(true);

      /*
       * Faculty ID is intentionally NOT sent.
       *
       * Backend derives faculty from:
       * Department.faculty_id
       */

      const payload = {
        full_name:
          formData.full_name.trim(),

        email:
          formData.email
            .trim()
            .toLowerCase(),

        institution:
          selectedInstitution.name,

        institution_id:
          Number(
            formData.institution_id
          ),

        department:
          selectedDepartment.name,

        department_id:
          Number(
            formData.department_id
          ),

        role_id:
          Number(formData.role_id),

        designation:
          formData.designation.trim(),

        password:
          formData.password,
      };

      console.log(
        "REGISTRATION PAYLOAD:",
        payload
      );

      const response = await api.post(
        "/auth/register",
        payload
      );

      console.log(
        "REGISTRATION RESPONSE:",
        response.data
      );

      setSuccess(
        response.data || {
          message:
            "Registration request submitted successfully.",
          status: "PENDING",
        }
      );
    } catch (err) {
      console.error(
        "REGISTRATION ERROR:",
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "Unable to submit registration request."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     INSTITUTION REQUEST FORM CHANGE
  ========================================================= */

  const handleInstitutionRequestChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setRequestError("");

    setInstitutionRequest(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  /* =========================================================
     OPEN REQUEST FORM
  ========================================================= */

  const openInstitutionRequest = () => {
    setRequestError("");
    setRequestSuccess(false);

    setInstitutionRequest(
      (previous) => ({
        ...previous,
        official_email:
          previous.official_email ||
          formData.email.trim(),
      })
    );

    setShowInstitutionRequest(true);
  };

  /* =========================================================
     CLOSE REQUEST FORM
  ========================================================= */

  const closeInstitutionRequest = () => {
    if (requestSubmitting) {
      return;
    }

    setShowInstitutionRequest(false);
    setRequestError("");
    setRequestSuccess(false);
  };

  /* =========================================================
     SUBMIT NEW INSTITUTION REQUEST
  ========================================================= */

  const submitInstitutionRequest =
    async () => {
      setRequestError("");
      setRequestSuccess(false);

      /* -------------------------------------------------------
         VALIDATE INSTITUTION NAME
      ------------------------------------------------------- */

      if (
        !institutionRequest.institution_name.trim()
      ) {
        setRequestError(
          "Please enter the institution name."
        );
        return;
      }

      /* -------------------------------------------------------
         VALIDATE OFFICIAL EMAIL
      ------------------------------------------------------- */

      if (
        !institutionRequest.official_email.trim()
      ) {
        setRequestError(
          "Please enter the official email."
        );
        return;
      }

      /* -------------------------------------------------------
         REQUESTER EMAIL
         
         Backend requires requester_email.
         
         Normally this is the email entered in the
         registration form.

         If the user has not entered their personal
         registration email yet, we use the official
         institution email as a fallback so the request
         does not fail validation.
      ------------------------------------------------------- */

      const requesterEmail =
        formData.email.trim()
          ? formData.email
              .trim()
              .toLowerCase()
          : institutionRequest.official_email
              .trim()
              .toLowerCase();

      if (!requesterEmail) {
        setRequestError(
          "Please enter your email address."
        );
        return;
      }

      try {
        setRequestSubmitting(true);

        const payload = {
          requester_name:
            formData.full_name.trim() ||
            "Registration User",

          requester_email:
            requesterEmail,

          institution_name:
            institutionRequest.institution_name.trim(),

          institution_code:
            institutionRequest.institution_code.trim() ||
            null,

          official_email:
            institutionRequest.official_email
              .trim()
              .toLowerCase(),

          address:
            institutionRequest.address.trim() ||
            null,

          city:
            institutionRequest.city.trim() ||
            null,

          state:
            institutionRequest.state.trim() ||
            null,

          pincode:
            institutionRequest.pincode.trim() ||
            null,

          institution_type:
            institutionRequest.institution_type.trim() ||
            null,

          website:
            institutionRequest.website.trim() ||
            null,
        };

        console.log(
          "INSTITUTION REQUEST PAYLOAD:",
          payload
        );

        const response =
          await api.post(
            "/institution-requests",
            payload
          );

        console.log(
          "INSTITUTION REQUEST RESPONSE:",
          response.data
        );

        setRequestSuccess(true);
      } catch (err) {
        console.error(
          "INSTITUTION REQUEST ERROR:",
          err
        );

        /*
         * IMPORTANT:
         * FastAPI validation errors are arrays of
         * objects. We convert them into readable text
         * before rendering them.
         */

        setRequestError(
          getApiErrorMessage(
            err,
            "Unable to submit institution request."
          )
        );
      } finally {
        setRequestSubmitting(false);
      }
    };

  /* =========================================================
     SUCCESS SCREEN
  ========================================================= */

  if (success) {
    return (
      <div className="register-page">

        {/* LEFT SIDE */}

        <section className="register-brand-section">

          <div className="register-brand-content">

            <div className="register-logo">

              <div className="register-logo-icon">
                E
              </div>

              <div>
                <h2>EduVerse</h2>

                <span>
                  NAAC ACCREDITATION PLATFORM
                </span>
              </div>

            </div>

            <div className="register-brand-main">

              <div className="register-badge">
                <span className="badge-dot"></span>
                INSTITUTIONAL ACCESS
              </div>

              <h1>
                Join the future
                <br />
                of <span>accreditation.</span>
              </h1>

              <p>
                Create your EduVerse account
                and become part of a unified
                platform for managing NAAC
                accreditation, institutional
                data and evidence.
              </p>

              <div className="register-features">

                <div className="register-feature">

                  <div className="feature-icon">
                    ✓
                  </div>

                  <div>
                    <strong>
                      Structured accreditation
                    </strong>

                    <p>
                      Organize institutional data,
                      criteria and evidence in one
                      centralized platform.
                    </p>
                  </div>

                </div>

                <div className="register-feature">

                  <div className="feature-icon">
                    ✓
                  </div>

                  <div>
                    <strong>
                      Role-based access
                    </strong>

                    <p>
                      Get access based on your
                      institution, department and
                      assigned role.
                    </p>
                  </div>

                </div>

                <div className="register-feature">

                  <div className="feature-icon">
                    ✓
                  </div>

                  <div>
                    <strong>
                      Secure approval workflow
                    </strong>

                    <p>
                      Registration requests are
                      reviewed and approved before
                      account activation.
                    </p>
                  </div>

                </div>

              </div>

              <div className="register-info-card">

                <div className="info-number">
                  01
                </div>

                <div>

                  <span>
                    SIMPLE ONBOARDING
                  </span>

                  <strong>
                    Register → Get Approved → Get Started
                  </strong>

                  <p>
                    Your account remains pending
                    until an authorized administrator
                    reviews and assigns the
                    appropriate role.
                  </p>

                </div>

              </div>

            </div>

          </div>

          <div className="register-footer">
            © 2026 EduVerse · NAAC Accreditation Management
          </div>

        </section>


        {/* RIGHT SIDE */}

        <section className="register-form-section">

          <div className="register-card">

            <div className="register-card-header">

              <div className="form-step">
                STEP 01 · REGISTRATION
              </div>

              <h1>
                Registration submitted
              </h1>

              <p>
                Your request has been submitted
                successfully.
              </p>

            </div>


            <div className="register-success-card">

              <div className="success-icon">
                ✓
              </div>

              <div className="success-content">

                <h3>
                  Registration request received
                </h3>

                <p>
                  Your account is currently
                  pending approval by an
                  authorized administrator.
                </p>

              </div>

            </div>


            <div className="success-details">

              <div className="success-detail-item">

                <span>
                  Request ID
                </span>

                <strong>
                  {success?.id ||
                    success?.request_id ||
                    "Submitted"}
                </strong>

              </div>

              <div className="success-detail-item">

                <span>
                  Status
                </span>

                <strong className="pending-status">
                  {success?.status ||
                    "PENDING"}
                </strong>

              </div>

            </div>


            <div className="success-note">
              You will be able to log in once
              your registration request and
              requested role have been approved
              by an authorized administrator.
            </div>


            <div className="registration-next-step">

              <div className="next-step-title">
                What happens next?
              </div>

              <div className="registration-steps">

                <div className="registration-step completed">

                  <div className="step-circle">
                    ✓
                  </div>

                  <div>
                    <strong>
                      Registration Submitted
                    </strong>

                    <span>
                      Your request has been received.
                    </span>
                  </div>

                </div>


                <div className="registration-step active">

                  <div className="step-circle">
                    2
                  </div>

                  <div>
                    <strong>
                      Administrator Review
                    </strong>

                    <span>
                      An authorized administrator
                      will review your request.
                    </span>
                  </div>

                </div>


                <div className="registration-step">

                  <div className="step-circle">
                    3
                  </div>

                  <div>
                    <strong>
                      Account Activation
                    </strong>

                    <span>
                      Your account becomes active
                      after approval.
                    </span>
                  </div>

                </div>

              </div>

            </div>


            <div className="register-login-link">
              Already have an account?{" "}
              <Link to="/login">
                Login
              </Link>
            </div>

          </div>

        </section>

      </div>
    );
  }


  /* =========================================================
     MAIN REGISTRATION PAGE
  ========================================================= */

  return (
    <div className="register-page">

      {/* =====================================================
          LEFT BRAND SECTION
      ===================================================== */}

      <section className="register-brand-section">

        <div className="register-brand-content">

          <div className="register-logo">

            <div className="register-logo-icon">
              E
            </div>

            <div>
              <h2>EduVerse</h2>

              <span>
                NAAC ACCREDITATION PLATFORM
              </span>
            </div>

          </div>


          <div className="register-brand-main">

            <div className="register-badge">
              <span className="badge-dot"></span>
              INSTITUTIONAL ACCESS
            </div>

            <h1>
              Join the future
              <br />
              of <span>accreditation.</span>
            </h1>

            <p>
              Create your EduVerse account
              and become part of a unified
              platform for managing NAAC
              accreditation, institutional data
              and evidence.
            </p>


            <div className="register-features">

              <div className="register-feature">

                <div className="feature-icon">
                  ✓
                </div>

                <div>
                  <strong>
                    Structured accreditation
                  </strong>

                  <p>
                    Organize institutional data,
                    criteria and evidence in one
                    centralized platform.
                  </p>
                </div>

              </div>


              <div className="register-feature">

                <div className="feature-icon">
                  ✓
                </div>

                <div>
                  <strong>
                    Role-based access
                  </strong>

                  <p>
                    Get access based on your
                    institution, department and
                    assigned role.
                  </p>
                </div>

              </div>


              <div className="register-feature">

                <div className="feature-icon">
                  ✓
                </div>

                <div>
                  <strong>
                    Secure approval workflow
                  </strong>

                  <p>
                    Registration requests are
                    reviewed and approved before
                    account activation.
                  </p>
                </div>

              </div>

            </div>


            <div className="register-info-card">

              <div className="info-number">
                01
              </div>

              <div>

                <span>
                  SIMPLE ONBOARDING
                </span>

                <strong>
                  Register → Get Approved → Get Started
                </strong>

                <p>
                  Your account remains pending
                  until an authorized administrator
                  reviews and assigns the
                  appropriate role.
                </p>

              </div>

            </div>

          </div>

        </div>


        <div className="register-footer">
          © 2026 EduVerse · NAAC Accreditation Management
        </div>

      </section>


      {/* =====================================================
          RIGHT FORM SECTION
      ===================================================== */}

      <section className="register-form-section">

        <div className="register-card">

          <div className="register-card-header">

            <div className="form-step">
              STEP 01 · REGISTRATION
            </div>

            <h1>
              Create your account
            </h1>

            <p>
              Submit your details to request
              access to EduVerse.
            </p>

          </div>


          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="register-alert error">
              {error}
            </div>
          )}


          {/* =================================================
              PERSONAL INFORMATION
          ================================================= */}

          <div className="form-section-title">
            Personal Information
          </div>


          <div className="form-row">

            <div className="form-group">

              <label>
                Full Name <span>*</span>
              </label>

              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                disabled={submitting}
              />

            </div>


            <div className="form-group">

              <label>
                Email Address <span>*</span>
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                disabled={submitting}
              />

            </div>

          </div>


          {/* =================================================
              INSTITUTION DETAILS
          ================================================= */}

          <div className="form-section-title institution-title">
            Institution Details
          </div>


          {/* INSTITUTION */}

          <div className="form-group">

            <label>
              Institution <span>*</span>
            </label>

            <select
              name="institution_id"
              value={formData.institution_id}
              onChange={handleChange}
              disabled={
                submitting ||
                loadingInstitutions
              }
            >

              <option value="">
                {loadingInstitutions
                  ? "Loading institutions..."
                  : institutions.length === 0
                    ? "No institutions available"
                    : "Select institution"}
              </option>

              {institutions.map(
                (institution) => (
                  <option
                    key={institution.id}
                    value={institution.id}
                  >
                    {institution.name}
                  </option>
                )
              )}

            </select>

            <small>
              Select the institution you are
              associated with.
            </small>

          </div>


          {/* =================================================
              REQUEST NEW INSTITUTION
          ================================================= */}

          <button
            type="button"
            className="request-institution-link"
            onClick={
              openInstitutionRequest
            }
            disabled={submitting}
          >
            + Request New Institution
          </button>


          {/* =================================================
              FACULTY + DEPARTMENT
          ================================================= */}

          <div className="form-row">

            <div className="form-group">

              <label>
                Faculty <span>*</span>
              </label>

              <select
                name="faculty_id"
                value={formData.faculty_id}
                onChange={handleChange}
                disabled={
                  submitting ||
                  !formData.institution_id ||
                  loadingFaculties
                }
              >

                <option value="">
                  {!formData.institution_id
                    ? "Select institution first"
                    : loadingFaculties
                      ? "Loading faculties..."
                      : faculties.length === 0
                        ? "No faculties available"
                        : "Select faculty"}
                </option>

                {faculties.map(
                  (faculty) => (
                    <option
                      key={faculty.id}
                      value={faculty.id}
                    >
                      {faculty.name}
                    </option>
                  )
                )}

              </select>

            </div>


            <div className="form-group">

              <label>
                Department <span>*</span>
              </label>

              <select
                name="department_id"
                value={
                  formData.department_id
                }
                onChange={handleChange}
                disabled={
                  submitting ||
                  !formData.faculty_id ||
                  loadingDepartments
                }
              >

                <option value="">
                  {!formData.faculty_id
                    ? "Select faculty first"
                    : loadingDepartments
                      ? "Loading departments..."
                      : departments.length === 0
                        ? "No departments available"
                        : "Select department"}
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.name}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>


          {/* =================================================
              ROLE
          ================================================= */}

          <div className="form-group">

            <label>
              Role <span>*</span>
            </label>

            <select
              name="role_id"
              value={formData.role_id}
              onChange={handleChange}
              disabled={submitting}
            >

              <option value="">
                Select role
              </option>

              {roles.map((role) => (
                <option
                  key={role.id}
                  value={role.id}
                >
                  {role.name}
                </option>
              ))}

            </select>

          </div>


          {/* =================================================
              DESIGNATION
          ================================================= */}

          <div className="form-group">

            <label>
              Designation <span>*</span>
            </label>

            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="e.g. Assistant Professor"
              disabled={submitting}
            />

          </div>


          {/* =================================================
              ACCOUNT SECURITY
          ================================================= */}

          <div className="form-section-title">
            Account Security
          </div>


          <div className="form-row">

            <div className="form-group">

              <label>
                Password <span>*</span>
              </label>

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                disabled={submitting}
              />

            </div>


            <div className="form-group">

              <label>
                Confirm Password <span>*</span>
              </label>

              <input
                type="password"
                name="confirmPassword"
                value={
                  formData.confirmPassword
                }
                onChange={handleChange}
                placeholder="Re-enter password"
                disabled={submitting}
              />

            </div>

          </div>


          {/* =================================================
              TERMS
          ================================================= */}

          <div className="register-checkbox">

            <input
              type="checkbox"
              id="terms"
              name="terms"
              checked={formData.terms}
              onChange={handleChange}
              disabled={submitting}
            />

            <label htmlFor="terms">
              I agree to the EduVerse terms
              and conditions and confirm that
              the information provided is accurate.
            </label>

          </div>


          {/* =================================================
              SUBMIT
          ================================================= */}

          <button
            type="button"
            className="register-submit"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? "Submitting..."
              : "Submit Registration"}
          </button>


          {/* =================================================
              PENDING NOTE
          ================================================= */}

          <div className="pending-note">

            <span>
              🔒
            </span>

            <p>
              Your account will remain pending
              until your registration and
              requested role are approved by an
              authorized administrator.
            </p>

          </div>


          {/* =================================================
              LOGIN
          ================================================= */}

          <div className="register-login-link">
            Already have an account?{" "}
            <Link to="/login">
              Login
            </Link>
          </div>

        </div>

      </section>


      {/* =====================================================
          REQUEST NEW INSTITUTION MODAL
      ===================================================== */}

      {showInstitutionRequest && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background:
              "rgba(7, 21, 47, 0.65)",
            backdropFilter: "blur(5px)",
          }}
        >

          <div
            style={{
              width: "100%",
              maxWidth: "620px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "18px",
              padding: "30px",
              boxSizing: "border-box",
              boxShadow:
                "0 25px 70px rgba(0,0,0,0.25)",
            }}
          >

            {!requestSuccess ? (
              <>

                {/* HEADER */}

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: "22px",
                  }}
                >

                  <div>

                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing: "1px",
                        color: "#4f46e5",
                        marginBottom: "7px",
                      }}
                    >
                      INSTITUTION REQUEST
                    </div>

                    <h2
                      style={{
                        margin: 0,
                        fontSize: "24px",
                        color: "#111827",
                      }}
                    >
                      Request New Institution
                    </h2>

                    <p
                      style={{
                        margin:
                          "7px 0 0",
                        fontSize: "12px",
                        color: "#7b8497",
                        lineHeight: 1.5,
                      }}
                    >
                      Can't find your institution?
                      Submit a request to the
                      administrator.
                    </p>

                  </div>


                  <button
                    type="button"
                    onClick={
                      closeInstitutionRequest
                    }
                    disabled={
                      requestSubmitting
                    }
                    style={{
                      border: "none",
                      background:
                        "#f1f5f9",
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      fontSize: "18px",
                      color: "#64748b",
                    }}
                  >
                    ×
                  </button>

                </div>


                {/* ERROR */}

                {requestError && (
                  <div
                    style={{
                      marginBottom: "18px",
                      padding:
                        "11px 13px",
                      borderRadius: "9px",
                      background:
                        "#fef2f2",
                      border:
                        "1px solid #fecaca",
                      color: "#b91c1c",
                      fontSize: "12px",
                    }}
                  >
                    {requestError}
                  </div>
                )}


                {/* INSTITUTION NAME */}

                <div className="form-group">

                  <label>
                    Institution Name{" "}
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="institution_name"
                    value={
                      institutionRequest.institution_name
                    }
                    onChange={
                      handleInstitutionRequestChange
                    }
                    placeholder="Enter institution name"
                    disabled={
                      requestSubmitting
                    }
                  />

                </div>


                {/* CODE + TYPE */}

                <div className="form-row">

                  <div className="form-group">

                    <label>
                      Institution Code
                    </label>

                    <input
                      type="text"
                      name="institution_code"
                      value={
                        institutionRequest.institution_code
                      }
                      onChange={
                        handleInstitutionRequestChange
                      }
                      placeholder="e.g. SKNCOE"
                      disabled={
                        requestSubmitting
                      }
                    />

                  </div>


                  <div className="form-group">

                    <label>
                      Institution Type
                    </label>

                    <input
                      type="text"
                      name="institution_type"
                      value={
                        institutionRequest.institution_type
                      }
                      onChange={
                        handleInstitutionRequestChange
                      }
                      placeholder="e.g. Engineering College"
                      disabled={
                        requestSubmitting
                      }
                    />

                  </div>

                </div>


                {/* OFFICIAL EMAIL */}

                <div className="form-group">

                  <label>
                    Official Email{" "}
                    <span>*</span>
                  </label>

                  <input
                    type="email"
                    name="official_email"
                    value={
                      institutionRequest.official_email
                    }
                    onChange={
                      handleInstitutionRequestChange
                    }
                    placeholder="official@institution.edu"
                    disabled={
                      requestSubmitting
                    }
                  />

                </div>


                {/* ADDRESS */}

                <div className="form-group">

                  <label>
                    Address
                  </label>

                  <input
                    type="text"
                    name="address"
                    value={
                      institutionRequest.address
                    }
                    onChange={
                      handleInstitutionRequestChange
                    }
                    placeholder="Institution address"
                    disabled={
                      requestSubmitting
                    }
                  />

                </div>


                {/* CITY + STATE */}

                <div className="form-row">

                  <div className="form-group">

                    <label>
                      City
                    </label>

                    <input
                      type="text"
                      name="city"
                      value={
                        institutionRequest.city
                      }
                      onChange={
                        handleInstitutionRequestChange
                      }
                      placeholder="City"
                      disabled={
                        requestSubmitting
                      }
                    />

                  </div>


                  <div className="form-group">

                    <label>
                      State
                    </label>

                    <input
                      type="text"
                      name="state"
                      value={
                        institutionRequest.state
                      }
                      onChange={
                        handleInstitutionRequestChange
                      }
                      placeholder="State"
                      disabled={
                        requestSubmitting
                      }
                    />

                  </div>

                </div>


                {/* PINCODE + WEBSITE */}

                <div className="form-row">

                  <div className="form-group">

                    <label>
                      Pincode
                    </label>

                    <input
                      type="text"
                      name="pincode"
                      value={
                        institutionRequest.pincode
                      }
                      onChange={
                        handleInstitutionRequestChange
                      }
                      placeholder="Pincode"
                      disabled={
                        requestSubmitting
                      }
                    />

                  </div>


                  <div className="form-group">

                    <label>
                      Website
                    </label>

                    <input
                      type="text"
                      name="website"
                      value={
                        institutionRequest.website
                      }
                      onChange={
                        handleInstitutionRequestChange
                      }
                      placeholder="https://..."
                      disabled={
                        requestSubmitting
                      }
                    />

                  </div>

                </div>


                {/* BUTTONS */}

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginTop: "8px",
                  }}
                >

                  <button
                    type="button"
                    onClick={
                      closeInstitutionRequest
                    }
                    disabled={
                      requestSubmitting
                    }
                    style={{
                      flex: 1,
                      height: "45px",
                      border:
                        "1px solid #dfe3eb",
                      borderRadius: "9px",
                      background: "#ffffff",
                      color: "#475569",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>


                  <button
                    type="button"
                    onClick={
                      submitInstitutionRequest
                    }
                    disabled={
                      requestSubmitting
                    }
                    style={{
                      flex: 2,
                      height: "45px",
                      border: "none",
                      borderRadius: "9px",
                      background:
                        "linear-gradient(135deg, #4f46e5, #6366f1)",
                      color: "#ffffff",
                      fontWeight: 700,
                      cursor:
                        requestSubmitting
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        requestSubmitting
                          ? 0.7
                          : 1,
                    }}
                  >
                    {requestSubmitting
                      ? "Submitting Request..."
                      : "Submit Institution Request"}
                  </button>

                </div>

              </>
            ) : (

              /* =================================================
                 REQUEST SUCCESS
              ================================================= */

              <div
                style={{
                  textAlign: "center",
                  padding: "20px 10px",
                }}
              >

                <div
                  style={{
                    width: "58px",
                    height: "58px",
                    margin:
                      "0 auto 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    borderRadius: "50%",
                    background: "#16a34a",
                    color: "#ffffff",
                    fontSize: "28px",
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>


                <h2
                  style={{
                    margin:
                      "0 0 8px",
                    color: "#166534",
                    fontSize: "22px",
                  }}
                >
                  Request Submitted
                </h2>


                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: "13px",
                    lineHeight: 1.6,
                  }}
                >
                  Your institution request has
                  been submitted successfully.
                  An administrator will review
                  it before the institution is
                  created.
                </p>


                <div
                  style={{
                    marginTop: "20px",
                    padding: "14px",
                    borderRadius: "10px",
                    background:
                      "#f0fdf4",
                    border:
                      "1px solid #bbf7d0",
                    color: "#166534",
                    fontSize: "12px",
                  }}
                >
                  Status:{" "}
                  <strong>
                    PENDING
                  </strong>
                </div>


                <button
                  type="button"
                  onClick={
                    closeInstitutionRequest
                  }
                  style={{
                    marginTop: "22px",
                    width: "100%",
                    height: "45px",
                    border: "none",
                    borderRadius: "9px",
                    background:
                      "linear-gradient(135deg, #4f46e5, #6366f1)",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>

              </div>

            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default Register;