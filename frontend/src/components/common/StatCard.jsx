import React from "react";

export const StatCard = ({ icon: Icon, label, value, change, color = "blue", smallValue = false }) => {
  return (
    <div className="kpi-card">
      {Icon && (
        <div className={`kpi-icon ${color}`}>
          <Icon size={21} />
        </div>
      )}
      <div>
        <span className="kpi-label">{label}</span>
        <strong className={`kpi-value ${smallValue ? "small-value" : ""}`}>{value}</strong>
        {change && (
          <span className={`kpi-change ${change.includes("-") ? "warning" : "positive"}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
