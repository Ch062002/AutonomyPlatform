import { useEffect, useState } from "react";

import { getGuidanceAnalytics } from "../services/api";

const METRIC_FIELDS = [
  { key: "samples", label: "Samples" },
  { key: "avg_cross_track_error", label: "Avg CTE" },
  { key: "max_cross_track_error", label: "Max CTE" },
  { key: "avg_distance_to_waypoint", label: "Avg WP Distance" },
  { key: "min_distance_to_waypoint", label: "Min WP Distance" },
  { key: "avg_heading_error", label: "Avg Heading Error" },
  { key: "avg_path_length", label: "Avg Path Length" },
  { key: "avg_progress_percent", label: "Avg Progress" },
  { key: "completion_count", label: "Completions" },
  { key: "avg_field_strength", label: "Avg Field Strength" },
  { key: "avg_pursuit_distance", label: "Avg Pursuit Distance" },
  { key: "avg_distance_to_target", label: "Avg Target Distance" },
  { key: "average_turn_feasible_ratio", label: "Turn Feasible Ratio" }
];

function formatMetricValue(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value : value.toFixed(2);
  }

  return value;
}

function GuidanceAnalyticsPanel() {
  const [analytics, setAnalytics] = useState({});
  const [message, setMessage] = useState("Loading guidance analytics...");

  const fetchAnalytics = async () => {
    try {
      const r = await getGuidanceAnalytics();

      setAnalytics(r.data.analytics || {});
      setMessage(r.data.message || "Guidance analytics updated");
    } catch {
      setAnalytics({});
      setMessage("Guidance analytics unavailable");
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  const modes = Object.entries(analytics);

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Guidance Analytics</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          maxHeight: "520px",
          overflowY: "auto"
        }}
      >
        <p style={{ color: "#94a3b8", marginTop: 0 }}>
          {message}
        </p>

        {modes.length === 0 ? (
          <div
            style={{
              padding: "0.9rem",
              backgroundColor: "#0f172a",
              borderRadius: "8px",
              border: "1px solid #334155",
              color: "#cbd5e1"
            }}
          >
            No analytics available
          </div>
        ) : (
          modes.map(([mode, metrics]) => (
            <div
              key={mode}
              style={{
                marginTop: "0.8rem",
                padding: "0.8rem",
                backgroundColor: "#0f172a",
                borderRadius: "8px",
                border: "1px solid #334155"
              }}
            >
              <strong>{mode}</strong>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "0.45rem 0.8rem",
                  marginTop: "0.8rem",
                  fontSize: "0.92rem"
                }}
              >
                {METRIC_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    style={{ display: "contents" }}
                  >
                    <span style={{ color: "#94a3b8" }}>{field.label}</span>
                    <span style={{ textAlign: "right", color: "#e2e8f0" }}>
                      {formatMetricValue(metrics?.[field.key])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default GuidanceAnalyticsPanel;
