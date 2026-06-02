import { useEffect, useState } from "react";

import { getEstimationComparisonAnalytics } from "../services/api";

const COMPARISON_FIELDS = [
  { key: "samples", label: "Samples" },
  { key: "avg_position_difference", label: "Avg Position Diff" },
  { key: "max_position_difference", label: "Max Position Diff" },
  { key: "avg_velocity_difference", label: "Avg Velocity Diff" },
  { key: "avg_innovation_difference", label: "Avg Innovation Diff" }
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

function EstimationComparisonPanel() {
  const [analytics, setAnalytics] = useState({});
  const [message, setMessage] = useState("Loading comparison analytics...");

  const fetchAnalytics = async () => {
    try {
      const r = await getEstimationComparisonAnalytics();

      setAnalytics(r.data.analytics || {});
      setMessage(r.data.message || "Comparison analytics updated");
    } catch {
      setAnalytics({});
      setMessage("Comparison analytics unavailable");
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Estimation Comparison</h2>

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
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "0.8rem"
          }}
        >
          {COMPARISON_FIELDS.map((field) => (
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

export default EstimationComparisonPanel;
