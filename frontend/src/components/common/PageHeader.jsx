import React from "react";

export const PageHeader = ({ eyebrow, title, description, primaryAction, secondaryAction }) => {
  return (
    <section className="welcome-banner" style={{ marginBottom: "22px" }}>
      <div>
        {eyebrow && <div className="welcome-eyebrow">{eyebrow}</div>}
        <h1 style={{ margin: 0, fontSize: "22px" }}>{title}</h1>
        {description && <p style={{ margin: "6px 0 0", color: "#b6c6da", fontSize: "12px" }}>{description}</p>}
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="welcome-actions">
          {secondaryAction && (
            <button
              type="button"
              className="secondary-action"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.icon && <secondaryAction.icon size={16} />}
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              type="button"
              className="primary-action"
              onClick={primaryAction.onClick}
            >
              {primaryAction.icon && <primaryAction.icon size={16} />}
              {primaryAction.label}
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default PageHeader;
