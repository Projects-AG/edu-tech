import React from "react";
import { MOCK_NOTIFICATIONS } from "../services/mockData";
import PageHeader from "../components/common/PageHeader";
import { Bell, CheckCircle2 } from "lucide-react";

export const Notifications = () => {
  return (
    <div>
      <PageHeader eyebrow="SYSTEM ALERTS" title="Notifications & Inbox" description="Real-time alerts regarding document uploads, review requests, and approvals." />
      <div className="panel">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {MOCK_NOTIFICATIONS.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: n.unread ? "#f0f7ff" : "#ffffff",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div style={{ padding: "8px", background: n.unread ? "#dbeafe" : "#f1f5f9", borderRadius: "50%", color: "#2563eb" }}>
                <Bell size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: "13px", color: "#1e293b" }}>{n.title}</strong>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>{n.time}</span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#475569" }}>{n.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
