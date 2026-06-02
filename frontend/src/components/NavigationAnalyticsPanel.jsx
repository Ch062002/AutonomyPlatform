import { useEffect, useState } from "react";

import { getNavigationAnalytics } from "../services/api";

const ANALYTICS_FIELDS = [
  { key: "samples", label: "Samples" },
  { key: "avg_velocity", label: "Avg Velocity", suffix: " m/s" },
  { key: "max_velocity", label: "Max Velocity", suffix: " m/s" },
  { key: "avg_global_altitude", label: "Avg Altitude", suffix: " m" },
  { key: "min_global_altitude", label: "Min Altitude", suffix: " m" },
  { key: "max_global_altitude", label: "Max Altitude", suffix: " m" },
  { key: "failsafe_count", label: "Failsafe Count" },
  { key: "healthy_count", label: "Healthy Samples" },
  { key: "warning_count", label: "Warning Samples" },
  { key: "gps_sample_count", label: "GPS Samples" }
];

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value : value.toFixed(2);
    return `${formatted}${suffix}`;
  }

  return `${value}${suffix}`;
}

function NavigationAnalyticsPanel() {
  const [analytics, setAnalytics] = useState({});
  const [message, setMessage] = useState("Loading navigation analytics...");

  const fetchAnalytics = async () => {
    try {
      const r = await getNavigationAnalytics();

      setAnalytics(r.data.analytics || {});
      setMessage(r.data.message || "Navigation analytics updated");
    } catch {
      setAnalytics({});
      setMessage("Navigation analytics unavailable");
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  const hasAnalytics = Object.keys(analytics).length > 0;
  const positionSources = Object.entries(
    analytics.position_source_summary || {}
  );

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Navigation Analytics</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)"
        }}
      >
        <p style={{ color: "#94a3b8", marginTop: 0 }}>
          {message}
        </p>

        {!hasAnalytics ? (
          <div
            style={{
              padding: "0.9rem",
              backgroundColor: "#0f172a",
              borderRadius: "8px",
              border: "1px solid #334155",
              color: "#cbd5e1"
            }}
          >
            No navigation analytics available
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
                gap: "0.8rem"
              }}
            >
              {ANALYTICS_FIELDS.map((field) => (
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
                      marginTop: "0.45rem",
                      color: "#e2e8f0",
                      fontSize: "1.1rem",
                      fontWeight: "bold"
                    }}
                  >
                    {formatValue(analytics[field.key], field.suffix || "")}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "0.9rem",
                padding: "0.8rem",
                backgroundColor: "#0f172a",
                borderRadius: "8px",
                border: "1px solid #334155"
              }}
            >
              <strong>Position Source Summary</strong>

              {positionSources.length === 0 ? (
                <p style={{ color: "#94a3b8", marginBottom: 0 }}>--</p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "0.7rem",
                    marginTop: "0.8rem"
                  }}
                >
                  {positionSources.map(([source, count]) => (
                    <div
                      key={source}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "1rem",
                        color: "#e2e8f0"
                      }}
                    >
                      <span style={{ color: "#94a3b8" }}>{source}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default NavigationAnalyticsPanel;
