import React, { useState, useEffect } from "react";
import { Download, FileText, CheckCircle, PieChart, ShieldAlert } from "lucide-react";
import reportService from "../services/reportService";
import DataTable from "../components/common/DataTable";
import PageHeader from "../components/common/PageHeader";

export const Reports = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getReports()
      .then((data) => {
        setSummaryData(data);
        if (Array.isArray(data)) {
          setReports(data);
        } else if (data && Array.isArray(data.criterion_performance)) {
          const dossierItems = data.criterion_performance.map((c, index) => ({
            id: c.criterion_id || `crit_${index + 1}`,
            name: `Criterion ${index + 1} Executive Report (${c.code || 'CRITERIA'})`,
            format: "PDF / JSON",
            type: "NAAC SSR Dossier",
            generatedDate: new Date().toISOString().split("T")[0],
            status: `${c.completion_percentage || 0}% Complete`
          }));
          setReports(dossierItems);
        } else {
          setReports([
            { id: "rep_ssr_1", name: "Annual Quality Assurance Report (AQAR 2025-26)", format: "PDF", type: "AQAR Dossier", generatedDate: new Date().toISOString().split("T")[0] },
            { id: "rep_ssr_2", name: "Self Study Report (SSR Cycle 3 Pack)", format: "PDF", type: "SSR Dossier", generatedDate: new Date().toISOString().split("T")[0] },
          ]);
        }
      })
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = () => {
    reportService.generateReport("SSR Summary").then((res) => {
      const newItem = {
        id: res?.id || `rep_${Date.now()}`,
        name: res?.name || "Generated SSR Executive Dossier",
        format: res?.format || "PDF",
        type: res?.type || "SSR Dossier",
        generatedDate: res?.generatedDate || new Date().toISOString().split("T")[0]
      };
      setReports((prev) => [newItem, ...prev]);
    });
  };

  const columns = [
    { title: "Report Name", dataIndex: "name" },
    { title: "Format", dataIndex: "format" },
    { title: "Report Type", dataIndex: "type" },
    { title: "Generated Date", dataIndex: "generatedDate" },
    {
      title: "Download",
      dataIndex: "id",
      render: () => (
        <button style={{ padding: "6px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <Download size={13} /> Export
        </button>
      ),
    },
  ];

  return (
    <div style={{ color: "#1e293b" }}>
      <PageHeader
        eyebrow="ANALYTICS & DOSSIERS"
        title="Accreditation Reports"
        description="Generate executive SSR packets, criteria breakdown sheets, and compliance logs."
        primaryAction={{
          label: "Generate New SSR Report",
          icon: Download,
          onClick: handleGenerate,
        }}
      />

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      {summaryData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "#ffffff", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#2563eb", marginBottom: "8px" }}>
              <PieChart size={18} />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Overall Progress</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{summaryData.overall_completion_percentage || 0}%</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Institutional SSR readiness</div>
          </div>

          <div style={{ background: "#ffffff", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#16a34a", marginBottom: "8px" }}>
              <CheckCircle size={18} />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Approval Rate</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{summaryData.approval_rate_percentage || 0}%</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Approver sign-off metric</div>
          </div>

          <div style={{ background: "#ffffff", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#7c3aed", marginBottom: "8px" }}>
              <FileText size={18} />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Total Submissions</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{summaryData.submission_funnel?.total || 0}</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Criteria form submissions</div>
          </div>

          <div style={{ background: "#ffffff", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#ea580c", marginBottom: "8px" }}>
              <ShieldAlert size={18} />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Verified Evidence</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{summaryData.evidence?.verified || 0}</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Out of {summaryData.evidence?.total || 0} uploaded files</div>
          </div>
        </div>
      )}

      {/* DOSSIERS TABLE PANEL */}
      <div className="panel" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Generated Dossiers & Exports</h3>
        <DataTable columns={columns} data={Array.isArray(reports) ? reports : []} keyField="id" emptyMessage="No report dossiers generated yet." />
      </div>
    </div>
  );
};

export default Reports;
