import api from "./api";

const apiError = (error, fallback) => {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg || item)
      .join(", ");
  }

  return detail || error?.message || fallback;
};

const mapCommittee = (committee) => ({
  id: committee.id,
  name: committee.name,
  description: committee.description,
  chairperson: committee.chairperson,
  status: committee.status,
  memberCount: committee.member_count ?? committee.memberCount ?? 0,
  criteriaCount: committee.criteria_count ?? committee.criteriaCount ?? 0,
  createdAt: committee.created_at ?? committee.createdAt,
  institutionId: committee.institution_id ?? committee.institutionId,
});

const mapMember = (member) => ({
  id: member.id,
  committeeId: member.committee_id ?? member.committeeId,
  userId: member.user_id ?? member.userId,
  name: member.name,
  email: member.email,
  systemRole: member.system_role ?? member.systemRole,
  department: member.department,
  committeeRole: member.committee_role ?? member.committeeRole,
  joinedAt: member.created_at ?? member.joinedAt,
});

const mapUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  systemRole: user.system_role ?? user.systemRole,
  department: user.department,
});

export const committeeService = {
  getCommittees: async () => {
    try {
      const response = await api.get("/committees");
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map(mapCommittee);
    } catch (error) {
      throw new Error(apiError(error, "Unable to load committees."));
    }
  },

  getCommittee: async (id) => {
    try {
      const response = await api.get(`/committees/${id}`);
      return mapCommittee(response.data);
    } catch (error) {
      throw new Error(apiError(error, "Unable to load committee."));
    }
  },

  createCommittee: async (data) => {
    try {
      const response = await api.post("/committees", {
        name: data.name,
        description: data.description || "",
        chairperson: data.chairperson || "",
        status: data.status || "Active",
      });
      return mapCommittee(response.data);
    } catch (error) {
      throw new Error(apiError(error, "Unable to create committee."));
    }
  },

  updateCommittee: async (id, data) => {
    try {
      const response = await api.put(`/committees/${id}`, {
        name: data.name,
        description: data.description || "",
        chairperson: data.chairperson || "",
        status: data.status || "Active",
      });
      return mapCommittee(response.data);
    } catch (error) {
      throw new Error(apiError(error, "Unable to update committee."));
    }
  },

  deleteCommittee: async (id) => {
    try {
      await api.delete(`/committees/${id}`);
      return true;
    } catch (error) {
      throw new Error(apiError(error, "Unable to delete committee."));
    }
  },

  getAvailableUsers: async (committeeId) => {
    try {
      const response = await api.get(
        `/committees/${committeeId}/available-users`
      );
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map(mapUser);
    } catch (error) {
      throw new Error(apiError(error, "Unable to load available users."));
    }
  },

  getMembers: async (committeeId) => {
    try {
      const response = await api.get(`/committees/${committeeId}/members`);
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map(mapMember);
    } catch (error) {
      throw new Error(apiError(error, "Unable to load committee members."));
    }
  },

  addMember: async (committeeId, data) => {
    try {
      const response = await api.post(`/committees/${committeeId}/members`, {
        user_id: Number(data.userId),
        committee_role: data.committeeRole || "Member",
      });
      return mapMember(response.data);
    } catch (error) {
      throw new Error(apiError(error, "Unable to add committee member."));
    }
  },

  removeMember: async (memberId) => {
    try {
      await api.delete(`/committees/members/${memberId}`);
      return true;
    } catch (error) {
      throw new Error(apiError(error, "Unable to remove committee member."));
    }
  },

  updateMemberRole: async (memberId, committeeRole) => {
    try {
      const response = await api.put(`/committees/members/${memberId}`, {
        committee_role: committeeRole,
      });
      return mapMember(response.data);
    } catch (error) {
      throw new Error(apiError(error, "Unable to update member role."));
    }
  },
};

export default committeeService;
