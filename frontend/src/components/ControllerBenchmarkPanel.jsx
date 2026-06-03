import { useEffect, useMemo, useState } from "react";

import {
  exportControllerBenchmark,
  getControllerBenchmark
} from "../services/api";

const SCORE_KEYS = [
  "tracking_error_score",
  "control_effort_score",
  "robustness_score",
  "response_quality_score",
  "computation_score",
  "disturbance_rejection_score"
];

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${value}`;
  }

  return number.toFixed(4);
}

function ControllerBenchmarkPanel() {
  const [benchmark, setBenchmark] = useState(null);

  const fetchBenchmark = async () => {
    try {
      const response = await getControllerBenchmark();
      setBenchmark(response.data || null);
    } catch {
      setBenchmark(null);
    }
  };

  useEffect(() => {
    fetchBenchmark();
    const interval = setInterval(fetchBenchmark, 5000);
    return () => clearInterval(interval);
  }, []);

  const results = benchmark?.results || [];
  const bestController = benchmark?.best_controller || "--";
  const maxScore = useMemo(() => (
    results.reduce((max, row) => Math.max(max, Number(row.overall_score) || 0), 0)
  ), [results]);

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Controller Benchmark</h2>

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
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "0.75rem",
            marginBottom: "0.9rem"
          }}
        >
          <MetricTile label="Best Controller" value={bestController} color="#22c55e" />
          <MetricTile label="Active Controller" value={benchmark?.active_controller || "--"} color="#38bdf8" />
          <MetricTile
            label="Last Run"
            value={benchmark?.timestamp ? new Date(benchmark.timestamp).toLocaleTimeString() : "--"}
            color="#c4b5fd"
          />
          <button
            type="button"
            onClick={exportControllerBenchmark}
            style={{
              padding: "0.65rem 0.85rem",
              borderRadius: "8px",
              border: "1px solid #38bdf8",
              backgroundColor: "#075985",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Export CSV
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            marginBottom: "0.9rem"
          }}
        >
          {results.map((row) => (
            <ScoreCard
              key={row.controller}
              row={row}
              isBest={row.controller === bestController}
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
                <TableHeader label="Samples" />
                {SCORE_KEYS.map((key) => (
                  <TableHeader key={key} label={key.replaceAll("_", " ")} />
                ))}
                <TableHeader label="Overall" />
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.controller}>
                  <TableCell
                    value={row.controller}
                    color={row.controller === bestController ? "#22c55e" : "#e2e8f0"}
                    strong
                  />
                  <TableCell value={row.samples} />
                  {SCORE_KEYS.map((key) => (
                    <TableCell key={key} value={formatNumber(row[key])} />
                  ))}
                  <TableCell value={formatNumber(row.overall_score)} color="#38bdf8" strong />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ row, isBest, maxScore }) {
  const score = Number(row.overall_score) || 0;
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
          {row.controller}
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
        samples {row.samples} | robustness {formatNumber(row.robustness_score)}
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

export default ControllerBenchmarkPanel;
