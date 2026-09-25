import api from "./api";
import { MOCK_REVIEWS } from "./mockData";

export const reviewService = {
  getPendingReviews: async () => {
    try {
      const response = await api.get("/reviews");
      return response.data;
    } catch {
      return MOCK_REVIEWS;
    }
  },
  approveReview: async (reviewId) => {
    try {
      const response = await api.post(`/reviews/${reviewId}/approve`);
      return response.data;
    } catch {
      return { success: true, status: "Approved" };
    }
  },
  rejectReview: async (reviewId) => {
    try {
      const response = await api.post(`/reviews/${reviewId}/reject`);
      return response.data;
    } catch {
      return { success: true, status: "Rejected" };
    }
  },
};

export default reviewService;
