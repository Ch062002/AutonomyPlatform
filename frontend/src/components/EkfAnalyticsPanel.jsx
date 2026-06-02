import { useEffect, useState } from "react";

import { getEkfAnalytics } from "../services/api";

const EKF_ANALYTICS_FIELDS = [
  { key: "samples", label: "Samples" },
  { key: "avg_innovation", label: "Avg Innovation" },
  { key: "max_innovation", label: "Max Innovation" },
  { key: "avg_covariance_trace", label: "Avg Covariance Trace" }
];

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value : value.toFixed(4);
  }

  return value;
}

function EkfAnalyticsPanel() {
  const [analytics, setAnalytics] = useState({});
  const [message, setMessage] = useState("Loading EKF analytics...");

  const fetchAnalytics = async () => {
    try {
      const r = await getEkfAnalytics();

      setAnalytics(r.data.analytics || {});
      setMessage(r.data.message || "EKF analytics updated");
    } catch {
      setAnalytics({});
      setMessage("EKF analytics unavailable");
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>EKF Analytics</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)"
        }}
      >
        <p style={{ color: "#94a3b8", marginTop: 0 }}>{message}</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "0.8rem"
          }}
        >
          {EKF_ANALYTICS_FIELDS.map((field) => (
            <div
              key={field.key}
              style={{
                backgroundColor: "#0f172a",
                padding: "0.8rem",
                borderRadius: "8px",
                border: "1px solid #334155"
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                {field.label}
              </div>
              <div
                style={{
                  color: "#e2e8f0",
                  fontWeight: "bold",
                  marginTop: "0.45rem"
                }}
              >
                {formatValue(analytics[field.key])}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EkfAnalyticsPanel;
