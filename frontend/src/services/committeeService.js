const COMMITTEE_KEY = "eduverse_committees";
const MEMBER_KEY = "eduverse_committee_members";

// ---------------------------------------------------------
// Default committees
// ---------------------------------------------------------

const defaultCommittees = [
  {
    id: 1,
    name: "NAAC Core Committee",
    description:
      "Main committee responsible for coordinating institutional NAAC accreditation activities.",
    chairperson: "NAAC Coordinator",
    status: "Active",
    memberCount: 0,
    criteriaCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "IQAC Committee",
    description:
      "Committee responsible for internal quality assurance and accreditation-related coordination.",
    chairperson: "Institution Admin",
    status: "Active",
    memberCount: 0,
    criteriaCount: 0,
    createdAt: new Date().toISOString(),
  },
];

// ---------------------------------------------------------
// Temporary user directory
// Later this will come from your backend users API
// ---------------------------------------------------------

const defaultUsers = [
  {
    id: 101,
    name: "Dr. Sharma",
    email: "sharma@eduverse.edu",
    systemRole: "NAAC Coordinator",
    department: "Administration",
  },
  {
    id: 102,
    name: "Prof. A",
    email: "prof.a@eduverse.edu",
    systemRole: "Committee Member",
    department: "Computer Engineering",
  },
  {
    id: 103,
    name: "Prof. B",
    email: "prof.b@eduverse.edu",
    systemRole: "Committee Member",
    department: "Information Technology",
  },
  {
    id: 104,
    name: "Prof. C",
    email: "prof.c@eduverse.edu",
    systemRole: "Committee Member",
    department: "Mechanical Engineering",
  },
  {
    id: 105,
    name: "Prof. D",
    email: "prof.d@eduverse.edu",
    systemRole: "Dept. Coordinator",
    department: "Computer Engineering",
  },
  {
    id: 106,
    name: "Dr. Priya",
    email: "priya@eduverse.edu",
    systemRole: "Committee Member",
    department: "Electronics Engineering",
  },
];

// ---------------------------------------------------------
// Generic storage helpers
// ---------------------------------------------------------

const readStorage = (key, fallback = []) => {
  try {
    const stored = localStorage.getItem(key);

    if (stored) {
      return JSON.parse(stored);
    }

    localStorage.setItem(key, JSON.stringify(fallback));

    return fallback;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return fallback;
  }
};

const saveStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// ---------------------------------------------------------
// Committee helpers
// ---------------------------------------------------------

const readCommittees = () => {
  return readStorage(COMMITTEE_KEY, defaultCommittees);
};

const saveCommittees = (committees) => {
  saveStorage(COMMITTEE_KEY, committees);
};

// ---------------------------------------------------------
// Member helpers
// ---------------------------------------------------------

const readMembers = () => {
  return readStorage(MEMBER_KEY, []);
};

const saveMembers = (members) => {
  saveStorage(MEMBER_KEY, members);
};

// ---------------------------------------------------------
// Committee Service
// ---------------------------------------------------------

