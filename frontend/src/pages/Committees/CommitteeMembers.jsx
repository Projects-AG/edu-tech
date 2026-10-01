import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Users,
  Mail,
  Building2,
  RefreshCw,
} from "lucide-react";

import committeeService from "../../services/committeeService";

const CommitteeMembers = () => {
  const { id } = useParams();

  const [committee, setCommittee] = useState(null);
  const [members, setMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  const [selectedUser, setSelectedUser] = useState("");
  const [committeeRole, setCommitteeRole] = useState("Member");

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const committeeData = await committeeService.getCommittee(id);

      if (!committeeData) {
        setCommittee(null);
        setError("Committee not found.");
        return;
      }

      const membersData = await committeeService.getMembers(id);
      const usersData = await committeeService.getAvailableUsers(id);

      setCommittee(committeeData);
      setMembers(membersData);
      setAvailableUsers(usersData);
    } catch (err) {
      console.error("Failed to load committee members:", err);
      setError("Failed to load committee members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();

    if (!selectedUser) {
      setError("Please select a user.");
      return;
    }

    try {
      setAdding(true);
      setError("");

      const user = availableUsers.find(
        (item) => String(item.id) === String(selectedUser)
      );

      if (!user) {
        setError("Selected user could not be found.");
        return;
      }

      await committeeService.addMember(id, {
        userId: user.id,
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
        department: user.department,
        committeeRole,
      });

      setSelectedUser("");
      setCommitteeRole("Member");

      await loadData();
    } catch (err) {
      console.error("Failed to add member:", err);
      setError(
        err.message || "Failed to add member. Please try again."
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this member from the committee?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await committeeService.removeMember(memberId);
      await loadData();
    } catch (err) {
      console.error("Failed to remove member:", err);
      setError("Failed to remove member.");
    }
  };

  const handleRoleChange = async (memberId, role) => {
    try {
      setError("");

      await committeeService.updateMemberRole(memberId, role);
      await loadData();
    } catch (err) {
      console.error("Failed to update member role:", err);
      setError("Failed to update member role.");
    }
  };

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingSpinner}>
            <RefreshCw size={22} />
          </div>

          <p style={styles.loadingText}>
            Loading committee members...
          </p>
        </div>
      </div>
    );
  }

  /* =========================
     COMMITTEE NOT FOUND
  ========================= */

  if (!committee) {
    return (
      <div style={styles.page}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>
            <Users size={24} />
          </div>

          <h2 style={styles.errorTitle}>
            Committee not found
          </h2>

          <p style={styles.errorText}>
            {error || "The requested committee could not be found."}
          </p>

          <Link to="/committees" style={styles.backButton}>
            <ArrowLeft size={17} />
            Back to Committees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* =========================
          HEADER
      ========================= */}

      <div style={styles.header}>
        <div>
          <Link to="/committees" style={styles.backLink}>
            <ArrowLeft size={16} />
            Back to Committees
          </Link>

          <h1 style={styles.pageTitle}>
            Committee Members
          </h1>

          <p style={styles.pageSubtitle}>
            Manage members of{" "}
            <span style={styles.boldText}>
              {committee.name}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          style={styles.refreshButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
          }}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* =========================
          ERROR MESSAGE
      ========================= */}

      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            style={styles.closeError}
          >
            ×
          </button>
        </div>
      )}

      {/* =========================
          COMMITTEE SUMMARY
      ========================= */}

      <div style={styles.card}>
        <div style={styles.summaryContainer}>
          <div style={styles.summaryIcon}>
            <Users size={23} />
          </div>

          <div style={styles.summaryContent}>
            <h2 style={styles.cardTitle}>
              {committee.name}
            </h2>

            <p style={styles.description}>
              {committee.description ||
                "No committee description available."}
            </p>
          </div>

          <div style={styles.memberCount}>
            <div style={styles.memberCountNumber}>
              {members.length}
            </div>

            <div style={styles.memberCountLabel}>
              {members.length === 1 ? "Member" : "Members"}
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          ADD MEMBER
      ========================= */}

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardHeaderTitle}>
            <div style={styles.smallIcon}>
              <UserPlus size={18} />
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Add Member
              </h2>

              <p style={styles.cardSubtitle}>
                Add an existing institution user to this committee.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddMember}>
          <div style={styles.formBody}>
            {/* USER */}

            <div style={styles.userField}>
              <label style={styles.label}>
                Select User
              </label>

              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                style={styles.select}
              >
                <option value="">
                  Select a user...
                </option>

                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} — {user.systemRole} —{" "}
                    {user.department}
                  </option>
                ))}
              </select>

              {availableUsers.length === 0 && (
                <p style={styles.helperText}>
                  All available users are already members of this
                  committee.
                </p>
              )}
            </div>

            {/* COMMITTEE ROLE */}

            <div style={styles.roleField}>
              <label style={styles.label}>
                Committee Role
              </label>

              <select
                value={committeeRole}
                onChange={(e) =>
                  setCommitteeRole(e.target.value)
                }
                style={styles.select}
              >
                <option value="Member">
                  Member
                </option>

                <option value="Coordinator">
                  Coordinator
                </option>

                <option value="Chairperson">
                  Chairperson
                </option>
              </select>
            </div>
          </div>

          <div style={styles.formFooter}>
            <button
              type="submit"
              disabled={adding || !selectedUser}
              style={{
                ...styles.primaryButton,
                opacity:
                  adding || !selectedUser ? 0.55 : 1,
                cursor:
                  adding || !selectedUser
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              <UserPlus size={17} />

              {adding ? "Adding..." : "Add Member"}
            </button>
          </div>
        </form>
      </div>

      {/* =========================
          MEMBERS LIST
      ========================= */}

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>
            Committee Members
          </h2>

          <p style={styles.cardSubtitle}>
            Users currently assigned to this committee.
          </p>
        </div>

        {members.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <Users size={25} />
            </div>

            <h3 style={styles.emptyTitle}>
              No members yet
            </h3>

            <p style={styles.emptyText}>
              Add members using the form above.
            </p>
          </div>
        ) : (
          <div>
            {members.map((member, index) => (
              <div
                key={member.id}
                style={{
                  ...styles.memberRow,
                  borderBottom:
                    index === members.length - 1
                      ? "none"
                      : "1px solid #f1f5f9",
                }}
              >
                {/* AVATAR */}

                <div style={styles.avatar}>
                  {member.name
                    ?.charAt(0)
                    ?.toUpperCase() || "U"}
                </div>

                {/* USER INFORMATION */}

                <div style={styles.memberInfo}>
                  <div style={styles.memberNameRow}>
                    <h3 style={styles.memberName}>
                      {member.name}
                    </h3>

                    <span style={styles.roleBadge}>
                      {member.committeeRole}
                    </span>
                  </div>

                  <div style={styles.memberDetails}>
                    <span style={styles.detailItem}>
                      <Mail size={14} />
                      {member.email}
                    </span>

                    <span style={styles.detailItem}>
                      <Building2 size={14} />
                      {member.department}
                    </span>
                  </div>
                </div>

                {/* SYSTEM ROLE */}

                <div style={styles.systemRole}>
                  <p style={styles.systemRoleLabel}>
                    System Role
                  </p>

                  <p style={styles.systemRoleValue}>
                    {member.systemRole}
                  </p>
                </div>

                {/* COMMITTEE ROLE */}

                <div>
                  <select
                    value={member.committeeRole}
                    onChange={(e) =>
                      handleRoleChange(
                        member.id,
                        e.target.value
                      )
                    }
                    style={styles.memberRoleSelect}
                  >
                    <option value="Member">
                      Member
                    </option>

                    <option value="Coordinator">
                      Coordinator
                    </option>

                    <option value="Chairperson">
                      Chairperson
                    </option>
                  </select>
                </div>

                {/* REMOVE */}

                <button
                  type="button"
                  onClick={() =>
                    handleRemoveMember(member.id)
                  }
                  style={styles.removeButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "#fef2f2";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "#ffffff";
                  }}
                >
                  <Trash2 size={15} />
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles = {
  page: {
    padding: "24px",
    backgroundColor: "#f8fafc",
    minHeight: "100%",
    color: "#111827",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "24px",
  },

  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    color: "#2563eb",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "12px",
  },

  pageTitle: {
    margin: 0,
    fontSize: "26px",
    lineHeight: "1.3",
    fontWeight: "700",
    color: "#111827",
  },

  pageSubtitle: {
    margin: "6px 0 0",
    fontSize: "14px",
    color: "#64748b",
  },

  boldText: {
    fontWeight: "600",
    color: "#334155",
  },

  refreshButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    color: "#334155",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },

  errorBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 14px",
    marginBottom: "20px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    color: "#b91c1c",
    fontSize: "14px",
  },

  closeError: {
    border: "none",
    background: "transparent",
    color: "#b91c1c",
    fontSize: "20px",
    lineHeight: "1",
    cursor: "pointer",
  },

  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    marginBottom: "20px",
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
  },

  summaryContainer: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    padding: "20px",
  },

  summaryIcon: {
    width: "46px",
    height: "46px",
    minWidth: "46px",
    borderRadius: "10px",
    backgroundColor: "#dbeafe",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryContent: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "600",
    color: "#111827",
  },

  description: {
    margin: "6px 0 0",
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#64748b",
  },

  memberCount: {
    textAlign: "right",
    minWidth: "80px",
  },

  memberCountNumber: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#111827",
    lineHeight: "1.2",
  },

  memberCountLabel: {
    marginTop: "3px",
    fontSize: "12px",
    color: "#64748b",
  },

  cardHeader: {
    padding: "18px 20px",
    borderBottom: "1px solid #e2e8f0",
  },

  cardHeaderTitle: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },

  smallIcon: {
    width: "34px",
    height: "34px",
    minWidth: "34px",
    borderRadius: "8px",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  cardSubtitle: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#64748b",
  },

  formBody: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "16px",
    padding: "20px",
  },

  userField: {
    minWidth: 0,
  },

  roleField: {
    minWidth: 0,
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    color: "#334155",
    fontSize: "14px",
    outline: "none",
  },

  helperText: {
    margin: "7px 0 0",
    fontSize: "12px",
    color: "#64748b",
  },

  formFooter: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "0 20px 20px",
  },

  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    transition: "background-color 0.2s",
  },

  emptyState: {
    padding: "48px 20px",
    textAlign: "center",
  },

  emptyIcon: {
    width: "50px",
    height: "50px",
    margin: "0 auto",
    borderRadius: "50%",
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    margin: "14px 0 0",
    fontSize: "15px",
    fontWeight: "600",
    color: "#111827",
  },

  emptyText: {
    margin: "5px 0 0",
    fontSize: "13px",
    color: "#64748b",
  },

  memberRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "18px 20px",
    flexWrap: "wrap",
  },

  avatar: {
    width: "44px",
    height: "44px",
    minWidth: "44px",
    borderRadius: "50%",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "700",
  },

  memberInfo: {
    flex: 1,
    minWidth: "220px",
  },

  memberNameRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  memberName: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "600",
    color: "#111827",
  },

  roleBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: "999px",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "11px",
    fontWeight: "600",
  },

  memberDetails: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginTop: "6px",
    flexWrap: "wrap",
  },

  detailItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#64748b",
  },

  systemRole: {
    minWidth: "150px",
  },

  systemRoleLabel: {
    margin: 0,
    fontSize: "11px",
    color: "#94a3b8",
  },

  systemRoleValue: {
    margin: "4px 0 0",
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
  },

  memberRoleSelect: {
    padding: "8px 10px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    color: "#334155",
    fontSize: "13px",
    outline: "none",
  },

  removeButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "8px 11px",
    backgroundColor: "#ffffff",
    border: "1px solid #fecaca",
    borderRadius: "7px",
    color: "#dc2626",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },

  loadingCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "50px 20px",
    textAlign: "center",
  },

  loadingSpinner: {
    width: "42px",
    height: "42px",
    margin: "0 auto",
    borderRadius: "50%",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    margin: "12px 0 0",
    fontSize: "14px",
    color: "#64748b",
  },

  errorCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "50px 20px",
    textAlign: "center",
  },

  errorIcon: {
    width: "48px",
    height: "48px",
    margin: "0 auto",
    borderRadius: "50%",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  errorTitle: {
    margin: "14px 0 0",
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827",
  },

  errorText: {
    margin: "6px 0 0",
    fontSize: "14px",
    color: "#64748b",
  },

  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    marginTop: "18px",
    padding: "10px 15px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    textDecoration: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
  },
};

export default CommitteeMembers;