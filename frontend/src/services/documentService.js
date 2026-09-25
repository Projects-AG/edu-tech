import api from "./api";

const documentService = {
  // ============================================================
  // GET DOCUMENTS
  // ============================================================

  getDocuments: async () => {
    try {
      const response = await api.get("/documents");

      console.log(
        "GET DOCUMENTS RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "GET DOCUMENTS ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // ============================================================
  // CREATE DOCUMENT
  // ============================================================

  uploadDocument: async (docData) => {
    try {
      const response = await api.post(
        "/documents",
        docData
      );

      return response.data;
    } catch (error) {
      console.error(
        "UPLOAD DOCUMENT ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // ============================================================
  // UPLOAD EVIDENCE
  // ============================================================

  uploadEvidence: async (
    file,
    submissionId,
    title,
    onUploadProgress
  ) => {
    const formData = new FormData();

    formData.append(
      "file",
      file
    );

    formData.append(
      "submission_id",
      String(submissionId)
    );

    if (title) {
      formData.append(
        "title",
        title
      );
    }

    try {
      const response = await api.post(
        "/documents/upload",
        formData,
        {
          onUploadProgress,
        }
      );

      console.log(
        "UPLOAD EVIDENCE RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "UPLOAD EVIDENCE ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // ============================================================
  // REPLACE EVIDENCE
  // ============================================================

  replaceEvidence: async (
    documentId,
    file,
    onUploadProgress
  ) => {
    const formData = new FormData();

    formData.append(
      "file",
      file
    );

    try {
      const response = await api.put(
        `/documents/${documentId}/replace`,
        formData,
        {
          onUploadProgress,
        }
      );

      console.log(
        "REPLACE EVIDENCE RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "REPLACE EVIDENCE ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // ============================================================
  // PREVIEW EVIDENCE
  // ============================================================

  previewDocument: async (
    documentId
  ) => {
    try {
      const response = await api.get(
        `/documents/${documentId}/preview`,
        {
          responseType: "blob",
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "PREVIEW DOCUMENT ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },

  // ============================================================
  // DOWNLOAD EVIDENCE
  // ============================================================

  downloadDocument: async (
    documentId
  ) => {
    try {
      const response = await api.get(
        `/documents/${documentId}/download`,
        {
          responseType: "blob",
        }
      );

      return response;
    } catch (error) {
      console.error(
        "DOWNLOAD DOCUMENT ERROR:",
        error?.response?.data || error
      );

      throw error;
    }
  },
};

export default documentService;