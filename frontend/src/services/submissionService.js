import api from "./api";

export const submissionService = {
  // =========================
  // GET ALL SUBMISSIONS
  // =========================
  getSubmissions: async () => {
    try {
      const response = await api.get("/submissions");

      console.log(
        "GET SUBMISSIONS RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "GET SUBMISSIONS ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // =========================
  // GET SINGLE SUBMISSION
  // =========================
  getSubmission: async (id) => {
    try {
      const response = await api.get(
        `/submissions/${id}`
      );

      console.log(
        "GET SUBMISSION RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "GET SUBMISSION ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // =========================
  // CREATE SUBMISSION
  // =========================
  createSubmission: async (data) => {
    try {
      const response = await api.post(
        "/submissions",
        data
      );

      console.log(
        "CREATE SUBMISSION RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "CREATE SUBMISSION ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // =========================
  // UPDATE DRAFT
  // =========================
  updateSubmission: async (id, data) => {
    try {
      const response = await api.put(
        `/submissions/${id}`,
        data
      );

      console.log(
        "UPDATE SUBMISSION RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "UPDATE SUBMISSION ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // =========================
  // SUBMIT DRAFT
  // DRAFT → SUBMITTED
  // =========================
  submitSubmission: async (id) => {
    try {
      const response = await api.post(
        `/submissions/${id}/submit`
      );

      console.log(
        "SUBMIT SUBMISSION RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "SUBMIT SUBMISSION ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // =========================
  // RESUBMIT AFTER CHANGES
  // CHANGES REQUESTED → SUBMITTED
  // =========================
  resubmitSubmission: async (id) => {
    try {
      const response = await api.post(
        `/submissions/${id}/resubmit`
      );

      console.log(
        "RESUBMIT SUBMISSION RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "RESUBMIT SUBMISSION ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // =========================
  // REVIEWER STARTS REVIEW
  // SUBMITTED → UNDER REVIEW
  // =========================
  startReview: async (id) => {
    try {
      const response = await api.post(
        `/submissions/${id}/start-review`
      );

      console.log(
        "START REVIEW RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "START REVIEW ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // =========================
  // REVIEW SUBMISSION
  // =========================
  reviewSubmission: async (id, data) => {
    try {
      const response = await api.post(
        `/submissions/${id}/review`,
        data
      );

      console.log(
        "REVIEW SUBMISSION RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "REVIEW SUBMISSION ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // =========================
  // REVIEWER REJECT
  // =========================
  rejectSubmission: async (id, data) => {
    try {
      const response = await api.post(
        `/submissions/${id}/reject`,
        data
      );

      console.log(
        "REJECT SUBMISSION RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "REJECT SUBMISSION ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // =========================
  // DATA APPROVER
  // APPROVE SUBMISSION
  // APPROVED → DATA APPROVED
  // =========================
  approveSubmission: async (id, data = {}) => {
    try {
      const response = await api.post(
        `/submissions/${id}/data-approve`,
        data
      );

      console.log(
        "DATA APPROVAL RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "DATA APPROVAL ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // =========================
  // DATA APPROVER
  // REJECT SUBMISSION
  // APPROVED → REJECTED
  // =========================
  rejectSubmissionByDataApprover: async (
    id,
    data = {}
  ) => {
    try {
      const response = await api.post(
        `/submissions/${id}/data-reject`,
        data
      );

      console.log(
        "DATA APPROVER REJECTION RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "DATA APPROVER REJECTION ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // =========================
  // PRINCIPAL FINAL APPROVAL
  // =========================
  finalApprove: async (id, data = {}) => {
    try {
      const response = await api.post(
        `/submissions/${id}/final-approve`,
        data
      );

      console.log(
        "FINAL APPROVAL RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "FINAL APPROVAL ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // =========================
  // FINAL NAAC SUBMISSION
  // =========================
  finalSubmit: async (id) => {
    try {
      const response = await api.post(
        `/submissions/${id}/final-submit`
      );

      console.log(
        "FINAL SUBMISSION RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "FINAL SUBMISSION ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },
};

export default submissionService;