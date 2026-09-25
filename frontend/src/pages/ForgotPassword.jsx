
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, ShieldCheck } from "lucide-react";

import api from "../services/api";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const enteredEmail = email.trim();

    if (!enteredEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/forgot-password", {
        email: enteredEmail,
      });

      setMessage(
        response.data?.message ||
          "If an account exists for this email, a verification code has been sent."
      );

      // Save email temporarily for the OTP page
      sessionStorage.setItem(
        "resetEmail",
        enteredEmail
      );

      // Move to OTP verification
      setTimeout(() => {
        navigate("/verify-otp");
      }, 1000);
    } catch (error) {
      console.error("FORGOT PASSWORD ERROR:", error);

      setError(
        error.response?.data?.detail ||
          "Unable to process your request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f9fc",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 18px",
              borderRadius: "16px",
              background: "#eef2ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck
              size={32}
              color="#4f46e5"
            />
          </div>

          <h1
            style={{
              margin: "0 0 10px",
              fontSize: "28px",
              color: "#172033",
            }}
          >
            Forgot Password?
          </h1>

          <p
            style={{
              margin: 0,
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Enter your registered institutional email
            address and we'll send you a verification
            code.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              color: "#374151",
            }}
          >
            Email Address
          </label>

          <div
            style={{
              position: "relative",
              marginBottom: "20px",
            }}
          >
            <Mail
              size={19}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af",
              }}
            />

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your registered email"
              disabled={loading}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px 14px 14px 44px",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          {/* Success message */}
          {message && (
            <div
              style={{
                padding: "12px 14px",
                marginBottom: "18px",
                borderRadius: "8px",
                background: "#ecfdf5",
                color: "#047857",
                fontSize: "14px",
              }}
            >
              {message}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              style={{
                padding: "12px 14px",
                marginBottom: "18px",
                borderRadius: "8px",
                background: "#fef2f2",
                color: "#dc2626",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background: "#4f46e5",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "600",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>

        {/* Back to Login */}
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "12px",
            border: "none",
            background: "transparent",
            color: "#4f46e5",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
          }}
        >
          <ArrowLeft size={17} />
          Back to Login
        </button>

        {/* Security information */}
        <div
          style={{
            marginTop: "28px",
            paddingTop: "20px",
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          For security, password recovery is available
          only through your registered institutional
          email address.
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;

