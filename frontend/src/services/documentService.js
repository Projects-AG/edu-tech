import api from "./api";
import { MOCK_DOCUMENTS } from "./mockData";

export const documentService = {
  // ============================================================
  // GET ALL DOCUMENTS
  // ============================================================

  getDocuments: async () => {
    try {
      const response = await api.get(
        "/documents"
      );

      console.log(
        "GET DOCUMENTS RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "GET DOCUMENTS ERROR:",
        error?.response?.data ||
          error
      );

      return MOCK_DOCUMENTS;
    }
  },

  // ============================================================
  // EXISTING DOCUMENT RECORD CREATION
  // ============================================================

  uploadDocument: async (docData) => {
    try {
      const response = await api.post(
        "/documents",
        docData
      );

      console.log(
        "UPLOAD DOCUMENT RESPONSE:",
        response.data
      );

      return response.data;
    } catch (error) {
      console.error(
        "UPLOAD DOCUMENT ERROR:",
        error?.response?.data ||
          error
      );

      return {
        id: `doc_${Date.now()}`,
        ...docData,
        status: "Submitted",
        date: new Date()
          .toISOString()
          .split("T")[0],
      };
    }
  },

  // ============================================================
  // REAL EVIDENCE FILE UPLOAD
  // ============================================================

  uploadEvidence: async (
    file,
    submissionId,
    title
  ) => {
    const formData =
      new FormData();

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
      const response =
        await api.post(
          "/documents/upload",
          formData,
          {
            headers: {
              "Content-Type":
                undefined,
            },
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
        error?.response?.data ||
          error
      );

      throw error;
    }
  },
};

export default documentService;