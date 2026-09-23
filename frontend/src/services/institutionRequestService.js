import api from "./api";

const institutionRequestService = {
  getRequests: async () => {
    const response = await api.get("/institution-requests");
    return response.data;
  },

  getRequest: async (requestId) => {
    const response = await api.get(`/institution-requests/${requestId}`);
    return response.data;
  },

  approveRequest: async (requestId) => {
    const response = await api.post(
      `/institution-requests/${requestId}/approve`
    );
    return response.data;
  },

  rejectRequest: async (requestId, rejectionReason = "") => {
    const response = await api.post(
      `/institution-requests/${requestId}/reject`,
      {
        reason: rejectionReason,
      }
    );
    return response.data;
  },
};

export default institutionRequestService;
