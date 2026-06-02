import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  exportStateEstimationBenchmark,
  getStateEstimationBenchmark
} from "../services/api";

const METRIC_FIELDS = [
  { key: "sample_count", label: "Samples" },
  { key: "avg_position_error", label: "Avg Pos Error" },
  { key: "max_position_error", label: "Max Pos Error" },
  { key: "avg_velocity_error", label: "Avg Vel Error" },
  { key: "max_velocity_error", label: "Max Vel Error" },
  { key: "avg_innovation", label: "Avg Innovation" },
  { key: "avg_covariance_trace", label: "Avg Covariance" },
  { key: "health_score", label: "Health Score" }
];

const CHARTS = [
  { key: "avg_position_error", title: "Position Error", color: "#38bdf8" },
  { key: "avg_velocity_error", title: "Velocity Error", color: "#22c55e" },
  { key: "avg_innovation", title: "Innovation", color: "#f59e0b" },
  { key: "health_score", title: "Health Score", color: "#a78bfa" }
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

function BenchmarkChart({ title, color, data }) {
  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        padding: "0.8rem",
        borderRadius: "8px",
        border: "1px solid #334155"
      }}
    >
      <strong>{title}</strong>

      <div style={{ width: "100%", height: 220, marginTop: "0.7rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis
              dataKey="estimator"
              stroke="#94a3b8"
              tick={{ fill: "#cbd5e1", fontSize: 11 }}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => formatValue(value)}
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#e2e8f0"
              }}
              cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
            />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StateEstimationBenchmarkPanel() {
  const [benchmark, setBenchmark] = useState({});
  const [bestEstimator, setBestEstimator] = useState(null);
  const [placeholders, setPlaceholders] = useState({});
  const [message, setMessage] = useState("Loading estimator benchmark...");

  const fetchBenchmark = async () => {
    try {
      const r = await getStateEstimationBenchmark();

      setBenchmark(r.data.benchmark || {});
      setBestEstimator(r.data.best_estimator || null);
      setPlaceholders(r.data.research_placeholders || {});
      setMessage(r.data.message || "Benchmark updated");
    } catch {
      setBenchmark({});
      setBestEstimator(null);
      setPlaceholders({});
      setMessage("Estimator benchmark unavailable");
    }
  };

  useEffect(() => {
    fetchBenchmark();
    const interval = setInterval(fetchBenchmark, 5000);
    return () => clearInterval(interval);
  }, []);

  const rows = Object.entries(benchmark).map(([estimator, metrics]) => ({
    estimator,
    ...metrics
  }));

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Estimator Benchmark</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "1rem"
          }}
        >
          <p style={{ color: "#94a3b8", margin: 0 }}>{message}</p>

          <button
            onClick={exportStateEstimationBenchmark}
            style={{
              padding: "0.65rem 0.95rem",
              borderRadius: "8px",
              border: "1px solid #334155",
              backgroundColor: "#164e63",
              color: "#e2e8f0",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Export Benchmark CSV
          </button>
        </div>

        <div
          style={{
            padding: "0.8rem",
            backgroundColor: "#0f172a",
            borderRadius: "8px",
            border: "1px solid #334155",
            color: "#e2e8f0",
            marginBottom: "1rem"
          }}
        >
          <strong>Best Estimator: </strong>
          <span style={{ color: bestEstimator ? "#22c55e" : "#94a3b8" }}>
            {bestEstimator || "--"}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "0.8rem",
            marginBottom: "1rem"
          }}
        >
          {CHARTS.map((chart) => (
            <BenchmarkChart
              key={chart.key}
              title={chart.title}
              color={chart.color}
              data={rows.map((row) => ({
                estimator: row.estimator,
                value: row[chart.key]
              }))}
            />
          ))}
        </div>

        <div
          style={{
            overflowX: "auto",
            backgroundColor: "#0f172a",
            borderRadius: "8px",
            border: "1px solid #334155"
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "820px"
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.7rem" }}>Estimator</th>
                {METRIC_FIELDS.map((field) => (
                  <th key={field.key} style={{ textAlign: "right", padding: "0.7rem" }}>
                    {field.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.estimator}
                  style={{
                    backgroundColor:
                      row.estimator === bestEstimator
                        ? "rgba(34,197,94,0.12)"
                        : "transparent"
                  }}
                >
                  <td style={{ padding: "0.7rem", color: "#e2e8f0" }}>
                    {row.estimator}
                  </td>
                  {METRIC_FIELDS.map((field) => (
                    <td
                      key={field.key}
                      style={{
                        padding: "0.7rem",
                        textAlign: "right",
                        color: "#cbd5e1"
                      }}
                    >
                      {formatValue(row[field.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "0.8rem",
            marginTop: "1rem"
          }}
        >
          {Object.entries(placeholders).map(([key, value]) => (
            <div
              key={key}
              style={{
                backgroundColor: "#0f172a",
                padding: "0.8rem",
                borderRadius: "8px",
                border: "1px solid #334155"
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                {key.replaceAll("_", " ")}
              </div>
              <div style={{ color: "#cbd5e1", marginTop: "0.45rem" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StateEstimationBenchmarkPanel;
