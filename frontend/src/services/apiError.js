function formatValidationItem(item) {
  if (typeof item === "string") {
    return item;
  }
  if (!item || typeof item !== "object") {
    return "";
  }
  const message = typeof item.msg === "string" ? item.msg : "";
  const location = Array.isArray(item.loc)
    ? item.loc.filter((part) => part !== "body").join(".")
    : "";
  if (!message) {
    return "";
  }
  return location ? `${location}: ${message}` : message;
}

function formatDetail(detail) {
  if (typeof detail === "string") {
    return detail.trim();
  }
  if (Array.isArray(detail)) {
    return detail.map(formatValidationItem).filter(Boolean).join("\n");
  }
  if (detail && typeof detail === "object") {
    for (const key of ["message", "detail", "reason"]) {
      if (typeof detail[key] === "string" && detail[key].trim()) {
        return detail[key].trim();
      }
    }
  }
  return "";
}

// Always returns a string so React never receives an object or array to render.
export function formatApiError(err, fallback = "Something went wrong.") {
  const fromDetail = formatDetail(err?.response?.data?.detail);
  if (fromDetail) {
    return fromDetail;
  }
  if (typeof err?.message === "string" && err.message.trim()) {
    return err.message.trim();
  }
  return fallback;
}
