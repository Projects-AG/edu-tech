import React from "react";
import StatusBadge from "./StatusBadge";

export const DataTable = ({ columns, data, keyField = "id", emptyMessage = "No records found." }) => {
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "12px",
          textAlign: "left",
        }}
      >
        <thead>
          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            {columns.map((col, index) => (
              <th
                key={col.key || index}
                style={{
                  padding: "12px 14px",
                  color: "#64748b",
                  fontWeight: "700",
                  fontSize: "10px",
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeData.map((row, rowIndex) => (
            <tr
              key={row[keyField] || rowIndex}
              style={{
                borderBottom: "1px solid #f1f5f9",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {columns.map((col, colIndex) => {
                const cellValue = row[col.dataIndex];
                return (
                  <td key={col.key || colIndex} style={{ padding: "12px 14px", color: "#1e293b" }}>
                    {col.render
                      ? col.render(cellValue, row, rowIndex)
                      : col.isStatus
                      ? <StatusBadge status={cellValue} />
                      : cellValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