export const committeeService = {
  // =======================================================
  // COMMITTEE METHODS
  // =======================================================

  getCommittees: async () => {
    return readCommittees();
  },

  getCommittee: async (id) => {
    const committees = readCommittees();

    return committees.find(
      (committee) => String(committee.id) === String(id)
    );
  },

  createCommittee: async (data) => {
    const committees = readCommittees();

    const newCommittee = {
      id: Date.now(),
      name: data.name,
      description: data.description || "",
      chairperson: data.chairperson || "",
      status: data.status || "Active",
      memberCount: 0,
      criteriaCount: 0,
      createdAt: new Date().toISOString(),
    };

    const updatedCommittees = [...committees, newCommittee];

    saveCommittees(updatedCommittees);

    return newCommittee;
  },

  updateCommittee: async (id, data) => {
    const committees = readCommittees();

    const updatedCommittees = committees.map((committee) => {
      if (String(committee.id) !== String(id)) {
        return committee;
      }

      return {
        ...committee,
        name: data.name,
        description: data.description || "",
        chairperson: data.chairperson || "",
        status: data.status || "Active",
      };
    });

    saveCommittees(updatedCommittees);

    return updatedCommittees.find(
      (committee) => String(committee.id) === String(id)
    );
  },

  deleteCommittee: async (id) => {
    const committees = readCommittees();

    const updatedCommittees = committees.filter(
      (committee) => String(committee.id) !== String(id)
    );

    saveCommittees(updatedCommittees);

    // Remove members belonging to this committee
    const members = readMembers();

    const updatedMembers = members.filter(
      (member) => String(member.committeeId) !== String(id)
    );

    saveMembers(updatedMembers);

    return true;
  },

  // =======================================================
  // USER DIRECTORY
  // =======================================================

  getAvailableUsers: async (committeeId) => {
    const users = defaultUsers;
    const members = readMembers();

    const committeeMembers = members.filter(
      (member) => String(member.committeeId) === String(committeeId)
    );

    const memberUserIds = committeeMembers.map(
      (member) => String(member.userId)
    );

    return users.filter(
      (user) => !memberUserIds.includes(String(user.id))
    );
  },

  // =======================================================
  // MEMBER METHODS
  // =======================================================

  getMembers: async (committeeId) => {
    const members = readMembers();

    return members.filter(
      (member) => String(member.committeeId) === String(committeeId)
    );
  },

  addMember: async (committeeId, data) => {
    const members = readMembers();

    const alreadyExists = members.some(
      (member) =>
        String(member.committeeId) === String(committeeId) &&
        String(member.userId) === String(data.userId)
    );

    if (alreadyExists) {
      throw new Error("This user is already a member of the committee.");
    }

    const newMember = {
      id: Date.now(),
      committeeId: Number(committeeId),
      userId: Number(data.userId),
      name: data.name,
      email: data.email,
      systemRole: data.systemRole,
      department: data.department,
      committeeRole: data.committeeRole || "Member",
      joinedAt: new Date().toISOString(),
    };

    const updatedMembers = [...members, newMember];

    saveMembers(updatedMembers);

    // Update committee member count
    const committees = readCommittees();

    const updatedCommittees = committees.map((committee) => {
      if (String(committee.id) !== String(committeeId)) {
        return committee;
      }

      const count = updatedMembers.filter(
        (member) =>
          String(member.committeeId) === String(committeeId)
      ).length;

      return {
        ...committee,
        memberCount: count,
      };
    });

    saveCommittees(updatedCommittees);

    return newMember;
  },

  removeMember: async (memberId) => {
    const members = readMembers();

    const memberToRemove = members.find(
      (member) => String(member.id) === String(memberId)
    );

    if (!memberToRemove) {
      return false;
    }

    const updatedMembers = members.filter(
      (member) => String(member.id) !== String(memberId)
    );

    saveMembers(updatedMembers);

    // Update committee count
    const committees = readCommittees();

    const updatedCommittees = committees.map((committee) => {
      if (
        String(committee.id) !==
        String(memberToRemove.committeeId)
      ) {
        return committee;
      }

      const count = updatedMembers.filter(
        (member) =>
          String(member.committeeId) ===
          String(memberToRemove.committeeId)
      ).length;

      return {
        ...committee,
        memberCount: count,
      };
    });

    saveCommittees(updatedCommittees);

    return true;
  },

  updateMemberRole: async (memberId, committeeRole) => {
    const members = readMembers();

    const updatedMembers = members.map((member) => {
      if (String(member.id) !== String(memberId)) {
        return member;
      }

      return {
        ...member,
        committeeRole,
      };
    });

    saveMembers(updatedMembers);

    return updatedMembers.find(
      (member) => String(member.id) === String(memberId)
    );
  },
};

export default committeeService;