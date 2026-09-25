import React from "react";

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const s = String(status).trim().toLowerCase();

  const getStyle = () => {
    // ========================================================
    // CHANGES REQUESTED
    // ========================================================
    if (
      s.includes("changes requested") ||
      s.includes("change requested")
    ) {
      return {
        bg: "#fff7ed",
        color: "#ea580c",
        border: "#fed7aa",
      };
    }

    // ========================================================
    // APPROVED / VERIFIED / COMPLETED / ACTIVE
    // ========================================================
    if (
      s.includes("approved") ||
      s.includes("verified") ||
      s.includes("completed") ||
      s.includes("active")
    ) {
      return {
        bg: "#ecfdf5",
        color: "#059669",
        border: "#a7f3d0",
      };
    }

    // ========================================================
    // REVIEW / SUBMITTED / IN PROGRESS
    // ========================================================
    if (
      s.includes("review") ||
      s.includes("submitted") ||
      s.includes("progress")
    ) {
      return {
        bg: "#eff6ff",
        color: "#2563eb",
        border: "#bfdbfe",
      };
    }

    // ========================================================
    // PENDING / ATTENTION
    // ========================================================
    if (
      s.includes("pending") ||
      s.includes("attention")
    ) {
      return {
        bg: "#fffbeb",
        color: "#d97706",
        border: "#fde68a",
      };
    }

    // ========================================================
    // REJECTED / RETURNED / INACTIVE
    // ========================================================
    if (
      s.includes("rejected") ||
      s.includes("returned") ||
      s.includes("inactive")
    ) {
      return {
        bg: "#fef2f2",
        color: "#dc2626",
        border: "#fecaca",
      };
    }

    // ========================================================
    // DRAFT
    // ========================================================
    if (s === "draft") {
      return {
        bg: "#f3f4f6",
        color: "#4b5563",
        border: "#e5e7eb",
      };
    }

    // ========================================================
    // DEFAULT
    // ========================================================
    return {
      bg: "#f3f4f6",
      color: "#4b5563",
      border: "#e5e7eb",
    };
  };

  const style = getStyle();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: "600",
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
};

export default StatusBadge;