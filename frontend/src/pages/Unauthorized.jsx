import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <div style={{ display: "inline-flex", padding: "16px", background: "#fef2f2", color: "#dc2626", borderRadius: "50%", marginBottom: "16px" }}>
        <ShieldAlert size={42} />
      </div>
      <h1 style={{ margin: "0 0 10px", fontSize: "24px", color: "#991b1b" }}>Access Restricted</h1>
      <p style={{ margin: "0 auto 20px", maxWidth: "460px", color: "#64748b", fontSize: "13px", lineHeight: "1.6" }}>
        You do not have the required permissions or role authorization to access this section of the NAAC Management System.
      </p>
      <button
        onClick={() => navigate("/dashboard")}
        style={{
          padding: "10px 20px",
          background: "#2563eb",
          color: "#ffffff",
          border: "none",
          borderRadius: "8px",
          fontWeight: "700",
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        Return to My Dashboard
      </button>
    </div>
  );
};

export default Unauthorized;
