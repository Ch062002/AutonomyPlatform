import { useEffect, useMemo, useState } from "react";

import {
  exportControllerComparison,
  getControllerComparison
} from "../services/api";

const METRIC_KEYS = [
  "tracking_error",
  "control_effort",
  "response_quality",
  "robustness_score",
  "computation_time_ms",
  "constraint_violations",
  "health_score"
];

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${value}`;
  }

  return Math.abs(number) >= 100 ? number.toFixed(1) : number.toFixed(4);
}

function ControllerComparisonPanel() {
  const [comparison, setComparison] = useState(null);

  const fetchComparison = async () => {
    try {
      const response = await getControllerComparison();
      setComparison(response.data || null);
    } catch {
      setComparison(null);
    }
  };

  useEffect(() => {
    fetchComparison();
    const interval = setInterval(fetchComparison, 5000);
    return () => clearInterval(interval);
  }, []);

  const metrics = comparison?.metrics || [];
  const bestController = comparison?.best_controller || "--";
  const maxScore = useMemo(() => (
    metrics.reduce((max, metric) => Math.max(max, Number(metric.overall_score) || 0), 0)
  ), [metrics]);

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Controller Comparison</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "12px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.12)"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.75rem",
            marginBottom: "0.9rem"
          }}
        >
          <MetricTile label="Best Controller" value={bestController} color="#22c55e" />
          <MetricTile
            label="Active Controller"
            value={comparison?.active_controller || "--"}
            color="#38bdf8"
          />
          <MetricTile
            label="Last Snapshot"
            value={comparison?.timestamp ? new Date(comparison.timestamp).toLocaleTimeString() : "--"}
            color="#c4b5fd"
          />
          <button
            type="button"
            onClick={exportControllerComparison}
            style={{
              padding: "0.65rem 0.85rem",
              borderRadius: "8px",
              border: "1px solid #38bdf8",
              backgroundColor: "#075985",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
              alignSelf: "stretch"
            }}
          >
            Export CSV
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "0.75rem",
            marginBottom: "0.9rem"
          }}
        >
          {metrics.map((metric) => (
            <ControllerScoreCard
              key={metric.controller}
              metric={metric}
              isBest={metric.controller === bestController}
              maxScore={maxScore}
            />
          ))}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.82rem"
            }}
          >
            <thead>
              <tr>
                <TableHeader label="Controller" />
                {METRIC_KEYS.map((key) => (
                  <TableHeader key={key} label={key.replaceAll("_", " ")} />
                ))}
                <TableHeader label="overall score" />
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.controller}>
                  <TableCell
                    value={metric.controller}
                    color={metric.controller === bestController ? "#22c55e" : "#e2e8f0"}
                    strong
                  />
                  {METRIC_KEYS.map((key) => (
                    <TableCell key={key} value={formatNumber(metric[key])} />
                  ))}
                  <TableCell value={formatNumber(metric.overall_score)} color="#38bdf8" strong />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ControllerScoreCard({ metric, isBest, maxScore }) {
  const score = Number(metric.overall_score) || 0;
  const width = maxScore > 0 ? `${Math.max(6, (score / maxScore) * 100)}%` : "6%";

  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        border: isBest ? "1px solid #22c55e" : "1px solid #334155",
        borderRadius: "8px",
        padding: "0.75rem"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "0.55rem"
        }}
      >
        <strong style={{ color: isBest ? "#22c55e" : "#e2e8f0" }}>
          {metric.controller}
        </strong>
        <span style={{ color: "#38bdf8", fontWeight: "bold" }}>
          {formatNumber(score)}
        </span>
      </div>
      <div
        style={{
          height: "9px",
          backgroundColor: "#1e293b",
          borderRadius: "999px",
          overflow: "hidden",
          marginBottom: "0.6rem"
        }}
      >
        <div
          style={{
            width,
            height: "100%",
            backgroundColor: isBest ? "#22c55e" : "#38bdf8"
          }}
        />
      </div>
      <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
        error {formatNumber(metric.tracking_error)} | effort {formatNumber(metric.control_effort)}
      </div>
    </div>
  );
}

function MetricTile({ label, value, color }) {
  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        padding: "0.7rem",
        borderRadius: "8px",
        border: "1px solid #334155",
        minHeight: "68px"
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{label}</div>
      <div
        style={{
          color,
          fontWeight: "bold",
          marginTop: "0.35rem",
          overflowWrap: "anywhere"
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TableHeader({ label }) {
  return (
    <th
      style={{
        color: "#94a3b8",
        textAlign: "left",
        padding: "0.55rem",
        borderBottom: "1px solid #334155",
        textTransform: "capitalize",
        whiteSpace: "nowrap"
      }}
    >
      {label}
    </th>
  );
}

function TableCell({ value, color = "#e2e8f0", strong = false }) {
  return (
    <td
      style={{
        color,
        padding: "0.55rem",
        borderBottom: "1px solid #1e293b",
        whiteSpace: "nowrap",
        fontWeight: strong ? "bold" : "500"
      }}
    >
      {value}
    </td>
  );
}

export default ControllerComparisonPanel;
