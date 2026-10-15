import React, { useEffect, useState } from "react";
import { Bell, CheckCircle2, RefreshCw } from "lucide-react";

import api from "../services/api";
import PageHeader from "../components/common/PageHeader";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "../components/common/FeedbackStates";

export const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/notifications");
      setNotifications(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      setNotifications([]);
      setError(
        err?.response?.data?.detail ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (notification) => {
    if (!notification?.id || notification.is_read) {
      return;
    }

    try {
      setUpdatingId(notification.id);

      const response = await api.put(
        `/notifications/${notification.id}/read`
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, ...response.data, is_read: true }
            : item
        )
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to mark notification as read."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const formatTime = (value) => {
    if (!value) {
      return "";
    }

    try {
      return new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="SYSTEM ALERTS"
        title="Notifications & Inbox"
        description="Alerts for document uploads, review requests, and approvals."
        primaryAction={{
          label: "Refresh",
          icon: RefreshCw,
          onClick: loadNotifications,
        }}
      />

      <div className="panel">
        {loading ? (
          <LoadingState message="Loading notifications..." />
        ) : error ? (
          <ErrorState
            title="Unable to load notifications"
            message={error}
            onRetry={loadNotifications}
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            message="You have no workflow alerts yet."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {notifications.map((notification) => {
              const unread = !notification.is_read;

              return (
                <div
                  key={notification.id}
                  style={{
                    padding: "14px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: unread ? "#f0f7ff" : "#ffffff",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      padding: "8px",
                      background: unread ? "#dbeafe" : "#f1f5f9",
                      borderRadius: "50%",
                      color: "#2563eb",
                    }}
                  >
                    <Bell size={18} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <strong style={{ fontSize: "13px", color: "#1e293b" }}>
                        {notification.title}
                      </strong>
                      <span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {formatTime(notification.created_at)}
                      </span>
                    </div>

                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#475569" }}>
                      {notification.message}
                    </p>
                  </div>

                  {unread && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notification)}
                      disabled={updatingId === notification.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 10px",
                        border: "1px solid #bbf7d0",
                        background: "#f0fdf4",
                        color: "#15803d",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor:
                          updatingId === notification.id
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      <CheckCircle2 size={13} />
                      {updatingId === notification.id
                        ? "Updating..."
                        : "Mark read"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
